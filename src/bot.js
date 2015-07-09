'use strict';
/* ddd */
import JobQueue from './job-queue.js';
import BotApi from './telegram-api-promisified.js';
import StateHolder from './state-holder.js';
import Scenario from './scenario.js';

import _ from 'underscore';
import path from 'path';

const DEFAULT_SESSION_TTL = 30 * 60 * 1000;

/**
 * Create Telegram bot.

 * @param {string} token Telegram bot api token, see https://core.telegram.org/bots
 * @example
 * var search = async function() {
 *   var user_text = this.text,
 *       stash = this.stash;
 *
 *   // do search here...
 *
 *   stash.result = search_result;
 * };
 *
 * var script = {
 *   name: 'root',
 *   reply: 'Usage:\n'+
 *     '/google - search in google\n'+
 *     '/about - about bot',
 *   menu: [
 *     ['/google'],
 *     ['/about'],
 *   ],
 *   commands: {
 *     "/about": {
 *       name: 'about',
 *       reply: 'This is telegram bot demo.\n'
 *     },
 *     "/google|google": {
 *       name: 'google',
 *       reply: "Enter search query?",
 *       commands: {
 *         ".": {
 *           name: "searchResult",
 *           action: search,       // you may use function
 *           reply: "Result of search\n<% searchResult %>" // or interpolate in <% %>
 *         }
 *       }
 *     }
 *   }
 * };
 *
 * var botApi = {
 *   searchResult: function() { return this.stash.result; }
 * };
 *
 * var scenario = new Scenario(botApi, script);
 *
 * var token = process.env.BOT_TOKEN;
 *
 * if (!token) {
 *   console.error(`!! You need set env BOT_TOKEN`);
 *   process.exit(1);
 * }
 *
 * var b = new Bot(token);
 *
 * b.scenario(scenario);
 * b.start();
 *
 * @constructor
 */
function Bot(token) {
  // composite
  this._tel_api = new BotApi(token);
  this._state_holder = new StateHolder();
  let queue = this._job_queue = new JobQueue();

  this._scenario = null;

  queue.setJobPoller(this._poller.bind(this));
  queue.setWorker(this._worker.bind(this));

  this._messages = [];
  this._offset = 0;
  this._ttl = DEFAULT_SESSION_TTL;

  this._user_reply_locks = {};  // store user id when worker started
}

