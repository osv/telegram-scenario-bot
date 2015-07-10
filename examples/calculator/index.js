'use strict';

import {Bot, Scenario} from '../../src/index.js';

import _ from 'underscore';

var yaml = require('js-yaml');
var fs = require('fs');

const loaded_yaml = yaml.safeLoad(fs.readFileSync(__dirname + '/scenario.yaml', 'utf8')),
      script = loaded_yaml.scenario;

const scenarioApi = {
  username() {
    var from = this.from,
        user_name = from.first_name || from.username;
    return user_name;
  },

  doCalculate() {
    var text = this.text,
        // we may store to session. Session clear when enter to root scenario
        session = this.session,
        as_number = Number(text);

    if (_.isString(text) && ! text.match(/^[ 0-9.+*/=-]+$/)) {
      return 'Enter numbers, or operation "+-*/="';
    }

    if (! _.isNaN(as_number) || text === '.') {
      session.acc = (session.acc || '') + text;
    } else {
      console.log('space');

      session.acc = (session.acc || '') + ' ' + text + ' ';
    }
  },

  getCalcResult() {
    return this.session.acc;
  }
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
b.telegramPollingTimout(1000);
b.start();
