'use strict';

var cache = require('memory-cache');

/**
 * User chat state holder with expiration, you may want write own state backend, for example using MongoDB.
 *
 * Idea is to have user chat states, that may be expired.
 *
 * This one use node memory-cache with setTimeout.
 *
 * @param {number} ttl time to live in milliseconds, default 1 hour
 * @constructor
 */
function StateHolder(ttl) {
  this._ttl = ttl || 3600000;
}

StateHolder.prototype = {
  /**
   * Put state
   * @param {string} id chat identifier
   * @param {any} value
   * @param {integer} [ttl] Expiration time, default ttl in constructor
   */
  put: function put(id, value, ttl) {
    cache.put(id, value, ttl || this._ttl);
  },

  /**
   * Get state of chatId
   * @param {string} id chat identifier
   * @return {object}
   * @function
   */
  get: cache.get,

  /**
   * Clear all states
   * @function
   */
  clearAll: cache.clear,

  /**
   * Remove state
   * @param {string} id chat identifier
   * @function
   */
  del: cache.del,

  /**
   * Return number of states
   * @function
   */
  size: cache.size
};

module.exports = StateHolder;