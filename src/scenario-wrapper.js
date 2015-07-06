'use strict';

import _ from 'underscore';

/**
 * Wrapper for coercing scenario data.
 * Each function allow to pass context and arguments that will be applied
 * to api callback. Api callback called if scenario's field have function value or
 * string like "<% abc %>" (Here abc.apply(context, arguments) will be called).
 * @param {object} api object that hold all known api for using in <% %>
 * @param {object} scenario - scenario node.
 */
function ScenarioWrapper(api, scenario) {
  this._api = api;
  this._scenario = scenario;
}

ScenarioWrapper.prototype = {
  getScenario() {
    return this._scenario;
  },

  _callFunction: async function(value, context, args) {
    if (_.isFunction(value))
      return await value();

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

  // if value is string, replace <% %> with callback result
  _asString: async function(value, context, args) {
    if (_.isFunction(value))
      return '' + await value();

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
        let res = await f.apply(context, args);
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
   * @param {object} context - this for callbacks
   * @param {array} args - arguments for callbacks
   * @returns {string} Reply text. "reply" field of scenario.
   */
  getReply: async function(context, args) {
    let scenario = this.getScenario(),
        reply_value = scenario.reply;
    return await this._asString(reply_value, context, args);
  },

  /**
   * Get scenario name
   * @returns {string}
   */
  getName: function() {
    let scenario = this.getScenario();
    return scenario.name;
  }
};

export default ScenarioWrapper;