Bot.prototype = {
  /**
   * Setter/getter for scenario
   * @param {Scenario} new_scenario
   * @returns {this|Scenario}
   */
  scenario (new_scenario) {
    if (_.isUndefined(new_scenario)) {
      return this._scenario;
    }
    this._scenario = new_scenario;
    return this;
  },

  /**
   * Setter/getter time to live session. Default 30min.
   * @param {Scenario} new_ttl
   * @returns {this|Scenario}
   */
  sessionTTL(new_ttl) {
    if (_.isUndefined(new_ttl)) {
      return this._ttl;
    }
    this._ttl = new_ttl;
    return this;
  },

  /**
   * Setter/getter Session holder
   * @param {object} new_stateholder
   * @returns {this|object}
   */
  stateHolder(new_stateholder) {
    if (_.isUndefined(new_stateholder)) {
      return this._state_holder;
    }
    this._state_holder = new_stateholder;
    return this;
  },

  /**
   * Telegram api setter/getter
   * @param {BotApi} new_botapi
   * @returns {this|BotApi}
   */
  telegramApi(new_botapi) {
    if (_.isUndefined(new_botapi))
      return this._tel_api;
    this._tel_api = new_botapi;
    return this;
  },

  /**
   * return JobQueue
   */
  jobQueue() {
    return this._job_queue;
  },

  /**
   * Start polling for telegram message.
   * @throws {Error} if scenario not set before.
   */
  start() {
    let scenario = this.scenario();
    if (_.isNull(scenario) ||
        ! scenario instanceof Scenario) {
      throw Error('You must set scenario before start()');
    }
    this.jobQueue().start();
  },

  /**
   * Message poller for Jobqueue. Use long-polling getUpdate api of Telegram.
   */
  _poller: async function() {
    while (1) {
      while (! this._messages.length) {
        console.log('getUpdates..');
        let offset = this.offset +1,
            updates = await this._tel_api.getUpdates(offset, 100, 60);
        this._messages = updates.result;
      }

      let msg = this._messages.shift(),
          update_id = msg.update_id,
          message = msg.message,
          from_id = message.from.id;

      this.offset = update_id;

      if (this._is_locked_user(from_id)) {
        console.log(`user is still locked, skip this message ${from_id}`, this._user_reply_locks);
        continue;
      }

      return msg;
    }
  },

  _worker: async function(data) {
    let msg = data.message,
        from = msg.from,
        from_id = from.id,
        chat = msg.chat,
        chat_id = chat.id,
        api = this.telegramApi();

    this._lock_user(from_id);
    try {

      await this._processMessage(data);

    } catch (err) {
      let state_holder = this.stateHolder(),
          user_state = await state_holder.get(from_id);
      console.log(`Error while processing message.\n`,
                  'Message:',  msg, '\n',
                  'User state:', user_state, '\n',
                  `\nTrace: ${err.stack}`);
    }
    this._unlock_user(from_id);
  },

  _buildUserContext: function(data, session) {
    var msg = data.message,
        text = msg.text,
        from = msg.from,
        chat = msg.chat,
        telegram = this.telegramApi();
    return {
      // fast accesors to message field
      text: text,
      from: from,
      chat: chat,

      // message
      message: data,

      stash: {},
      session: session || {},
      telegramApi: telegram,
    };
  },

  /**
   * Get session for user.
   * If not exist, create default with scenario path "/"
   * If user in root scenario, reset session.
   * @param {string} user_id
   * @returns {object}
   */
  _getUserSession: async function(user_id) {
    var state_holder = this.stateHolder();
    var state = await state_holder.get(user_id);

    state = state || {};

    if (! state.scenario_path) {
      state.scenario_path = '/';
    } else {
      var root_scenario = this._getScenario('/'),
          that_scenario = this._getScenario(state.scenario_path);
      if (root_scenario === that_scenario) {
        state.session = {};
      }

    }

    if (! state.state) {
      state.state = {};
    }
    return state;
  },

  /**
   * Save user session and scenario path
   * @param {string} user_id
   * @param {object} context
   */
  _saveUserSession: async function(user_id, context) {
    // save state
    var user_context = context.user_context,
        state = {
          scenario_path: context.path,
          session: user_context.session
        },
        state_holder = this.stateHolder(),
        default_ttl = this.sessionTTL();

    var scen_state_ttl = await this._getScenario(context.path).getTTL(user_context);

    await state_holder.put(user_id, state, scen_state_ttl || default_ttl);
  },

  /**
   * Select next scenario based on text.
   *
   * Modify context.path or leave as is if this scenario not match any item in "commands"
   * @param {object} context
   * @param {string} text user message text
   */
  _resolveScenario: function(context, text) {
    var scen_path = context.path,
        current_scen = this._getScenario(scen_path),

        // match message text, and try find next sub scenario
        next_scen = current_scen.getNextScenario(text);

    // if not found sub scenario, keep current scenario
    if (next_scen !== null) {
      context.path  += '/' + next_scen.getName();
    }
  },

  /**
   * Send to user activity type (typing, etc) if specified in scenario.
   * @param {object} context
   */
  _sendActionMaybe: async function(context) {
    var telegram = this.telegramApi(),
        user_context = context.user_context,
        chat_id = user_context.from.id,
        scenario = this._getScenario(context.path);

    var action = await scenario.getAction(user_context);
    if (action) {
      await telegram.sendChatAction(chat_id, action);
    }
  },

  /**
   * Send to user activity type (typing, etc, if need)
   * and call "action" function of scenario
   * @param {object} context
   * @returns {string|undefined} Result of "action" function.
   * Returned string indicate that "action" function was failed.
   */
  _callActionFun: async function(context) {
    var user_context = context.user_context,
        scenario = this._getScenario(context.path);

    // call 'action' function
    var action_error_message = await scenario.callActionFun(user_context);
    return action_error_message;
  },

  /**
   * Return scenario menu.
   * @param {object} context
   * @returns {object|null} Telegram custom keyboard object if scenario "menu" not defined
   */
  _getMenuFromPath: async function (context) {
    var scen_path = context.path,
        scenario = this._getScenario(scen_path),
        user_context = context.user_context;

    var scen_menu = await scenario.getMenu(user_context);

    if (_.isUndefined(scen_menu)) {
      return null;
    }

    var menu = {
          keyboard: scen_menu,
          one_time_keyboard: true,
          resize_keyboard: true
        };

    return menu;
  },

  /**
   * Check "goto" property of scenario and change context.path.
   * If scenario is invalid set "/"
   * @param {object} context
   */
  _resolvePath: async function(context) {
    var scen_path = context.path,
        scenario = this._getScenario(context.path),
        user_context = context.user_context;

    // scenario.getGoto() return "/" or value of "goto" field of scenario
    let new_path = await scenario.getGoto(user_context);

    // concat if not absolute path
    if (new_path.charAt(0) !== '/') {
      new_path = path.join(scen_path, new_path);
    }

    // change context path
    context.path = this._getValidPath(new_path);
  },

  /**
   * Message processor, main logic here.
   * @param {object} data
   */
  _processMessage: async function(data) {
    var msg = data.message,
        text_msg = msg.text,
        from = msg.from,
        from_id = from.id,
        chat = msg.chat,
        chat_id = chat.id,
        telegram = this.telegramApi();
    console.log(data);

    //TODO: there may be other types of message, maybe need ignore non text message by default

    var state = await this._getUserSession(from_id);
    var user_context = this._buildUserContext(data, state.session);

    // this context object used by other functions and some part of this may be modified, like "path"
    var context = {
      user_context: user_context, // this user_context for Scenario Wrapper methods
      path: state.scenario_path,  // scenario path
    };

    // check "commands" prop of scenario
    this._resolveScenario(context, text_msg);

    // "before" property
    await this._getScenario(context.path).callBeforeFun(user_context);

    // send bot action: typing, upload_photo, etc
    await this._sendActionMaybe(context);

    // "action" property
    var action_error_message = await this._callActionFun(context);

    var reply_msg,
        current_path = context.path; // we save path, need track changing later

    // looks next scenario fail to process, fallback to current
    if (_.isString(action_error_message)) {
      // reply will be next scenario's action function result
      reply_msg = action_error_message;

      // go up
      context.path = this._getValidPath(path.join(current_path, '..'));
    } else {
      // get reply message of new scenario, only get text message
      if (! _.isUndefined(text_msg)) {
        reply_msg = await this._getScenario(context.path).getReply(user_context);
      }

      // resolve next scenario path, fallback to "/" if not exist path
      await this._resolvePath(context);
    }

    // if we changed scenario, call "before" function for new scenario for this one
    // and maybe get reply
    if (current_path !== context.path) {
      await this._getScenario(context.path).callBeforeFun(user_context);

      // if we change scenario, we may try again get reply message
      if (! _.isString(reply_msg) && ! _.isUndefined(text_msg)) {
        reply_msg = await this._getScenario(context.path).getReply(user_context);
      }
    }

    let menu = await this._getMenuFromPath(context);

    if (! _.isEmpty(reply_msg)) {
      let args = [chat_id, reply_msg, true, 0];

      if (_.isEmpty(menu)) {
        args.push({hide_keyboard: true}); // hide last menu
      } else {
        args.push(menu);
      }

      await telegram.sendMessage.apply(telegram, args);
    }

    await this._saveUserSession(from_id, context);
  },

  _getScenario: function(path) {
    var s = this.scenario();
    return s.getScenario(path);
  },

  // check if exist path, if no, return '/' otherwise return path
  _getValidPath: function(path) {
    var s = this.scenario(),
        res;
    try {
      s.getScenario(path);      // may throw here
      res = path;
    } catch(e) {
      res = '/';
      console.trace(`!! Scenario use invalid path: "${path}". Fallback to "/"\n`);
    }
    return res;
  },

  _lock_user: function(user_id) {
    this._user_reply_locks[user_id] = 1;
    return this;
  },

  _unlock_user: function(user_id) {
    delete this._user_reply_locks[user_id];
    return this;
  },

  _is_locked_user: function(user_id) {
    return _.has(this._user_reply_locks, user_id);
  }
};

export default Bot;
