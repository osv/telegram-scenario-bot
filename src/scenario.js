'use strict';

var _ = require('underscore');

/*

/start
 /setup
 .- /audio
 .   /ambition : set ambition audio level
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

function Scenario(scenario) {
  this._scenario = this.validate(scenario);

}

const SCHEMA = {
  text: ["function", "string"],
  typing: ["boolean", "string", "function"],
};

Scenario.prototype = {

  /**
   * Validate telegram menu scenario
   * @param {object} scenario
   * @param {string} [path]
   * @param {object} [SCHEMA]
   * @returns {}
   * @throws {}
   */
  validate(scenario, path='/', schema=SCHEMA) {
    if (! _.isObject(scenario)) {
      throw Error('Scenario must be object');
    }
    let sc = scenario;

    for (let prop in scenario) {
      if (! _.has(schema, prop)) {
        throw Error(`Scenario invalid: Unexpected property "${prop}". Path: ${path}`);
      }

    }

    return sc;
  }
};

export {Scenario};

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
