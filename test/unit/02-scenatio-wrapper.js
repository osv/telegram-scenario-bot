'use strict';
/* jshint -W031 */

import ScenarioWrapper from '../../src/scenario-wrapper.js';

chai.should();

describe('Scenario wrapper', function() {
  describe('Basic methods',function() {
    it('getScenario', function() {
      let scen = {foo: 1},
          s = new ScenarioWrapper({}, // api
                                  scen);

      s.getScenario().should.to.be.eql(scen);
    });

    it('getName', function() {
      let scen = {name: 'root-scen'},
          s = new ScenarioWrapper({}, // api
                                  scen);

      s.getName().should.to.be.eql('root-scen');
    });

  });
  describe('getAction(), telegram action', function() {
    it('typing', function() {
      return new ScenarioWrapper({}, {typing: true})
        .getAction().should.eventually.eql('typing');
    });

    it('uploading_photo', function() {
      return new ScenarioWrapper({}, {uploading_photo: true})
      .getAction().should.eventually.eql('upload_photo');
    });

    it('recording_video', function() {
      return new ScenarioWrapper({}, {recording_video: true})
      .getAction().should.eventually.eql('record_video');
    });

    it('uploading_video', function() {
      return new ScenarioWrapper({}, {uploading_video: true})
      .getAction().should.eventually.eql('upload_video');
    });

    it('recording_audio', function() {
      return new ScenarioWrapper({}, {recording_audio: true})
        .getAction().should.eventually.eql('record_audio');
    });

    it('uploading_audio', function() {
      return new ScenarioWrapper({}, {uploading_audio: true})
        .getAction().should.eventually.eql('upload_audio');
    });

    it('uploading_document', function() {
      return new ScenarioWrapper({}, {uploading_document: true})
        .getAction().should.eventually.eql('upload_document');
    });

    it('uploading_document', function() {
      return new ScenarioWrapper({}, {uploading_document: true})
        .getAction().should.eventually.eql('upload_document');
    });

    it('finding_location', function() {
      return new ScenarioWrapper({}, {finding_location: true})
        .getAction().should.eventually.eql('find_location');
    });

    it('empty {}', function() {
      return new ScenarioWrapper({}, {})
        .getAction().should.eventually.eql('');
    });

    it('typing false', function() {
      return new ScenarioWrapper({}, {typing: false})
        .getAction().should.eventually.eql('');
    });

    it('typing false', function() {
      return new ScenarioWrapper({}, {typing: false})
        .getAction().should.eventually.eql('');
    });

    it('ordered {typing, find_location}', function() {
      return new ScenarioWrapper({}, {typing: true, finding_location: true})
        .getAction().should.eventually.eql('typing');
    });

    it('get typing from function that return true', function() {
      return new ScenarioWrapper({}, {typing: () => true})
        .getAction().should.eventually.eql('typing');
    });

    it('get typing from function that return true', function() {
      return new ScenarioWrapper({}, {typing: () => false})
        .getAction().should.eventually.eql('');
    });

    it('get typing from <% %> function that return true', function() {
      let api = {
        getTypeStatus: function() {
          return true;
        }
      };
      return new ScenarioWrapper(api, {typing: '<% getTypeStatus %>'})
        .getAction().should.eventually.eql('typing');
    });

    it('get typing from <% %> function that return false', function() {
      let api = {
        getTypeStatus: function() {
          return false;
        }
      };
      return new ScenarioWrapper(api, {typing: '<% getTypeStatus %>'})
        .getAction().should.eventually.eql('');
    });

    it('Ensure getAction(context, args) pass context and args to cb', function() {
      let context = {
        item1: 1
      };
      let api = {
        getTypeStatus: function(arg1, arg2) {
          this.should.to.have.property('item1');
          arg1.should.to.be.eql('arg1');
          arg2.should.to.be.eql('arg2');
          return false;
        }
      };
      return new ScenarioWrapper(api, {typing: '<% getTypeStatus %>'})
        .getAction(context, ['arg1', 'arg2']).should.eventually.eql('');
    });
  });

  describe('getReply(), reply property of scenario', function() {
    it('simple', function() {
      return new ScenarioWrapper({}, {reply: "Hello"})
        .getReply().should.eventually.eql('Hello');
    });

    it('using callback', function() {
      return new ScenarioWrapper({}, {reply: () => 'Hello'})
        .getReply().should.eventually.eql('Hello');
    });

    it('using api', function() {
      let api = {
        getReply: function() {
          return "Hello";
        },
        getName: function() {
          return "John";
        }
      };
      return new ScenarioWrapper(api, {reply: '<% getReply %>, <% getName %>. How are you?'})
        .getReply().should.eventually.eql('Hello, John. How are you?');
    });

    it('throw error if unsed unknow api name', function() {
      return new ScenarioWrapper({}, // empty api
                                 {reply: 'Hello <% getName %>. How are you?'})
        .getReply().should.be.rejectedWith(/Unknown api function "getName"/);
    });

    it('Ensure getReply(context, args) pass context and args to cb in <% %>', function() {
      let context = {
        item1: 1
      };
      let api = {
        reply: function(arg1, arg2) {
          this.should.to.have.property('item1');
          arg1.should.to.be.eql('arg1');
          arg2.should.to.be.eql('arg2');
          return 'hello';
        }
      };
      return new ScenarioWrapper(api, {reply: '<% reply %>'})
        .getReply(context, ['arg1', 'arg2']).should.eventually.eql('hello');
    });

    it('Ensure getReply(context, args) pass context and args to cb', function() {
      let context = {
        item1: 1
      };
      return new ScenarioWrapper({}, {
        reply: function(arg1, arg2) {
          this.should.to.have.property('item1');
          arg1.should.to.be.eql('arg1');
          arg2.should.to.be.eql('arg2');
          return 'hello';
        }
      })
        .getReply(context, ['arg1', 'arg2']).should.eventually.eql('hello');
    });
  });

  describe('getTTL(), property ttl',function() {
    it('should return 0 if not set by scenario', function() {
      return new ScenarioWrapper({}, {})
        .getTTL().should.eventually.equal(0);
    });

    it('should return valure set by scenario ttl property', function() {
      return new ScenarioWrapper({}, {ttl: 999})
        .getTTL().should.eventually.equal(999);
    });

    it('should support <% %>', function() {
      let api = {
        TTL: function() { return 777; }
      };
      return new ScenarioWrapper(api, {ttl: '<% TTL %>'})
        .getTTL().should.eventually.eql(777);
    });

    it('should return 0 if string set by scenario ttl property', function() {
      return new ScenarioWrapper({}, {ttl: '10'})
        .getTTL().should.eventually.equal(0);
    });
  });

  describe('Promise and async as callback in api', function() {
    before(function() {
      // simple sleep promise and resolve return msg
      this.sleep = function sleep(millisec, msg) {
        return new Promise(function(resolve) {
          setTimeout(function() {
            resolve(msg);
          }, millisec);
        });
      };
    });

    it('reply field of scenario: use async function', function() {
      let sleep = this.sleep,
          api = {
            getReply: async function() {
              let resoleved_msg = await sleep(0, 'hello'); // must return 'hello'
              return resoleved_msg;
            },
          };
      return new ScenarioWrapper(api, {reply: '<% getReply %>'})
        .getReply().should.eventually.eql('hello');
    });

    it('reply field of scenario: use Promise', function() {
      let sleep = this.sleep,   // promise
          api = {
            getReply: sleep.bind(null, 0, 'hello')
          };
      return new ScenarioWrapper(api, {reply: '<% getReply %>'})
        .getReply().should.eventually.eql('hello');
    });
  });

  describe('before, action, after function',function() {
    before(function() {
      this.api = {
        return_ok: function() {
          return 'ok';
        }
      };
    })
    describe('callBeforeFun(), Call scenario "before" function',function() {
      it('using callback', function() {
        return new ScenarioWrapper({}, {before: function() {
          return 'ok';
        }})
          .callBeforeFun().should.eventually.equal('ok');
      });

      it('using <% %>', function() {
        let api = this.api;
        return new ScenarioWrapper(api, {before: "<% return_ok %>"})
          .callBeforeFun().should.eventually.equal('ok');
      });

      it('Ensure callBeforeFun(context, args) pass context and args to cb', function() {
        let context = {
          item1: 1
        };
        return new ScenarioWrapper({}, {
          before: function(arg1, arg2) {
            this.should.to.have.property('item1');
            arg1.should.to.be.eql('arg1');
            arg2.should.to.be.eql('arg2');
            return 'ok';
          }
        })
          .callBeforeFun(context, ['arg1', 'arg2']).should.eventually.eql('ok');
      });

      it('Ensure callBeforeFun(context, args) pass context and args to cb in <% %>', function() {
        let context = {
          item1: 1
        };
        let api = {
          fun: function(arg1, arg2) {
            this.should.to.have.property('item1');
            arg1.should.to.be.eql('arg1');
            arg2.should.to.be.eql('arg2');
            return 'ok';
          }
        };
        return new ScenarioWrapper(api, {before: '<% fun %>'})
          .callBeforeFun(context, ['arg1', 'arg2']).should.eventually.eql('ok');
      });

    });
    describe('callAfterFun(), Call scenario "after" function',function() {
      it('using callback', function() {
        return new ScenarioWrapper({}, {after: function() {
          return 'ok';
        }})
          .callAfterFun().should.eventually.equal('ok');
      });

      it('using <% %>', function() {
        let api = this.api;
        return new ScenarioWrapper(api, {after: "<% return_ok %>"})
          .callAfterFun().should.eventually.equal('ok');
      });
    });

    describe('callActionFun(), Call scenario "after" function',function() {
      it('using callback', function() {
        return new ScenarioWrapper({}, {action: function() {
          return 'ok';
        }})
          .callActionFun().should.eventually.equal('ok');
      });

      it('using <% %>', function() {
        let api = this.api;
        return new ScenarioWrapper(api, {action: "<% return_ok %>"})
          .callActionFun().should.eventually.equal('ok');
      });
    });
  });
  describe('"commands" property, getCommand()',function() {
    before(function() {
      this.scenario = {
        name: 'root',
        commands: {
          '/start': {
            commands: {
              '.': {name: 'default'},
              '/print': {name: 'print'},
              '/list': {name: 'list'},
            }
          },
        }
      };
    });

    it('should return null if no "commands" in scenario', function() {
      let s = new ScenarioWrapper({}, {}),
          res = s.getNextScenario('/foo');
      expect(res).to.be.equal(null);
    });

    it('should "." match last', function() {
      let scenario = this.scenario,
          s = new ScenarioWrapper({}, scenario),
          unknown_w = s.getNextScenario('/quit'),
          start_w = s.getNextScenario('/start');

      expect(start_w, '/start').to.be.an.instanceof(ScenarioWrapper);
      expect(unknown_w, '/quit is not in commands').to.be.equal(null);

      let list_w = start_w.getNextScenario('/list');

      expect(list_w, '/list').to.be.an.instanceof(ScenarioWrapper);
      list_w.getName().should.be.equal('list');

      let default_w = start_w.getNextScenario('foo bar');

      expect(default_w, '"foo bar" matched by "." pattern').to.be.an.instanceof(ScenarioWrapper);
      default_w.getName().should.be.equal('default');
    });
  });
  describe('"goto" property, getGoto()', function() {
    it('should return "/" as default if no "goto" prop', function() {
      return new ScenarioWrapper({}, {})
        .getGoto().should.eventually.equal('/');
    });

    it('should return "." as default if no "goto" prop', function() {
      return new ScenarioWrapper({}, {commands: {}})
        .getGoto().should.eventually.equal('.');
    });

    it('should return string if defined in scenario', function() {
      return new ScenarioWrapper({}, {goto: '/help/usage'})
        .getGoto().should.eventually.equal('/help/usage');
    });

    it('should support cb', function() {
      return new ScenarioWrapper({}, {goto: function() {
        return '/foo/bar';
      }})
        .getGoto().should.eventually.equal('/foo/bar');
    });

    it('should support async cb', function() {
      return new ScenarioWrapper({}, {goto: async function() {
        return '/foo/bar';
      }})
        .getGoto().should.eventually.equal('/foo/bar');
    });

    it('should support <% %>', function() {
      let api = { getPath: () => '/foo/bar'};
      return new ScenarioWrapper(api, {goto: '..<% getPath %>'})
        .getGoto().should.eventually.equal('../foo/bar');
    });

  });
});
