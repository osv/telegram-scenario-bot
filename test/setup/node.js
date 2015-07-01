global.chai = require('chai');
global.sinon = require('sinon');
global.chai.use(require('sinon-chai'));
global.chai.use(require('chai-signature'));

require('babel/register');
require('./setup')();
