import _ from 'underscore';

/**
 * Simple Validator. For internal usage,
 *
 * Most of validators allow you use function or function name in string.
 * Allowed function names passed as api in constructor. Unknown fun name is reason
 * for throwing error.
 *
 * @example
 * let v2 = new Validator(api),
 *     boolean = v2.boolean.bind(v2);
 * boolean('propname', true); // ok
 * boolean('propname', "<% someApiCall %>"); // ok
 * boolean('propname', () => true ); // ok
 * boolean('propname', "XYZ<% someApiCall %>"); // fail because fun str may be "<% .. %>"
 *
 * @param {object} api - hash of known methods that may be used by "<% XYZ %>"
 */
function Validator(api={}) {
  this.setApi(api);
}

Validator.prototype = {
  setApi(api) {
    this.api = api;
  },

  getApi() {
    return this.api;
  },

  isFunction(value) {
    if (_.isFunction(value)) {
      return true;
    } else if (_.isString(value)) {
      let found = value.match(/^<%\s*(\w+)\s*%>$/);
      if (! found)
        return false;
      let function_name = found[1];
      if ( function_name &&
           _.has(this.api, function_name)) {
        return true;
      } else {
        throw Error (`Function "${function_name}" that used in "<% %>" is undefined`);
      }
    }
    return false;
  },

  fun(key_name, value) {
    if (! this.isFunction(value))
      throw Error(`"${key_name}" must be function or string api call "<% fooBar %>"`);
  },

  boolean(key_name, value) {
    if (! _.isBoolean(value) &&
        ! this.isFunction(value))
      throw Error(`"${key_name}" must be boolean or function`);
  },

  number(key_name, value) {
    if ( ! _.isNumber(value) &&
         ! this.isFunction(value))
      throw Error(`"${key_name}" must be number or function`);
  },

  string(key_name, value) {
    if (_.isFunction(value))
      return true;

    if (! _.isString(value))
      throw Error(`"${key_name}" must be string or function`);

    let re = /<%\s*(\w+)\s*%>/g,
        match;

    while ((match = re.exec(value))) {
      let function_name = match[1];
      if (! _.has(this.api, function_name))
        throw Error (`Function "${function_name}" that used in "<% %>" is undefined`);
    }
    return true;
  },

  oneOf(validators, key_name, value) {
    if (! validators || ! _.isArray(validators)) {
      throw Error(`[oneOf] validators must be not empty array`);
    }

    let valid = false,
        errors = [];
    _.each(validators, (validator) => {
      try {
        validator(key_name, value);
        valid = true;
      } catch (err) {
        errors.push(err);
      }
    });
    if (! valid) {
      let error_msg = errors.join('\n  ');
      throw Error(`None of validators returned success for property ${key_name}:\n  ${error_msg}`);
    }

  },

  array(arrayOf, key_name, value) {
    if (! arrayOf || ! _.isArray(arrayOf)) {
      throw Error(`[array] arrayOf must be not empty array`);
    }

    if (! _.isArray(value) &&
        ! this.isFunction(value))
      throw Error(`"${key_name}" must be array or function that return array`);

    if (_.isArray(value)) {
      _.each(value, (item, index) => {
        let key_name_indexed = `${key_name}[${index}]`;
        this.oneOf(arrayOf, key_name_indexed, item);
      });
    }
  },

  object(schema, required_keys, key_name, value) {
    if (_.isFunction(schema)) {
      schema = schema();
    }

    if (! _.isObject(schema) || _.isArray(schema)) {
      throw Error(`schema is empty for "${key_name}"`);
    }

    if (! _.isObject(value) || _.isArray(value)) {
      throw Error(`"${key_name}" must be hash object`);
    }

    _.each(required_keys, (key) => {
      if (! _.has(value, key)) {
        throw Error(`"${key_name}" expect to have key "${key}"`);
        }
    });

    //now validate all properties of schema
    _.each(schema, function(sub_validator, schema_key_name) {
      // check only properties if they exists, we heck  required before
      if (_.has(value, schema_key_name)) {
        let new_key_name = key_name + '.' + schema_key_name;
        sub_validator(new_key_name, value[schema_key_name]);
      }
    });

    // throw if here is unknown keys in "value" object
    let schema_keys  = Object.keys(schema),
        value_keys   = Object.keys(value),
        unknown_keys = _.difference(value_keys, schema_keys);

    if(! _.isEmpty(unknown_keys)) {
      let list_of_kes = unknown_keys.join('", "');
      throw Error(`"${key_name}" object use unknown keys: ["${list_of_kes}"]. Maybe you mistype?`);
    }
  },

};

export {Validator};
