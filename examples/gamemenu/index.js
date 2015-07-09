'use strict';

import {Bot, Scenario} from '../../src/index.js';

import _ from 'underscore';

var yaml = require('js-yaml');
var fs = require('fs');

const loaded_yaml = yaml.safeLoad(fs.readFileSync(__dirname + '/scenario.yaml', 'utf8')),
      script = loaded_yaml.scenario;

function sleep(millisec) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve();
    }, millisec);
  });
}

var db = {};                    // emulate persistance

const scenarioApi = {
  setupStash() {
    var user_id = this.from.id,
        data = db[user_id] || {
          music: 100,
          ambient: 100,
          resolution: '1600x900'
        };

    db[user_id] = this.stash.data = data;
  },

  currentMusicLvl() {
    var data = this.stash.data;
    return '' + data.music;     // need stringify
  },

  setMusicLvl() {
    var user_id = this.from.id,
        user_input = Number(this.text);

    if (_.isNaN(user_input)) {
      return 'Please, type number only';
    } else if (user_input > 100 || user_input < 0) {
      return 'Only numbers 0..100 are acceptable';
    } else {
      // save
      db[user_id].music = user_input;
    }
    return null;
  },

  currentAmbientLvl() {
    var data = this.stash.data;
    return '' + data.ambient;     // need stringify
  },

  setAmbientLvl() {
    var user_id = this.from.id,
        user_input = Number(this.text);

    if (_.isNaN(user_input)) {
      return 'Please, type number only';
    } else if (user_input > 100 || user_input < 0) {
      return 'Only numbers 0..100 are acceptable';
    } else {
      // save
      db[user_id].ambient = user_input;
    }
    return null;
  },

  currentResolution() {
    var data = this.stash.data;
    return '' + data.resolution;
  },

  listKnownResolution() {
    return [
      "800x600 SVGA",
      "1024x600 WSVGA",
      "1024x768 XGA",
      "1152x864 XGA",
      "1280x720 WXGA",
      "1280x768 WXGA",
      "1280x800 WXGA",
      "1280x960 SXGA",
      "1280x1024 SXGA",
      "1360x768 HD",
      "1366x768 HD",
      "1400x1050 SXGA",
      "1440x900 WXGA",
      "1600x900 HD",
      "1600x1200 UXGA",
      "1680x1050 WSXGA",
      "1920x1080 FHD",
      "1920x1200 WUXGA",
      "2048x1152 QWXGA",
      "2560x1440 WQHD",
      ].join('\n');
  },

  setVideoResolution() {
    var user_id = this.from.id,
        user_input = this.text;

    if(_.isString(user_input)) {
      let match_res = user_input.match(/\d+x\d+/);
      if (match_res) {
        db[user_id].resolution = match_res[0];
        return null;
      } else {
        return "You should set resolution in format 9999x9999";
      }
    }
    return null;
  },

  username() {
    var from = this.from,
        user_name = from.first_name || from.username;
    return user_name;
  },
};

try {
  var bot_scenario = new Scenario(scenarioApi, script);
} catch(e) {
  console.error(`!! Fail to create scenario:\n${e}`);
  process.exit(1);
}

var token = process.env.BOT_TOKEN;

if (!token) {
  console.error(`!! You need set env BOT_TOKEN`);
  process.exit(1);
}

var b = new Bot(token);

b.scenario(bot_scenario);
b.start();
