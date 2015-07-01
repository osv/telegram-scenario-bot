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
    let scenario = {
      text: "baz"
    };
    expect(Scenario.prototype.validate).called(scenario).to.not.throw();

    // other known
    scenario.typing = true;
    expect(Scenario.prototype.validate).called(scenario).to.not.throw();

    // add unknown
    scenario.baz = true;
    expect(Scenario.prototype.validate).called(scenario).to.throw();
  });
});
