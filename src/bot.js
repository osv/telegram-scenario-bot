'use strict';
/* ddd */
import JobQueue from './job-queue.js';
import BotApi from './telegram-api-promisified.js';
import StateHolder from './state-holder.js';

import _ from 'underscore';

function sleep(millisec) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve();
    }, millisec);
  });
}

function Bot(token) {
  // composite
  this._tel_api = new BotApi(token);
  this._state_holder = new StateHolder();
  let queue = this._job_queue = new JobQueue();

  queue.setJobPoller(this._poller.bind(this));
  queue.setWorker(this._worker.bind(this));

  this._messages = [];
  this._offset = 0;
}

Bot.prototype = {
  telegramApi(BotApi) {
    if (_.isUndefined(BotApi))
      return this._tel_api;
    this._tel_api = BotApi;
    return this;
  },

  jobQueue() {
    return this._job_queue;
  },

  start() {
    this.jobQueue().start();
  },

  _poller: async function() {
    while (! this._messages.length) {
      console.log('getUpdates..');
      let offset = this.offset +1,
          updates = await this._tel_api.getUpdates(offset, 100, 60);
      this._messages = updates.result;
    }
    let msg = this._messages.shift();
    this.offset = msg.update_id;
    return msg;
  },

  _worker: async function(data) {
    let msg = data.message,
        chat = msg.chat,
        chat_id = chat.id,
        api = this.telegramApi();

    console.log('Processing data...:', data);
    await api.sendChatAction(chat_id, 'typing');
    await sleep(300);
    await api.sendMessage(chat_id, 'Hello' + msg.text);
  },
};

export default {Bot};
