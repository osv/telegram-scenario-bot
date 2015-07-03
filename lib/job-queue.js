'use strict';

/* Note:I don't use class because emacs fail highlight async class methods :) */

var _ = require ('underscore');

const MAX_CONCURENT_JOB = 2;
const MAX_POLL_DELAY    = 60000;

/**
 * Creates a new JobQueue-object.
 *
 * You must specify poll and worker functions, it must be es7 async functions or return Promise.
 *
 * @example
 * function worker(data) {
 *   let millisec = 1000;
 *   return new Promise(function(resolve) {
 *     console.log(`working on ${data}`);
 *     setTimeout(function() {
 *       console.log(`finish working on ${data}`);
 *       resolve();
 *     }, millisec);
 *   });
 * }
 * 
 * // util promise
 * function sleep(millisec) {
 *   return new Promise(function(resolve) {
 *     setTimeout(function() {
 *       resolve();
 *     }, millisec);
 *   });
 * }
 * 
 * // return incremental number after 1sec waiting
 * async function poller() {
 *   console.log('=> Start polling');
 *   await sleep(200);
 *   poller.number |= 0;
 *   poller.number ++;
 *   console.log(`=> End polling, returning ${poller.number}`);
 *   return poller.number;
 * }
 * 
 * var jq = new JobQueue()
 *       .maxConcurentJobs(2)
 *       .setJobPoller(poller)
 *       .setWorker(worker)
 *       .start();
 * 
 * 
 * @constructor
 */
function JobQueue() {
  this._max_concurent_jobs = MAX_CONCURENT_JOB;
  this._current_jobs = 0;
  this._poller_fn = null;
  this._worker_fn = null;
  this._poll_delay = 0;         // if polling failed, delay will increased
  this.max_delay = MAX_POLL_DELAY;
}

JobQueue.prototype = {
  /**
   * Suspend littlebit before next poll, usually if got error when poller called
   */
  _addPollDelay() {
    this._poll_delay += 5000;
    if (this._poll_delay > this.max_delay) {
      this._poll_delay = this.max_delay;
    }
    return this;
  },

  /**
   * Reset poll delay
   */
  _clearPollDelay() {
    this._poll_delay = 0;
    return this;
  },

  _getPollDelay() {
    return this._poll_delay;
  },


  /**
   * Max polling delay
   * @param {number} delay milliseconds
   * @returns {number|this}
   */
  maxPollDelay(delay) {
    if (_.isUndefined(delay)) {
      return this.max_delay;
    }
    if (_.isNumber(delay) && delay >= 0) {
      this.max_delay = delay;
    }
    return this;
  },

  /**
   * Set max concurent jobs. If you not set this, than default is 2.
   * @param {number} max_jobs Max number of workers
   * @returns {number|this}
   */
  maxConcurentJobs(max_jobs) {
    // must be > 0
    if (max_jobs) {
      this._max_concurent_jobs = max_jobs;
      return this;
    } else {
      return this._max_concurent_jobs;
    }
  },

  /**
   * Set poller function, may be async function or Promise, which must return one pice of data for worker
   * @param {function | Promise} poller
   * @returns {this}
   */
  setJobPoller(poller) {
    this._poller_fn = poller;
    return this;
  },

  /**
   * Set worker. There is limit of concurrent jobs. Concurrency based on this promise resolving.
   * @param {function | Promise} poller worker function
   * @returns {this}
   */
  setWorker(worker) {
    this._worker_fn = worker;
    return this;
  },

  /**
   * Start job polling and run workers, but not more workers then it was set by maxConcurentJobs()
   */
  start() {
    this._nextJobMaybe();
  },

  _callPoller: async function() {
    var poller = this._poller_fn;
    if (! _.isFunction(poller)) {
      throw new Error('You must set poller');
    }
    return await poller();
  },

  _callWorker: async function(data) {
    var worker = this._worker_fn;
    if (! _.isFunction(worker)) {
      throw new Error('You must set worker');
    }
    return await worker(data);
  },

  _nextJobMaybe: async function() {
    if (this._current_jobs >= this._max_concurent_jobs) {

      // defer, maybe next time there will be more job slots..
      setTimeout(() => { this._nextJobMaybe(); }, 100);
      return;
    }

    // non-blocking get next job
    var job_data;
    try {

      job_data = await this._callPoller();
      this._clearPollDelay();

      let self = this;
      setImmediate((function(data) {
        return async function() {
          self._current_jobs++;
          try {
            await self._callWorker(data);
          } catch (e) {
            console.log(e);
          }
          self._current_jobs--;
        };
      })(job_data));
    } catch (error) {
      console.warn('Polling ' + error);
      this._addPollDelay();
    }

    setTimeout(() => { this._nextJobMaybe(); }, this._getPollDelay());
  },
};

module.exports = JobQueue;
