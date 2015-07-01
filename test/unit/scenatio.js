import {Scenario} from '../../src/scenario.js';

chai.should();

describe('Scenario class', function(){
  // it('should fail when asserting false', function(){
  //   false.should.equal(true);
  // });
  it('should validate arg1 in constructor', function(){
    sinon.stub(Scenario.prototype, 'validate', function(d) {
      return d;
    });

    let s = new Scenario('test');

    s.validate.calledOnce.should.be.true;
    s._scenario.should.to.be.equal('test');

    Scenario.prototype.validate.restore();
  });
});

describe('Scenario validator', function() {
  it('expect throw when passed not object', function(){
    expect(Scenario.prototype.validate).called().to.throw();
  });

  // it('shoud pass when only one root item that MUST have "text" field', function(){
  //   let scenario = {
  //     text: "root menu"
  //   };
  //   expect(Scenario.prototype.validate).called(scenario).to.not.throw();
  //   // not "text" field
  //   expect(Scenario.prototype.validate).called({}).to.throw();
  // });
  it('expect throw when unknown property used', function() {
    let scenario = {
      foobar: "baz"
    };
    expect(Scenario.prototype.validate).called(scenario).to.throw();
  });

  it('expect pass when known only known property have', function() {
    let scenario = { text: "baz" };
    expect(Scenario.prototype.validate).called(scenario).to.not.throw();

    // other known
    scenario.typing = true;
    expect(Scenario.prototype.validate).called(scenario).to.not.throw();

    // add unknown
    scenario.baz = true;
    expect(Scenario.prototype.validate).called(scenario).to.throw();
  });

  it('expect valid "string" type of schema keys', function() {
    let scenario_ok = { text: "baz" };
    let schema = { text: ['string'] };
    expect(Scenario.prototype.validate).called(scenario_ok, '/', schema)
      .to.not.throw();

    let scenario_invalide = { text: [1,2,3] };
    expect(Scenario.prototype.validate).called(scenario_invalide, '/', schema)
      .to.throw();
  });

  it('expect valid "boolean" type of schema keys', function() {
    let schema = { text: ['boolean'] };

    let scenario_ok = {
      text: false
    };
    expect(Scenario.prototype.validate).called(scenario_ok, '/', schema)
      .to.not.throw();

    let scenario_invalide = {
      text: [1,2,3]
    };
    expect(Scenario.prototype.validate).called(scenario_invalide, '/', schema)
      .to.throw();
  });

  it('expect valid "array" type of schema keys', function() {
    let schema = { text: ['array'] };

    let scenario_ok = { text: [1,2,3] };
    expect(Scenario.prototype.validate).called(scenario_ok, '/', schema)
      .to.not.throw();

    let scenario_invalide = { text: "foobar" };
    expect(Scenario.prototype.validate).called(scenario_invalide, '/', schema)
      .to.throw();
  });

  it('expect valid "function" type of schema keys', function() {
    let schema = { text: ['function'] };

    let scenario_ok = {
      text: function() {}
    };
    expect(Scenario.prototype.validate).called(scenario_ok, '/', schema)
      .to.not.throw();

    let scenario_invalide = { text: 123 };
    expect(Scenario.prototype.validate).called(scenario_invalide, '/', schema)
      .to.throw();
  });

  it('expect valid "number" type of schema keys', function() {
    let schema = { text: ['number'] };

    let scenario_ok = { text: 999.9 };
    expect(Scenario.prototype.validate).called(scenario_ok, '/', schema)
      .to.not.throw();

    let scenario_invalide = { text: "foobar" };
    expect(Scenario.prototype.validate).called(scenario_invalide, '/', schema)
      .to.throw();
  });

});
