'use strict';

import _ from 'underscore';

import Validator from './scenario-validator.js';
import ScenarioWrapper from './scenario-wrapper.js';

/**
 * Create scenario container.
 * @param {object} [api] - api that may used by scenario using '<% ... %>' notation
 * @param {object} [scenario] - scenario object
 * @throws {Error} if fail to validate scenario
 * @constructor
 */
function Scenario(api, scenario) {
  var v                   = new Validator(api),
      scenario_schema     = {},

      object              = v.object.bind(v),
      fun                 = v.fun.bind(v),
      boolean             = v.boolean.bind(v),
      number              = v.number.bind(v),
      string              = v.string.bind(v),
      oneof               = v.oneOf.bind(v),
      array               = v.array.bind(v),
      array_of_str        = array.bind(v, [string]),
      array_of_array_of_str = array.bind(v, [array_of_str]),
      one_of_str_or_array = oneof.bind(v,[string, array_of_array_of_str]),
      scenario_validator  = object.bind(v,
                                        () => scenario_schema, // schema
                                        ['name'] //required
                                       ),
      // other special validators
      name = function(key_name, value) {
        if (! _.isString(value) ||
            _.isEmpty(value)) {
          throw Error(`"${key_name}" must be a string`);
        }

        if(value.match('[/<>]')) {
          throw Error(`"chars ['/' '<' '>'] not allowed in "${key_name}"`);
        }
      },
      command = function(key_name, value) {
        var seen_names = {};
        for(let command_name in value) {
          let sub_scenario = value[command_name];

          // nesting
          scenario_validator(`${key_name}."${command_name}"`, sub_scenario);

          // check dup names
          var name = sub_scenario.name;
          if (_.has(seen_names, name)) {
            throw Error(`"${key_name}" have scenarios with duplicated names: "${name}"`);
          }
          seen_names[name] = 1;
        }
      };


  scenario_schema = {
    name               : name,    // scenario name, unique
    typing             : boolean, // action, typing
    uploading_photo    : boolean, // action
    recording_video    : boolean, // action
    uploading_video    : boolean, // action
    recording_audio    : boolean, // action
    uploading_audio    : boolean, // action
    uploading_document : boolean, // action
    finding_location   : boolean, // action

    reply              : string, // reply message for this scenario

    menu               : one_of_str_or_array, // custom keyboard markup

    ttl                : number, // time to live of session

    before             : fun,   // called before  all, you may  use it
                                // to   prepare   stash,   to   deduce
                                // database operation

    action             : fun,   // called before reply. Usually setter
    after              : fun,

    goto               : string, // next scenario.

    commands           : command // hash, key - regexp, value - scenario object
  };

  this._validator = v;
  this.api(api);
  this._scenario_validator = scenario_validator;

  if (scenario) {
    this.scenario(scenario);
  }
}

Scenario.prototype = {
  constructor: Scenario,        // re-define the constructor

  /**
   * Set or get api. If set, return this
   * @param {object} [new_api]
   * @return {old_api|this}
   */
  api(new_api) {
    let validator = this._validator;
    if (_.isUndefined(new_api)) {
      return validator.getApi();
    } else {
      validator.setApi(new_api);
      return this;
    }
  },

  /**
   * Set or get scenario. If set, return this.
   * You must set before, otherwise validation will fail if used unknown api in <% %>
   * @param {object} [new_scenario]
   * @return {old_api|this}
   */
  scenario(new_scenario) {
    if (_.isUndefined(new_scenario)) {
      return this._scenario;
    } else {
      this.validate(new_scenario);
      this._scenario = new_scenario;
      return this;
    }
  },

  validate(scenario) {
    this._scenario_validator('[[root]]', scenario);
  },

  /**
   * Get scenario by path
   * @param {string} path
   * @throws {Error} if not found scenario
   * @return {ScenarioWrapper}
   * @example
   * var s = new Scenario({}, {
   *   name: 'myscen',
   *   commands: {
   *     '/start': {
   *     name: 'start-command'
   *     }
   *   }
   * })
   *
   * s.getScenario(); // myscen
   * s.getScenario('/'); // myscen
   * s.getScenario('/myscen'); // myscen
   * s.getScenario('/myscen/'); // myscen
   * s.getScenario('/myscen/start-command');
   * // start-command
   * //  {
   * //    '/start': {
   * //       name: 'start-command'
   * //  }
   *
   * s.getScenario('/myscen/fail-command'); // throw

   */
  getScenario(path) {
    let api = this.api(),
        scenario = this._getScenario(path)
    return new ScenarioWrapper(api, scenario);
  },

  _getScenario(path) {
    if (_.isUndefined(path)) {
      return this._scenario;
    }

    let root_name = this._scenario.name,
        root_re = new RegExp(`^/${root_name}`);

    // remove root from path
    path = path.replace(root_re, '');

    let frags = path.split('/'),
        cur_path = '/' + root_name,
        scenario = this._scenario;

    for(let next_name of frags) {
      if(_.isEmpty(next_name)) {
        continue;
      }

      let found = false;
      if (_.has(scenario, 'commands')) {
        for (let command_name in scenario.commands) {
          let command = scenario.commands[command_name],
              cmd_name = command.name;
          if (cmd_name === next_name) {

            // ok, found, continue for next scen name
            cur_path += '/' + cmd_name;
            scenario = command;
            found = true;
            break;
          }
        }
      }

      if (! found) {
        throw Error(`Cannot find scenario: "${next_name}" in "${cur_path}"`);
      }
    }

    return scenario;
  }
};

export default Scenario;
