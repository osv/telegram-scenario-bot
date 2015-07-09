# Telegram-bot

Stateful, scenario based telegram bot.

## SYNOPSIS

```yaml
scenario:                       # We load our yaml from this node "scenario"
  name: root                    # Each node must have name, it may be used for navigarion
  reply: |
    Hello <% username %>,
    This is calculator menu demo
    type /start to start
  menu: '/start'                # Menu is telegram virtual keyboard
  commands:                     # Each user typed text will match with current scenario commands
    /start|begin|начать:        # Regexp for command match
      name: calculator
      reply: "Enter"
      menu: |
        7 || 8 || 9 || *
        4 || 5 || 6 || /
        1 || 2 || 3 || -
        0 || . || = || +
        /cancel
      commands:
        /cancel:
          name: cancel          # if leaf and no "goto", than go to root "/"
        .:                      # "." is special - ensure that this command match last
          name: calculate
          action: <% doCalculate %>
          reply: <% getCalcResult %>
          # goto may be absolute path or relative
          goto: ../             # repeat calculator
```

```js
import {Bot, Scenario} from 'telegram-scenario-bot';

const scenarioApi = {
  username() {
    var from = this.from,
        user_name = from.first_name || from.username;
    return user_name;
  },

  doCalculate() {
    var text = this.text,
        session = this.session;

    // we may store to session. Session clear when enter to root scenario
    session.acc = (session.acc || '') + text;
  },

  getCalcResult() {
    return this.session.acc;
  }
};

var bot_scenario = new Scenario(scenarioApi, script),
    b = new Bot('123456788:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');

b.scenario(bot_scenario);
b.start();
```


![running bot screenshot](https://github.com/osv/telegram-scenario-bot/raw/master/image/screenshot.jpg)

## DESCRIPTION

[![Build Status][travis-image]][travis-url]
[![Coveralls Status][coveralls-image]][coveralls-url]

This module provides simplified interface to Telegram bot api.
Telegram bot api have unique feature - custom keyboards, good way to create scenarios.

Old way of bot creating may be not so comfortable if you want use multilevel custom keyboards.


[travis-url]: https://travis-ci.org/osv/telegram-scenario-bot
[travis-image]: http://img.shields.io/travis/osv/telegram-scenario-bot.svg

[coveralls-url]: https://coveralls.io/r/osv/telegram-scenario-bot
[coveralls-image]: http://img.shields.io/coveralls/osv/telegram-scenario-bot/master.svg
