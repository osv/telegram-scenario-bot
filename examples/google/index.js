'use strict';

import {Bot, Scenario} from '../../src/index.js';
import promisify       from 'es6-promisify';
import request         from 'request';
import _               from 'underscore';

var arequest = promisify(request);

var googleSearch = async function(query) {
  let url = 'http://ajax.googleapis.com/ajax/services/search/web?v=1.0&q=' +
        encodeURIComponent(query),

      response = await arequest(url);

  if (response.statusCode === 200) {
    let data = JSON.parse(response.body),
        item0 = data.responseData.results[0],
        title = item0.titleNoFormatting,
        item_url = item0.url;

    return `${title}\n * ${item_url}`;
  }

  return 'Search failed';
};

var search = async function() {
  var user_text = this.text,
      stash = this.stash;

  if (_.isString(user_text)) {
    // allow use query like "/google foo bar", so remove /google
    let query = user_text.replace(/[/]?google\s+/, '');

    if (!_.isEmpty(query)) {
      stash.result = await googleSearch(query);
      return null;
    }
  }
  return "Type text to search";
};

var script = {
  name: 'root',
  reply: 'Usage:\n'+
    '/google - search in google\n'+
    '/about - about bot',
  menu: [
    ['/google'],
    ['/about'],
  ],
  commands: {
    "/about": {
      name: 'about',
      reply: '❓ This is telegram bot demo.\n' +
        'When you enter /google, you will be prompted for search query.' +
        'Than return 1st search result from google'
    },
    "/google|g": {
      name: 'google',
      reply: "Enter search query?",
      commands: {
        ".": {
          name: "searchResult",
          action: search,
          reply: function() { return this.stash.result; }
        }
      }
    }
  }
};

var scenario = new Scenario({ /* bot api, we dont user */}, script);

var token = process.env.BOT_TOKEN;

if (!token) {
  console.error(`!! You need set env BOT_TOKEN`);
  process.exit(1);
}

var b = new Bot(token);

b.scenario(scenario);
b.start();
