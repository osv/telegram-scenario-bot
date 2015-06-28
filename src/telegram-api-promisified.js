'use strict';

/*
 * Promisify prototype functions of teleapiwrapper.BotAPI
 */

var promisify = require('es6-promisify'),
    BotApi = require('teleapiwrapper').BotAPI;

var methods = [
  'getMe',
  'sendMessage',
  'forwardMessage',
  'sendPhoto',
  'sendAudio',
  'sendDocument',
  'sendSticker',
  'sendVideo',
  'sendLocation',
  'sendChatAction',
  'getUserProfilePhotos',
  'getUpdates',
  'setWebhook',
];

for (let i = 0; i < methods.length; i++) {
  let method = methods[i],
      orig = BotApi.prototype[method];
  BotApi.prototype[method] = promisify(orig);
}

module.exports = BotApi;
