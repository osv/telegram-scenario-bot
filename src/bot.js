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

  this._user_reply_locks = {};  // store user id when worker started
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

  /**
   * Message poller for Jobqueue. Use long-polling getUpdate api of Telegram.
   */
  _poller: async function() {
    while (1) {
      while (! this._messages.length) {
        console.log('getUpdates..');
        let offset = this.offset +1,
            updates = await this._tel_api.getUpdates(offset, 100, 1800);
        this._messages = updates.result;
      }

      let msg = this._messages.shift(),
          update_id = msg.update_id,
          message = msg.message,
          from_id = message.from.id;

      this.offset = update_id;

      if (this._is_locked_user(from_id)) {
        console.log(`user is still locked, skip this message ${from_id}`, this._user_reply_locks);
        continue;
      }

      return msg;
    }
  },

  _worker: async function(data) {
    let msg = data.message,
        from = msg.from,
        from_id = from.id,
        chat = msg.chat,
        chat_id = chat.id,
        api = this.telegramApi();

    this._lock_user(from_id);
    try {

      await this._processMessage(data);

    } catch (err) {
      console.log(`Error while processing message. Message:`,
                  msg,
                  `\nTrace: ${err.stack}`);
    }
    this._unlock_user(from_id);
  },

  _processMessage: async function(data) {

  },

  _lock_user: function(user_id) {
    this._user_reply_locks[user_id] =
      setTimeout(() => { this._unlock_user(user_id); });
    return this;
  },

  _unlock_user: function(user_id) {
    delete this._user_reply_locks[user_id];
    return this;
  },

  _is_locked_user: function(user_id) {
    return _.has(this._user_reply_locks, user_id);
  }
};

export default {Bot};
