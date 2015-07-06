'use strict';

import _ from 'underscore';

import Validator from './scenario-validator.js';
import ScenarioWrapper from './scenario-wrapper.js';

/*

/start
 /setup
 .- /audio
 .   /ambient : set ambient audio level
 .   /music : set music level
 .- /video
 .   /resolution : large resolution select, use list:
800x600 SVGA
1024x600 WSVGA
1024x768 XGA
1152x864 XGA
1280x720 WXGA
1280x768 WXGA
1280x800 WXGA
1280x960 SXGA
1280x1024 SXGA
1360x768 HD
1366x768 HD
1400x1050 SXGA
1440x900 WXGA
1600x900 HD
1600x1200 UXGA
1680x1050 WSXGA
1920x1080 FHD
1920x1200 WUXGA
2048x1152 QWXGA
2560x1440 WQHD

 .    /1 item1
 .    /2 item2
 .    /3
 .    /more Show more /cancel
 .   /quality
 .    /1 high
 .    /2 low
 .    /3 medium
 /play
 /back
*/


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
      fun                 = v.object.bind(v),
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
        for(let command_name in value) {
          let sub_scenario = value[command_name];

          // nesting
          scenario_validator(`${key_name}."${command_name}"`, sub_scenario);
        }
      };


  scenario_schema = {
    name               : name,
    typing             : boolean,
    uploading_photo    : boolean,
    recording_video    : boolean,
    uploading_video    : boolean,
    recording_audio    : boolean,
    uploading_audio    : boolean,
    uploading_document : boolean,
    finding_location   : boolean,

    reply              : string,

    menu               : one_of_str_or_array,

    ttl                : number,

    before             : fun,
    action             : fun,
    after              : fun,

    commands           : command
  };

  this._validator = v;
  this.api(api);
  this._scenario_validator = scenario_validator;

  if (scenario) {
    this.scenario(scenario);
  }
}

Scenario.prototype = {
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
    this._scenario_validator('scenario', scenario);
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

// var scenario = {
//   // Type of action to broadcast: Choose one, depending on what the user is about to receive
//   typing: true,
//   // upload_photo: true,
//   // record_video: true,
//   // upload_video: true,
//   // record_audio: true,
//   // upload_audio: true,
//   // upload_document: true,
//   // find_location: true,

//   text: "Please select items:\n" +
//     "/1 Hello worl\n" +
//     "/2 Cancel",

//   // commands
//   answers: {
//     commands: {
//        ""
//     }
//     keyboard: [{
//       "1 -> ^/1|^hell": {
//         goto: "/",
//         fun: async function() {
//           console.log('selected item 1');
//         },
//       },
//       "1 -> ^/2|^c": {
//         goto: "/",
//         fun: async function() {
//           console.log('selected item 1');
//         },

//     }
//     ],

//     // answers format: "routeName -> regexp"
//     },
//     "2. "
//   }

// };

// V = {
//   boolean: function(key, value) {

//   }
// };

// var scenario = {
//   "Typing": true,
//   "Before": "<% beforeRoot %>",
//   "Commands": {
//     "/start": {
//       Scenario: {
//         Commands: {
//           "/audio": {
//             "Text": "Audio settings, use /ambient or /music commands",
//             "Menu": [
//               "Ambient",
//               "Music",
//               ["Back", "Cancel"]
//             ],
//             "Scenario": {
//               Menu: [
//                 "0",
//                 "20",
//                 "50",
//                 "75",
//                 "100",
//                 ["Back", "Cancel"]
//               ],
//               "/ambient | ambient": {
//                 text: "Tell me, ambient level, number 0..100, current level is <% getAmbientLvl %>.",
//                 "Scenario": {
//                   "/back || back": {
//                     "Goto": "<% _back %>"
//                   },
//                   "/cancel || cancel": {
//                     "Goto": "/"
//                   },
//                   "default": {
//                     "Action": "<% setAmbientMaybe %>",
//                     "goto": "<% _back %>"
//                   }
//                 },
//               },
//               "/music || music" : {
//                 Menu: [
//                   "0",
//                   "20",
//                   "50",
//                   "75",
//                   "100",
//                   ["Back", "Cancel"]
//                 ],
//                 text: "Tell me, music level, number 0..100, current level is <% getMusicLvl%>",
//                 Scenario: {
//                   "/back": {
//                     "Goto": "<% _back %>"
//                   },
//                   "/cancel": {
//                     "Goto": "/"
//                   },
//                   "default": {
//                     Action: "<% setMusicMaybe %>",
//                     "goto": "<% _back %>"
//                   }
//                 }
//               }
//             }
//           },
//           "/video": {

//           },
//           "cancel": {
//           }
//         }
//       }
//     },
//     default: "<% defaultRoot %>"
//   }
// }

// var minimal = {
//   typing: V.boolean,
//   upload_photo: V.boolean,
//   record_video: V.boolean,
//   upload_video: true,
//   record_audio: true,
//   upload_audio: true,
//   upload_document: true,
//   find_location: true,

//   Scenario: {
//     Text: "",
//     Menu: [ // array of (string || array of string)

//     ],
//     Before: "<>",                  // run when enter to this scenario
//     Action: "<>",                  //
//     Goto: "/",
//     Commands: {
//       "command name": SCENARIO
//     }
//   }

// },
