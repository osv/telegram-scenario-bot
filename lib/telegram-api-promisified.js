'use strict';

/**
 * @module telegram-api-promisified
 */

var promisify = require('es6-promisify'),
    BotApi = require('teleapiwrapper').BotAPI;

var methods = ['getMe', 'sendMessage', 'forwardMessage', 'sendPhoto', 'sendAudio', 'sendDocument', 'sendSticker', 'sendVideo', 'sendLocation', 'sendChatAction', 'getUserProfilePhotos', 'getUpdates', 'setWebhook'];

for (var i = 0; i < methods.length; i++) {
  var method = methods[i],
      orig = BotApi.prototype[method];
  BotApi.prototype[method] = promisify(orig);
}

/**
 * This module promisify prototype functions of teleapiwrapper.BotAPI
 *
 * @example
 * import BotApi from './lib/telegram-api-promisified.js';
 *
 * var bot = new BotApi('123456789:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
 * bot.getMe()
 *   .then((data) => console.log(data))
 *   .catch((e) => console.log('err' + e));
 */
module.exports = BotApi;