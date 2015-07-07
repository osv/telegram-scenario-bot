'use strict';
/* ddd */
import JobQueue from './job-queue.js';
import BotApi from './telegram-api-promisified.js';
import StateHolder from './state-holder.js';
import Scenario from './scenario.js';

import _ from 'underscore';
import path from 'path';

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

  this._user_reply_locks = {};  // store user id when worker started
}

Bot.prototype = {
  scenario (new_scenario) {
    if (_.isUndefined(new_scenario)) {
      return this._scenario;
    }
    this._scenario = new_scenario;
    return this;
  },

  stateHolder(new_stateholder) {
    if (_.isUndefined(new_stateholder)) {
      return this._state_holder;
    }
    this._state_holder = new_stateholder;
    return this;
  },

  telegramApi(new_botapi) {
    if (_.isUndefined(new_botapi))
      return this._tel_api;
    this._tel_api = new_botapi;
    return this;
  },

  jobQueue() {
    return this._job_queue;
  },

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
            updates = await this._tel_api.getUpdates(offset, 100, 1800);
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

  _buildContext: function(data) {
    var msg = data.message,
        text = msg.text,
        from = msg.from,
        from_id = from.id,
        chat = msg.chat,
        chat_id = chat.id;
    return {
      text: text,
      from: from,
      chat: chat,
      stash: {},
    };
  },

  _processMessage: async function(data) {
    var msg = data.message,
        text_msg = msg.text,
        from = msg.from,
        from_id = from.id,
        chat = msg.chat,
        chat_id = chat.id,
        state_holder = this.stateHolder(),
        telegram = this.telegramApi(),
        context = this._buildContext(data);

    var state = await state_holder.get(from_id);
    state = state || {};

    if (! state.scenario_path) {
      state.scenario_path = '/';
    }

    // get wrapped scenario object
    let current_scen = this._getScenario(state.scenario_path);

    // match message text, and try find next sub scenario
    let next_scen = current_scen.getNextScenario(text_msg);

    // if not found sub scenario, keep current scenario
    if (next_scen === null) {
      next_scen = current_scen;
    } else {
      state.scenario_path += '/' + next_scen.getName();
    }

    // call 'before' function
    await next_scen.callBeforeFun(context);

    // typing, uploading_foto, etc
    let action = await next_scen.getAction(context);
    if (action) {
      await telegram.sendChatAction(chat_id, action);
    }

    // call 'action' function
    let action_result = await next_scen.callActionFun(context);

    // ttl
    let ttl = await next_scen.getTTL(context);

    if (_.isString(action_result)) {

      state.scenario_path =
        this._getValidPath(path.join(state.scenario_path, '..'));

      // call current scenario.
      await current_scen.callBeforeFun(context);

      //TODO: menu

      // reply
      await telegram.sendMessage(chat_id,
                                 action_result
                                );
    } else {
      let reply_msg = await next_scen.getReply(context);

      if (! _.isEmpty(reply_msg) /*|| menu */) {
        await telegram.sendMessage(chat_id,
                                   reply_msg
                                  );
      }

      // resolve next scenario path, fallback to "/" if not exist path
      let goto = await next_scen.getGoto(context);
      if (goto.charAt(0) === '/') {
        state.scenario_path = goto;
      } else {
        state.scenario_path =
          this._getValidPath(path.join(state.scenario_path, goto));
      }

      // call 'after' function
      await next_scen.callAfterFun(context);
    }

    // save session
    await state_holder.put(from_id, state, ttl || 5 * 60 * 1000);
    console.log('path:',state.scenario_path);
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
