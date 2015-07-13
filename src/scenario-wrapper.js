'use strict';

import _ from 'underscore';

/**
 * Wrapper for coercing scenario data.
 * Each function allow to pass context and arguments that will be applied
 * to api callback. Api callback called if scenario's field have function value or
 * string like "<% abc %>" (Here abc.apply(context, arguments) will be called).
 * @param {object} api object that hold all known api for using in <% %>
 * @param {object} scenario - scenario node.
 * @constructor
 */
function ScenarioWrapper(api, scenario) {
  this._api = api;
  this._scenario = scenario;
}

ScenarioWrapper.prototype = {
  constructor: ScenarioWrapper,

  getScenario() {
    return this._scenario;
  },

  _callFunction: async function(value, context, args) {
    if (_.isFunction(value))
      return await value.apply(context, args);

    if (_.isString(value)) {
      let found = value.match(/^<%\s*(\w+)\s*%>$/);

      if (! found)
        return false;

      let function_name = found[1],
          api = this._api;

      if (function_name &&
          _.has(this._api, function_name)) {
        let f = api[function_name];
        return await f.apply(context, args);
      }
    }
    return null;
  },

  _asBoolean: async function (value, context, args) {
    if (_.isBoolean(value))
      return value;
    return await this._callFunction(value, context, args);
  },

  _asNumber: async function (value, context, args) {
    if (_.isNumber(value))
      return value;
    return +await this._callFunction(value, context, args);
  },

  // if value is string, replace <% %> with callback result
  _asString: async function(value, context, args) {
    if (_.isFunction(value))
      return await value.apply(context, args) || '';

    if (_.isString(value)) {
      // Need to say, I dont know how to use async function
      // in callback of String.prototype.replace.
      // So, first find functions, await them, and then do replace

      let api = this._api,
          fun_to_call = [],     // function that need to call
          fun_call_results = [];

      let regexp = /<%\s*(\w+)\s*%>/g,
          match;

      // first find functions
      while ((match = regexp.exec(value))) {
        let function_name = match[1],
            f = api[function_name];
        if (f) {
          fun_to_call.push(f);
        } else {
          throw Error(`Unknown api function "${function_name}"`);
        }
      }

      // call founded functions
      for(let f of fun_to_call) {
        let res = await f.apply(context, args) || '';
        fun_call_results.push(res);
      }

      value = value.replace(regexp, function() {
        return fun_call_results.shift();
      });
    }
    return value;
  },

  /**
   * Telegram action for sendChatAction() from scene object
   * @param {object} context - this for callbacks
   * @param {array} args - arguments for callbacks
   * @returns {string} Telegram action
   */
  getAction: async function(context, args) {
    let scenario = this.getScenario(),
        actions = {
          'typing'             : 'typing',
          'uploading_photo'    : 'upload_photo',
          'recording_video'    : 'record_video',
          'uploading_video'    : 'upload_video',
          'recording_audio'    : 'record_audio',
          'uploading_audio'    : 'upload_audio',
          'uploading_document' : 'upload_document',
          'finding_location'   : 'find_location',
        };

    for(let act_test in actions) {
      if (_.has(scenario, act_test)) {
        let res = await this._asBoolean( scenario[act_test], context, args );
        if (res)
          return actions[act_test];
      }
    }

    return '';
  },

  /**
   * Get msg for reply from scenario. Call callback if need,
   * interpolate result api like "<% foo %>".
   *
   * Delimiter  \n={2,}\n used to random select one of item.
   * Interpolation will be done AFTER selecting,
   * instead of getMenu(), where first - interpolated, then split by "\n" and "||"
   * @example
   * await new ScenarioWrapper({}, {
   *   reply: `item1
   * ==
   * item2
   * ==
   * item3` })
   *   .getReply(); // return "item1", or "item2" or "item3"
   *
   * @param {object} context - this for callbacks
   * @param {array} args - arguments for callbacks
   * @returns {string} Reply text. "reply" field of scenario.
   */
  getReply: async function(context, args) {
    let scenario = this.getScenario(),
        reply_value = scenario.reply;

    if (_.isString(reply_value)) {
      let replies = reply_value.split(/(?:\n={2,}\n)+/),
          replies_size = replies.length,
          selected = Math.floor(replies_size * Math.random());
      reply_value = replies[selected];
    }
    return await this._asString(reply_value, context, args);
  },

  /**
   * Get scenario name
   * @returns {string}
   */
  getName: function() {
    let scenario = this.getScenario();
    // dont need await, we don't support async function for "name" property of scenario
    return scenario.name;
  },

  /**
   * Get scenario time to live, if expire ttl, than return to root menu
   * @param {object} context - this for callbacks
   * @param {array} args - arguments for callbacks
   * @returns {number}
   */
  getTTL: async function(context, args) {
    let scenario = this.getScenario(),
        ttl_value = scenario.ttl,
        result = await this._asNumber(ttl_value, context, args);

    return +result;
  },

  /**
   * Call scenario "before" function. It usually called at early stage of processing message
   * @param {object} context - this for callbacks
   * @param {array} args - arguments for callbacks
   */
  callBeforeFun: async function(context, args) {
    let scenario = this.getScenario(),
        fun = scenario.before;
    return await this._callFunction(fun, context, args);
  },

  /**
   * Call scenario "after" function. It usually called at later stage of processing message,
   * after reply message.
   * @param {object} context - this for callbacks
   * @param {array} args - arguments for callbacks
   */
  callAfterFun: async function(context, args) {
    let scenario = this.getScenario(),
        fun = scenario.after;
    return await this._callFunction(fun, context, args);
  },

  /**
   * Call scenario "action" function. It usually called before get reply field.
   * after reply message.
   * @param {object} context - this for callbacks
   * @param {array} args - arguments for callbacks
   */
  callActionFun: async function(context, args) {
    let scenario = this.getScenario(),
        fun = scenario.action;
    return await this._callFunction(fun, context, args);
  },

  /**
   * Get path for next scenario from "goto" property of scenario.
   * If no "goto" and no "commands" property, return root - "/".
   * If no "goto" and exists "commands" property - return './'
   * @param {object} context - this for callbacks
   * @param {array} args - arguments for callbacks
   * @returns {string} path. As "goto" is dynamic param, here no validation done.
   * Validation will be in bot.js
   */
  getGoto: async function(context, args) {
    let scenario = this.getScenario(),
        commands = scenario.commands,
        goto = scenario.goto;

    if (_.isUndefined(goto)) {
      return _.isUndefined(commands) ? '/' : '.';
    } else {
      return await this._asString(goto, context, args);
    }
  },

  /**
   * Get sub-scenario depend on given command text. Commands is regexp patterns for match next scenario.
   * Pattern "." is special case, it will be matched LAST.
   * @param {string} text
   * @return {ScenarioWrapper|null} next scenario
   */
  getNextScenario: function(text) {
    var scenario = this.getScenario(),
        commands = scenario.commands,
        api = this._api,
        default_cmd;

    if (_.isEmpty(commands))
      return null;

    if (_.has(commands, '.'))
      default_cmd = '.';

    for (let cmd in commands) {
      if (cmd === default_cmd)
        continue;

      let regexp = new RegExp(cmd);
      if (regexp.test(text)) {
        return new ScenarioWrapper(api, commands[cmd]);
      }
    }

    if (default_cmd) {
      return new ScenarioWrapper(api, commands[default_cmd]);
    }
    return null;
  },

  /**
   * Get array of array of strings from "menu" property.
   * if "menu" is string, split it to new lines - rows, which will be split by "||" for cols
   * @param {object} context - this for callbacks
   * @param {array} args - arguments for callbacks
   * @returns {arrayOfArray} array of array if "menu" is string, otherwise no checks and passed as is.
   * There no validation, we excpect "menu" is valid and containe (array of array of str) or (string).
   */
  getMenu: async function(context, args) {
    var scenario = this.getScenario(),
        menu = scenario.menu;

    if (_.isString(menu)) {
      let compiled_menu_str = await this._asString(menu, context, args);
      let menu_rows = compiled_menu_str.split(/\n+/);
      menu_rows = _.chain(menu_rows)
        .map(function(row) { return row.split(/\s*\|\|\s*/); })
        .filter(function(row) { return row.length !== 1 || row[0] !== ''; })
        .value();

      menu = menu_rows;
    }
    return menu;
  }
};

export default ScenarioWrapper;
