'use strict';
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/* ddd */

var _libJobQueueJs = require('../lib/job-queue.js');

var _libJobQueueJs2 = _interopRequireDefault(_libJobQueueJs);

var _libTelegramApiPromisifiedJs = require('../lib/telegram-api-promisified.js');

var _libTelegramApiPromisifiedJs2 = _interopRequireDefault(_libTelegramApiPromisifiedJs);

var _libStateHolderJs = require('../lib/state-holder.js');

var _libStateHolderJs2 = _interopRequireDefault(_libStateHolderJs);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

function sleep(millisec) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve();
    }, millisec);
  });
}

function Bot(token) {
  // composite
  this._tel_api = new _libTelegramApiPromisifiedJs2['default'](token);
  this._state_holder = new _libStateHolderJs2['default']();
  var queue = this._job_queue = new _libJobQueueJs2['default']();

  queue.setJobPoller(this._poller.bind(this));
  queue.setWorker(this._worker.bind(this));

  this._messages = [];
  this._offset = 0;
}

Bot.prototype = {
  telegramApi: function telegramApi(BotApi) {
    if (_underscore2['default'].isUndefined(BotApi)) return this._tel_api;
    this._tel_api = BotApi;
    return this;
  },

  jobQueue: function jobQueue() {
    return this._job_queue;
  },

  start: function start() {
    this.jobQueue().start();
  },

  _poller: function _poller() {
    var offset, updates, msg;
    return regeneratorRuntime.async(function _poller$(context$1$0) {
      while (1) switch (context$1$0.prev = context$1$0.next) {
        case 0:
          if (this._messages.length) {
            context$1$0.next = 9;
            break;
          }

          console.log('getUpdates..');
          offset = this.offset + 1;
          context$1$0.next = 5;
          return regeneratorRuntime.awrap(this._tel_api.getUpdates(offset, 100, 60));

        case 5:
          updates = context$1$0.sent;

          this._messages = updates.result;
          context$1$0.next = 0;
          break;

        case 9:
          msg = this._messages.shift();

          this.offset = msg.update_id;
          return context$1$0.abrupt('return', msg);

        case 12:
        case 'end':
          return context$1$0.stop();
      }
    }, null, this);
  },

  _worker: function _worker(data) {
    var msg, chat, chat_id, api;
    return regeneratorRuntime.async(function _worker$(context$1$0) {
      while (1) switch (context$1$0.prev = context$1$0.next) {
        case 0:
          msg = data.message, chat = msg.chat, chat_id = chat.id, api = this.telegramApi();

          console.log('Processing data...:', data);
          context$1$0.next = 4;
          return regeneratorRuntime.awrap(api.sendChatAction(chat_id, 'typing'));

        case 4:
          context$1$0.next = 6;
          return regeneratorRuntime.awrap(sleep(300));

        case 6:
          context$1$0.next = 8;
          return regeneratorRuntime.awrap(api.sendMessage(chat_id, 'Hello' + msg.text));

        case 8:
        case 'end':
          return context$1$0.stop();
      }
    }, null, this);
  }
};

exports['default'] = { Bot: Bot };
module.exports = exports['default'];