'use strict';
/* jshint -W031 */

import {Scenario} from '../../src/scenario.js';

import {ScenarioWrapper} from '../../src/scenario-wrapper.js';

chai.should();

describe('Scenario class', function(){
  // it('should fail when asserting false', function(){
  //   false.should.equal(true);
  // })
  describe('Internal shema validator' ,function() {
    it('Constructor', function() {
      expect(() => { new Scenario(); })
        .to.not.throw();
    });

    it('api()', function() {
      expect(() => {
        var s = new Scenario();

        // setter
        var setter_res = s.api({ foo: 1});
        setter_res.should.to.be.an.instanceof(Scenario);

        // getter
        s.api().should.to.have.property('foo');

        // try validate now
        s.validate({
          name: "root",
          typing: "<% foo %>"
        });
      })
        .to.not.throw();
    });

    it('scenario() should set propert .scenario and return this', function() {
      expect(() => {
        var scenario_templ = {
          name: "root",
          typing: true
        };
        var s = new Scenario();

        // setter
        var setter_res = s.scenario(scenario_templ);
        setter_res.should.to.be.an.instanceof(Scenario);

        // getter
        s.scenario().should.to.be.equal(scenario_templ);

        // internal property
        s._scenario.should.to.be.equal(scenario_templ);
      })
        .to.not.throw();
    });

    it('validate method', function() {
      expect(() => {
        var s = new Scenario();
        s.validate({
          name: "root",
          typing: true
        });
      })
        .to.not.throw();
    });

    it('Basic schema', function(){
      let scenario1 = {
        name: "root",
        typing: true,
      };

      expect(() => { new Scenario({}, scenario1); })
        .to.not.throw();

      let scenario2 = {
        name: "root",
        fail: true
      };

      expect(() => { new Scenario({}, scenario2); })
        .to.throw('object use unknown keys: ["fail"]');
    });

    it('Scenario. "name"', function() {
      expect(() => { new Scenario({}, {name: 'ss/s'}); })
        .to.throw('not allowed');

      expect(() => { new Scenario({}, {name: 'ss<s'}); })
        .to.throw('not allowed');

      expect(() => { new Scenario({}, {name: 'ss>s'}); })
        .to.throw('not allowed');

      expect(() => { new Scenario({}, {name: null}); })
        .to.throw('must be a string');

      expect(() => { new Scenario({}, {name: null}); })
        .to.throw('must be a string');

      expect(() => {
        new Scenario({}, {name: function() {}});
      })
        .to.throw('must be a string');
    });

    it('Scenario. "commands"', function() {
      let scenario1 = {
        name: "root",
        typing: true,
        commands: {
          "/help": {
            name: "help",
            typing: true
          }
        }
      };

      expect(() => { new Scenario({}, scenario1); })
        .to.not.throw();

      let scenario2= {
        name: "root",
        typing: true,
        commands: {
          "/help": {
            name: "help",
            typing: 123 // <- fail here
          }
        }
      };

      expect(() => { new Scenario({}, scenario2); })
        .to.throw('"scenario.commands."/help".typing" must be boolean or function');
    });
  });

  describe('Scenario methods', function() {
    before(function() {
      let scenario = this.scenario = new Scenario(),

          script_quit_f = this.script_quit_f = {
            name: "quit-force",
            menu: 'yes || no\n' +
              '--\n' +
              'cancel'
          },
          script_quit = this.script_quit = {
            name: "quit",
            reply: "Quit?",
            menu: [
              ['yes', 'no'],
              ['cancel']
            ],
            commands: {
              yes: {
                name: 'yes'
              },
              'no': {
                name: 'no'
              }
            },
          },
          script = this.script = {
            name: "root",
            reply: "hello",
            commands: {
              '/quit-force' : script_quit_f,
              '/quit'       : script_quit,
              '.': {
                name: 'default',
                reply: 'Unrecognized command',
              }
            },
          },
          api = this.api = {

          };

      scenario
        .api(api)
        .scenario(script);
    });

    it('getScenario(path), should return ScenarioWrapper obj based on path',function() {
      let s = this.scenario,
          quit_scenario_wrapped = new ScenarioWrapper({}, this.script_quit),
          root_scenario_wrapped = new ScenarioWrapper({}, this.script);

      s.should.be.instanceof(Scenario);
      s.getScenario().should.be.instanceof(ScenarioWrapper);
      s.getScenario().should.be.deep.equal(root_scenario_wrapped);

      s.getScenario('/root').should.be.deep.equal(root_scenario_wrapped);
      s.getScenario('/').should.be.deep.equal(root_scenario_wrapped);

      // both are quit
      s.getScenario('/quit').should.be.deep.equal(quit_scenario_wrapped);
      s.getScenario('/root/quit').should.be.deep.equal(quit_scenario_wrapped);

      expect(s.getScenario).bind(s).called('/foo')
        .to.throw('Cannot find scenario: "foo" in "/root"');

      expect(s.getScenario).bind(s).called('/root/quit-force/')
        .to.not.throw();

      expect(s.getScenario).bind(s).called('/root/quit-force/bar')
        .to.throw('Cannot find scenario: "bar" in "/root/quit-force"');
    });
  });

});
