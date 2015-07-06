'use strict';

import _ from 'underscore';

function ScenarioWrapper(api, scenario) {
  this._api = api;
  this._scenario = scenario;
}

ScenarioWrapper.prototype = {
  getScenario() {
    return this._scenario;
  },

  _callFunction: async function(value) {
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
        return await f();
      }
    }
    return null;
  },

  _asBoolean: async function (value) {
    if (_.isBoolean(value))
      return value;
    return await this._callFunction(value);
  },

  _asString: async function(value) {
    if (_.isFunction(value))
      return await value();

    if (_.isString(value)) {
      // Need to say, I dont know how to use async function
      // in callback of String.prototype.replace.
      // So, first find functions, wait them, and then replace

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
        let res = await f();
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
   */
  getAction: async function() {
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
        let res = await this._asBoolean( scenario[act_test] );
        if (res)
          return actions[act_test];
      }
    }

    return '';
  },

  /**
   * Get msg for reply from scenario. Call callback if need.
   */
  getReply: async function() {
    let scenario = this.getScenario(),
        reply_value = scenario.reply;
    return await this._asString(reply_value);
  }
};

export {ScenarioWrapper};
