# Telegram-bot

Stateful, scenario based telegram bot.

## SYNOPSIS

[![Build Status][travis-image]][travis-url]
[![Coveralls Status][coveralls-image]][coveralls-url]

![running bot screenshot](https://github.com/osv/telegram-scenario-bot/raw/master/image/screenshot.png)

script.yaml
```yaml
scenario:                       # We load our yaml from this node "scenario"
  name: root                    # Each node must have name, it may be used for navigarion
  reply: |
    Hello <% username %>,
    This is calculator menu demo
    type /start to start
  menu: '/start'                # Menu is telegram custom keyboard
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

index.js
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

    // ... some logic ...
    
    // We may store to session. Session clear when enter to root scenario
    session.acc = (session.acc || '') + text;
  },

  getCalcResult() {
    return this.session.acc;
  }
};

var script = /*... load yaml*/
var bot_scenario = new Scenario(scenarioApi, script),
    b = new Bot('123456788:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');

b.scenario(bot_scenario);
b.start();
```


## DESCRIPTION

This module provides simplified interface to Telegram bot api.
Telegram bot api have unique feature - custom keyboards, good way to create scenarios.

Old way of bot creating may be not so comfortable if you want use multilevel custom keyboards.

This bot use job queue, messages from user ignored when processing message for this user not done.
Default is 2 concurent jobs.

Callbacks may be thanable i.e. es7 async function or Promise. See "examples/google" for async demo.

Group chat, privacy mode not tested.

## SCENARIO SCHEMA

Scenario is JSON object, where property value may be a result of some api call (using markup `<% %>`).
You may use js and use callbacks directly. For example:
```js
var api = {
  someApiCall: async function() { /* */}
};
new Scenario(api, {
  name: "root",
  reply: "<% someApiCall %>"
  // same as:
  // reply: async function() { /*...*/ }
});
```
As for me, yaml are best solution, it allow you use anchor, so you can avoid nesting-hell or make resuable some part of code:

```yaml
reusable commands:
  # just show cancel message
  cancel: &CANCEL
    name: cancel
    reply: Canceled
  back: &BACK
    name: back
    goto: ../..

scenario:
# [ ...skip... ]
          commands:
            /cancel|cancel: *CANCEL
            /back|back: *BACK
# [ ...skip... ]
```

Full scenario spec:

```js
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
```

Where:

- **string**, **menu** - allowed any number of template substitution `<% %>`.
- **boolean**, **number**, **fun**, only one `<% %>`.

* **typing**, **uploading_document**, etc - Use this when you need to tell the user that something is happening on the bot's side. The status is set for 5 seconds or less.
* **reply** - Send text message. You may random select one from from set, delimited by `\n={2,}\n`:
```
reply: |
  Hello <% username %>
  ===================
  Greetig <% username %>
  ===================
  Wellcome back, <% username %>
```

* **menu** - Custom keyboard:

```yaml
# as string
menu: |
  yes || no
  cancel
# as array of array
menu:
  - [yes, no]
  - cancel
# you may use callbacks that return menu markup
menu: |
  <% lastSelected %>
  <% getNext10Items %>
  back || cancel
```
* **goto** - if no "goto" property and this is a leaf of scenario, than it will go to root scenario ("/").
Root scenario name may be omitted.
* **commands**  object where key is command/work pattern and value is next scenario. If you use yaml, good to use ancors here.
* **before** callback good for prepare stash with your model data.
* **action** function called before reply was send, use it as setter. If you fail to set data or data not valid, return string explanation message that will be send to user, and route path go up (`"../"`).


### this context of api callback

```js
{
      // fast accesors to telegram message field
      text: text,
      from: from,
      chat: chat,

      // telegram message
      message: data,

      stash: {},
      session: session || {},
      telegramApi: telegram,
    };
```

- **session** object live until you not enter to root scenario or not expired *ttl*. Default ttl is 30 min, set globally may be done by `sessionTTL` method of `Bot` class.
- **stash** live while processing message, use **before** callback to prepare stash.
- **telegramApi**  - promisified **teleapiwrapper** class:
```js
fooAction: async function() {
  let telegram = this.telegram,
      chat_id = this.from.id;
  await this.telegram.sendPhoto(chat_id, fs.createReadStream("some_photo.jpg"),
                                "This is a really nice photo");
}
```

## BOT CLASS API

- `scenario(newscenario)`  - Setter/getter for scenario.
- `sessionTTL(ttl)` - Setter/getter time to live session. Default 30min.
- `stateHolder(new_stateholder)` - Setter/getter Session holder
- `telegramPollingTimout(timeout)` - Setter/getter for timeout of telegram longpolling, default 1min.
- `jobQueue()` - get job queue. Example: `bot.jobQueue.maxConcurentJobs(8)`
- `start()` - start polling

## TODO

- [ ] Write test for bot core behavior. Don't look for 100% coverage, it covered only scenario validator. Behavior still is subject of change.
- [ ] Test group chat

[travis-url]: https://travis-ci.org/osv/telegram-scenario-bot
[travis-image]: http://img.shields.io/travis/osv/telegram-scenario-bot.svg

[coveralls-url]: https://coveralls.io/r/osv/telegram-scenario-bot
[coveralls-image]: http://img.shields.io/coveralls/osv/telegram-scenario-bot/master.svg
