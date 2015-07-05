'use strict';

var _ = require('underscore');

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
 * Simple Validator. For internal usage,
 *
 * Most of validators allow you use function or function name in string.
 * Allowed function names passed as api in constructor. Unknown fun name is reason
 * for throwing error.
 *
 * @example
 * let v2 = new Validator(api),
 *     boolean = v2.boolean.bind(v2);
 * boolean('propname', true); // ok
 * boolean('propname', "<% someApiCall %>"); // ok
 * boolean('propname', () => true ); // ok
 * boolean('propname', "XYZ<% someApiCall %>"); // fail because fun str may be "<% .. %>"
 *
 * @param {object} api - hash of known methods that may be used by "<% XYZ %>"
 */
function Validator(api={}) {
  this.setApi(api);
}

Validator.prototype = {
  setApi(api) {
    this.api = api;
  },

  getApi() {
    return this.api;
  },

  isFunction(value) {
    if (_.isFunction(value)) {
      return true;
    } else if (_.isString(value)) {
      let found = value.match(/^<%\s*(\w+)\s*%>$/);
      if (! found)
        return false;
      let function_name = found[1];
      if ( function_name &&
           _.has(this.api, function_name)) {
        return true;
      } else {
        throw Error (`Function "${function_name}" that used in "<% %>" is undefined`);
      }
    }
    return false;
  },

  fun(key_name, value) {
    if (! this.isFunction(value))
      throw Error(`"${key_name}" must be function or string api call "<% fooBar %>"`);
  },

  boolean(key_name, value) {
    if (! _.isBoolean(value) &&
        ! this.isFunction(value))
      throw Error(`"${key_name}" must be boolean or function`);
  },

  number(key_name, value) {
    if ( ! _.isNumber(value) &&
         ! this.isFunction(value))
      throw Error(`"${key_name}" must be number or function`);
  },

  string(key_name, value) {
    if (_.isFunction(value))
      return true;

    if (! _.isString(value))
      throw Error(`"${key_name}" must be string or function`);

    let re = /<%\s*(\w+)\s*%>/g,
        match;

    while ((match = re.exec(value))) {
      let function_name = match[1];
      if (! _.has(this.api, function_name))
        throw Error (`Function "${function_name}" that used in "<% %>" is undefined`);
    }
    return true;
  },

  oneOf(validators, key_name, value) {
    if (! validators || ! _.isArray(validators)) {
      throw Error(`[oneOf] validators must be not empty array`);
    }

    let valid = false,
        errors = [];
    _.each(validators, (validator) => {
      try {
        validator(key_name, value);
        valid = true;
      } catch (err) {
        errors.push(err);
      }
    });
    if (! valid) {
      let error_msg = errors.join('\n  ');
      throw Error(`None of validators returned success for property ${key_name}:\n  ${error_msg}`);
    }

  },

  array(arrayOf, key_name, value) {
    if (! arrayOf || ! _.isArray(arrayOf)) {
      throw Error(`[array] arrayOf must be not empty array`);
    }

    if (! _.isArray(value) &&
        ! this.isFunction(value))
      throw Error(`"${key_name}" must be array or function that return array`);

    if (_.isArray(value)) {
      _.each(value, (item, index) => {
        let key_name_indexed = `${key_name}[${index}]`;
        this.oneOf(arrayOf, key_name_indexed, item);
      });
    }
  },

  object(schema, required_keys, key_name, value) {
    if (_.isFunction(schema)) {
      schema = schema();
    }

    if (! _.isObject(schema) || _.isArray(schema)) {
      throw Error(`schema is empty for "${key_name}"`);
    }

    if (! _.isObject(value) || _.isArray(value)) {
      throw Error(`"${key_name}" must be hash object`);
    }

    _.each(required_keys, (key) => {
      if (! _.has(value, key)) {
        throw Error(`"${key_name}" expect to have key "${key}"`);
        }
    });

    //now validate all properties of schema
    _.each(schema, function(sub_validator, schema_key_name) {
      // check only properties if they exists, we heck  required before
      if (_.has(value, schema_key_name)) {
        let new_key_name = key_name + '.' + schema_key_name;
        sub_validator(new_key_name, value[schema_key_name]);
      }
    });

    // throw if here is unknown keys in "value" object
    let schema_keys  = Object.keys(schema),
        value_keys   = Object.keys(value),
        unknown_keys = _.difference(value_keys, schema_keys);

    if(! _.isEmpty(unknown_keys)) {
      let list_of_kes = unknown_keys.join('", "');
      throw Error(`"${key_name}" object use unknown keys: ["${list_of_kes}"]. Maybe you mistype?`);
    }
  },

};

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
      one_of_str_or_array = oneof.bind(v,[string, array_of_str]),
      scenario_validator  = object.bind(v,
                                        () => scenario_schema, // schema
                                        [] //required
                                       );

  scenario_schema = {
    typing             : boolean,
    uploading_photo    : boolean,
    recording_video    : boolean,
    uploading_video    : boolean,
    recording_audio    : boolean,
    uploading_audio    : boolean,
    uploading_document : boolean,
    finding_location   : boolean,

    text               : string,

    menu               : one_of_str_or_array,

    before             : fun,
    action             : fun,
    after              : fun,

    commands: function(key_name, value) {
      for(let command_name in value) {
        let sub_scenario = value[command_name];

        // nesting
        scenario_validator(`${key_name}."${command_name}"`, sub_scenario);
      }
    }
  };

  this._validator = v;
  this.api(api);
  this._scenario_validator = scenario_validator;

  if (scenario) {
    this.scenario(scenario);
  }
}

Scenario.prototype = {
  api(new_api) {
    let validator = this._validator;
    if (_.isUndefined(new_api)) {
      return validator.getApi();
    } else {
      validator.setApi(new_api);
      return this;
    }
  },

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
  }
};

export {Scenario, Validator};

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
