'use strict';

var promisify = require('es6-promisify'),
    request = promisify( require('request') );

async function get() {
  let query = 'hello',
      url = 'http://ajax.googleapis.com/ajax/services/search/web?v=1.0&q=' + query,
      response = await request(url);
  let data = JSON.parse(response.body);
  console.log(response.statusCode);
}

get();
