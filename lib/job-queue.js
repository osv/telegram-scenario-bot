'use strict';

/* Note:I don't use class because emacs fail highlight async class methods :) */

var _ = require('underscore');

var MAX_CONCURENT_JOB = 2;
var MAX_POLL_DELAY = 60000;

/**
 * Creates a new JobQueue-object.
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
 *   await sleep(200);
 *   poller.number |= 0;
 *   poller.number ++;
 *   return poller.number;
 * }
 * 
 * var jq = new JobQueue()
 *       .maxConcurentJobs(2)
 *       .setJobPoller(poller)
 *       .setWorker(worker)
 *       .start();
 * 
 * @constructor
 */
function JobQueue() {
  this._max_concurent_jobs = MAX_CONCURENT_JOB;
  this._current_jobs = 0;
  this._poller_fn = null;
  this._worker_fn = null;
  this._poll_delay = 0; // if polling failed, delay will increased
  this.max_delay = MAX_POLL_DELAY;
}

JobQueue.prototype = {
  /**
   * Suspend littlebit before next poll, usually if got error when poller called
   */
  _addPollDelay: function _addPollDelay() {
    this._poll_delay += 5000;
    if (this._poll_delay > this.max_delay) {
      this._poll_delay = this.max_delay;
    }
    return this;
  },

  /**
   * Reset poll delay
   */
  _clearPollDelay: function _clearPollDelay() {
    this._poll_delay = 0;
    return this;
  },

  _getPollDelay: function _getPollDelay() {
    return this._poll_delay;
  },

  /**
   * Max polling delay
   * @param {number} delay milliseconds
   * @returns {number|this}
   */
  maxPollDelay: function maxPollDelay(delay) {
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
  maxConcurentJobs: function maxConcurentJobs(max_jobs) {
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
  setJobPoller: function setJobPoller(poller) {
    this._poller_fn = poller;
    return this;
  },

  /**
   * Set worker. There is limit of concurrent jobs. Concurrency based on this promise resolving.
   * @param {function | Promise} poller worker function
   * @returns {this}
   */
  setWorker: function setWorker(worker) {
    this._worker_fn = worker;
    return this;
  },

  /**
   * Start job polling and run workers, but not more workers then it was set by maxConcurentJobs()
   */
  start: function start() {
    this._nextJobMaybe();
  },

  _callPoller: function _callPoller() {
    var poller;
    return regeneratorRuntime.async(function _callPoller$(context$1$0) {
      while (1) switch (context$1$0.prev = context$1$0.next) {
        case 0:
          poller = this._poller_fn;

          if (_.isFunction(poller)) {
            context$1$0.next = 3;
            break;
          }

          throw new Error('You must set poller');

        case 3:
          context$1$0.next = 5;
          return regeneratorRuntime.awrap(poller());

        case 5:
          return context$1$0.abrupt('return', context$1$0.sent);

        case 6:
        case 'end':
          return context$1$0.stop();
      }
    }, null, this);
  },

  _callWorker: function _callWorker(data) {
    var worker;
    return regeneratorRuntime.async(function _callWorker$(context$1$0) {
      while (1) switch (context$1$0.prev = context$1$0.next) {
        case 0:
          console.log('>> call worker <<');

          worker = this._worker_fn;

          if (_.isFunction(worker)) {
            context$1$0.next = 4;
            break;
          }

          throw new Error('You must set worker');

        case 4:
          context$1$0.next = 6;
          return regeneratorRuntime.awrap(worker(data));

        case 6:
          return context$1$0.abrupt('return', context$1$0.sent);

        case 7:
        case 'end':
          return context$1$0.stop();
      }
    }, null, this);
  },

  _nextJobMaybe: function _nextJobMaybe() {
    var job_data;
    return regeneratorRuntime.async(function _nextJobMaybe$(context$1$0) {
      var _this = this;

      while (1) switch (context$1$0.prev = context$1$0.next) {
        case 0:
          if (!(this._current_jobs >= this._max_concurent_jobs)) {
            context$1$0.next = 4;
            break;
          }

          console.log('  Jobs > 2, waiting..');

          // defer, maybe next time there will be more job slots..
          setTimeout(function () {
            _this._nextJobMaybe();
          }, 100);
          return context$1$0.abrupt('return');

        case 4:
          context$1$0.prev = 4;
          context$1$0.next = 7;
          return regeneratorRuntime.awrap((function callee$1$0() {
            var self;
            return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
              while (1) switch (context$2$0.prev = context$2$0.next) {
                case 0:
                  context$2$0.next = 2;
                  return regeneratorRuntime.awrap(this._callPoller());

                case 2:
                  job_data = context$2$0.sent;

                  this._clearPollDelay();

                  console.log(' Spawn new job ' + job_data);
                  self = this;

                  setImmediate((function (data) {
                    return function callee$3$0() {
                      return regeneratorRuntime.async(function callee$3$0$(context$4$0) {
                        while (1) switch (context$4$0.prev = context$4$0.next) {
                          case 0:
                            self._current_jobs++;
                            context$4$0.prev = 1;
                            context$4$0.next = 4;
                            return regeneratorRuntime.awrap(self._callWorker(data));

                          case 4:
                            console.log('>> xxx << Jobs:', self._current_jobs);
                            context$4$0.next = 10;
                            break;

                          case 7:
                            context$4$0.prev = 7;
                            context$4$0.t0 = context$4$0['catch'](1);

                            console.log(context$4$0.t0);

                          case 10:
                            self._current_jobs--;

                          case 11:
                          case 'end':
                            return context$4$0.stop();
                        }
                      }, null, this, [[1, 7]]);
                    };
                  })(job_data));

                case 7:
                case 'end':
                  return context$2$0.stop();
              }
            }, null, _this);
          })());

        case 7:
          context$1$0.next = 13;
          break;

        case 9:
          context$1$0.prev = 9;
          context$1$0.t0 = context$1$0['catch'](4);

          console.warn('Polling ' + context$1$0.t0);
          this._addPollDelay();

        case 13:

          setTimeout(function () {
            _this._nextJobMaybe();
          }, this._getPollDelay());

        case 14:
        case 'end':
          return context$1$0.stop();
      }
    }, null, this, [[4, 9]]);
  }
};

module.exports = JobQueue;

// non-blocking get next job