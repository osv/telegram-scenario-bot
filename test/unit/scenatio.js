'use strict';

import {Scenario, Validator} from '../../src/scenario.js';

chai.should();

describe("validators function:", function() {
  it('"fun" expect function or string <% foo %>', function() {
    let api = {foo: () => {}},
        v = new Validator(api),
        fun = v.fun.bind(v);

    expect(fun).called('foo', true).to.throw('must be function');
    expect(fun).called('foo', false).to.throw('must be function');

    expect(fun).called('foo', 123).to.throw('must be function');

    expect(fun).called('foo', () => {}).not.to.throw();
    expect(fun).called('foo', "<% foo %>").to.not.throw();

    expect(fun).called('foo', "<% foo %>baz").to.throw();
    expect(fun).called('foo', "<% bar %>").to.throw('undef');
  });

  it('"boolean" expect to be boolean, string "<% foo %>" or function', function() {
    let api = {foo: () => {}},
        v = new Validator(api);

    expect(v.boolean).bind(v).called('foo', true).not.to.throw();
    expect(v.boolean).bind(v).called('foo', false).not.to.throw();

    expect(v.boolean).bind(v).called('foo', 123).to.throw('"foo" must be boolean');

    expect(v.boolean).bind(v).called('foo', () => {}).not.to.throw();

    expect(v.boolean).bind(v).called('foo', "").to.throw('"foo" must be boolean');
    expect(v.boolean).bind(v).called('foo', "foo").to.throw();

    expect(v.boolean).bind(v).called('foo', "<% foo %>").to.not.throw();
    expect(v.boolean).bind(v).called('foo', "<% foo %>baz").to.throw();
    expect(v.boolean).bind(v).called('foo', "<% bar %>").to.throw('undef');
  });

  it('"number" expect value number. Function or function name"<% foo %>" must work too', function() {
    let api = {foo: () => {}},
        v = new Validator(api);

    expect(v.number).bind(v).called('foo1', true).to.throw('"foo1" must be number');
    expect(v.number).bind(v).called('foo1', false).to.throw();
    expect(v.number).bind(v).called('foo2', []).to.throw();

    expect(v.number).bind(v).called('foo2', 123).not.to.throw();

    expect(v.number).bind(v).called('foo3', () => {}).not.to.throw();

    expect(v.number).bind(v).called('foo4', "<% foo %>").to.not.throw();
    expect(v.number).bind(v).called('foo5', "<% foo %>baz").to.throw();
    expect(v.number).bind(v).called('foo7', "<% bar %>").to.throw('undef');

    expect(v.number).bind(v).called('foo8', "").to.throw();
    expect(v.number).bind(v).called('foo9', "123").to.throw();
    expect(v.number).bind(v).called('foo10', "abc").to.throw('number');
  });

  it('"string" expect value string. Function or function name"<% foo %>" must work too', function() {
    let api = {
      foo: () => {},
      baz: () => {}
    },
        v = new Validator(api);

    expect(v.string).bind(v).called('foo1', true).to.throw();
    expect(v.string).bind(v).called('foo2', false).to.throw();
    expect(v.string).bind(v).called('foo3', []).to.throw();
    expect(v.string).bind(v).called('foo4', {}).to.throw();

    expect(v.string).bind(v).called('foo5', 123).to.throw('"foo5" must be string');

    expect(v.string).bind(v).called('foo6', () => {}).not.to.throw();

    expect(v.string).bind(v).called('foo7', "<% foo %>").to.not.throw();
    expect(v.string).bind(v).called('foo8', "<% foo %>baz").to.not.throw();
    expect(v.string).bind(v).called('foo9', "<% foo %> baz <% baz %>").to.not.throw();
    expect(v.string).bind(v).called('foo10', "text <% foo %>baz").to.not.throw();
    expect(v.string).bind(v).called('foo11', "<% bar %>").to.throw();
    expect(v.string).bind(v).called('foo12', "<% foo %> baz <% bar %>").to.throw();

    expect(v.string).bind(v).called('foo13', "baz <% bar %>").to.throw('undef');

    expect(v.string).bind(v).called('foo14', "").to.not.throw();
    expect(v.string).bind(v).called('foo15', "123").to.not.throw();
    expect(v.string).bind(v).called('foo16', "abc").to.not.throw('string');
  });


  it('"oneOf" expect for at least one valid type in array of types', function() {
    let api = {
      foo: () => {},
    },
        v = new Validator(api),
        string = v.string.bind(v),
        number = v.number.bind(v);

    expect(v.oneOf).bind(v).called([string], 'foo1', "abc").to.not.throw();
    expect(v.oneOf).bind(v).called([string], 'foo2', "").to.not.throw();
    expect(v.oneOf).bind(v).called([string], 'foo3', 123).to.throw('None of validators');

    let oneOf_str_or_num = v.oneOf.bind(v, [string, number]);
    expect(oneOf_str_or_num).called('foo4', 123).to.not.throw();
    expect(oneOf_str_or_num).called('foo5', "<% foo %>").to.not.throw();
    expect(oneOf_str_or_num).called('foo6', "<% foo %>").to.not.throw();
    expect(oneOf_str_or_num).called('foo7', []).to.throw('None of validators');

    expect(v.oneOf).bind(v).called(null, 'foo1', "abc").to.throw('must be not empty array');
  });

  it('"array" expect value array or function, function name"<% foo %>"', function() {
    let api = {
      foo: () => {},
    },
        v = new Validator(api),
        array = v.array.bind(v),
        string = v.string.bind(v),
        number = v.number.bind(v);

    expect(array).bind(v).called('foo1', []).to.throw('arrayOf must be not empty array');

    expect(array).bind(v).called([ string ], 'foo1', false).to.throw('must be array');
    expect(array).bind(v).called([ string ], 'foo2', []).to.not.throw('must be array');
    expect(array).bind(v).called([ string ], 'foo3',
                                 [ "abc", "def" ]).to.not.throw();

    expect(array).bind(v).called([ number ], 'foo3',
                                 "").to.throw();

    expect(array).bind(v).called([ number ], 'foo3',
                                 "abc").to.throw();

    // throw, because  string only acceptable
    expect(array).bind(v).called([ string ], 'foo4',
                                 [ "abc", 123]).to.throw();

    expect(array).bind(v).called([ string ], 'foo4',
                                 [ "abc", {}]).to.throw();

    expect(array).bind(v).called([ string, number ], 'foo5',
                                 [ "abc", 123]).to.not.throw();

    expect(array).bind(v).called([ string, number ], 'foo6',
                                 [ "abc", () => {} ]).to.not.throw();

    expect(array).bind(v).called([ string, number ], 'foo6',
                                 "<% foo %>").to.not.throw();

    expect(array).bind(v).called([ number ], 'foo6',
                                 [ 123,
                                   () => {},
                                   "<% foo %>"
                                 ]).to.not.throw();

    expect(array).bind(v).called([ number ], 'foo6',
                                 [ 123,
                                   () => {},
                                   "<% foo %>"
                                 ]).to.not.throw();
  });

  it('"array" expect for support nested array of array of XXX', function() {
    let api = {
      foo: () => {},
    },
        v                            = new Validator(api),
        array                        = v.array.bind(v),
        string                       = v.string.bind(v),
        number                       = v.number.bind(v),
        array_of_str                 = array.bind(v, [string]),
        one_of_str_or_array          = v.oneOf.bind(v,[string, array_of_str]),
        array_of_array_of_str        = array.bind(v, [array_of_str]),
        array_of_array_of_str_or_num = array.bind(v, [array.bind(v, [string, number])]),
        array_of_str_or_array_of_str = v.array.bind(v, [string, array_of_str]);

    expect(array_of_array_of_str).called('foo7', [ ["ddd" ] ]).to.not.throw();

    expect(array_of_array_of_str).called('foo7',
                                         [ ["yes", "no" ],
                                           ["more", "done" ]
                                         ]).to.not.throw();

    expect(array_of_array_of_str).called('foo7',
                                         [ ["yes", "no" ],
                                           "cancel"
                                         ]).to.throw('None of validators');

    // array of array of strings or numbers
    expect(array).bind(v).called([ array.bind(v, [string])  ], 'foo8',
                                 [ ["ddd", 1234 ] ]).to.throw('must be string');

    expect(array_of_array_of_str_or_num).called('foo9',
                                                [ ["ddd", 1234 ] ]).to.not.throw();

    expect(array_of_array_of_str_or_num).called('foo9',
                                                [ ["<% foo %>", 1234 ] ]).to.not.throw();

    // it may be function that we expect return array
    expect(array_of_array_of_str_or_num).called('foo9',
                                                [ "<% foo %>" ]).to.not.throw();

    // more complex: array of (strings or array of strings)
    expect(array_of_str_or_array_of_str).called('foo10',
                                                [
                                                  [ "yes", "no", ],
                                                  [ "back"       ],
                                                  "cancel",
                                                ]).to.not.throw();

    expect(one_of_str_or_array).called('foo1', ["it1", "it2"]).to.not.throw();
    expect(one_of_str_or_array).called('foo1', []).to.not.throw();
    expect(one_of_str_or_array).called('foo1', "").to.not.throw();
    expect(one_of_str_or_array).called('foo1', true).to.throw('None of validators');

  });

  it('"object" expect value to be not array but object only', function() {
    let api = {
      foo: () => {},
    },
        v = new Validator(api),
        string = v.string.bind(v),
        number = v.number.bind(v),
        schema = {
          req_num: number,
          str: string};

    // empty schema
    expect(v.object).bind(v).called(null, /* schema */
                                    ['req_num'], /* required */
                                    'foo1', /* property name*/
                                    {} /* object */
                                    ).to.throw('schema is empty for "foo1"');

    // null object
    expect(v.object).bind(v).called(schema, /* schema */
                                    ['req_num'], /* required */
                                    'foo2', /* property name*/
                                    null /* object */
                                    ).to.throw('"foo2" must be hash object');

    // req_num field is required
    expect(v.object).bind(v).called(schema, /* schema */
                                    ['req_num'], /* required */
                                    'foo1', /* property name*/
                                    {} /* object */
                                    ).to.throw('expect to have key "req_num"');

    // good, have required and valid type
    expect(v.object).bind(v).called(schema, /* schema */
                                    ['req_num'], /* required */
                                    'foo1', /* property name*/
                                    {req_num: 123} /* object */
                                    ).to.not.throw();
    // get schema via callback
    expect(v.object).bind(v).called(() => schema, /* function get schema */
                                    ['req_num'], /* required */
                                    'foo1', /* property name*/
                                    {req_num: 123} /* object */
                                    ).to.not.throw();

    // invalid required
    expect(v.object).bind(v).called(schema, /* schema */
                                    ['req_num'], /* required */
                                    'foo1', /* property name*/
                                    {req_num: "abc"} /* object */
                                    ).to.throw('number');
    // another invalid type, str
    expect(v.object).bind(v).called(schema, /* schema */
                                    ['req_num'], /* required */
                                    'foo1', /* property name*/
                                    {
                                      req_num: 123, /* object */
                                      str: 124443 }
                                    ).to.throw('string');

    // unknown property of object
    expect(v.object).bind(v).called(schema, /* schema */
                                    ['req_num'], /* required */
                                    'foo1', /* property name*/
                                    {
                                      fail_prop1: 1, /* object */
                                      fail_prop2: 2,
                                      req_num: 123 }
                                    ).to.throw('unknown keys: ["fail_prop1", "fail_prop2"]');
  });

  it('expect nested object validate', function() {
    let v = new Validator(),
        object                       = v.object.bind(v),
        boolean                      = v.boolean.bind(v),
        number                       = v.number.bind(v),
        string                       = v.string.bind(v),
        array                        = v.array.bind(v),
        array_of_str                 = array.bind(v, [string]),
        array_of_str_or_array_of_str = v.array.bind(v, [string, array_of_str]);


    // must be before scenario_schema created,
    let scenario_schema = {};

    let scenario_validator = v.object.bind(v,
                                           () => scenario_schema,   // schema
                                           []                       // required
                                          );
    scenario_schema = {
      typing: boolean,
      Menu: array_of_str_or_array_of_str,
      Scenario: scenario_validator
    };

    // not nested
    expect(scenario_validator, 'Not nested')
      .called('foo1', /* property name*/
              {       /* oject */
                typing: false,
              }
             ).to.not.throw();

    expect(scenario_validator, 'Nested Object')
      .called('foo2', /* property name*/
              {       /* oject */
                typing: false,
                Scenario: {
                  typing: true
                }
              }
             ).to.not.throw();

    expect(scenario_validator, 'Failed validation')
      .called('foo3', /* property name*/
              {       /* oject */
                typing: false,
                Scenario: {
                  typing: "abc" // <- fail here, boolean ecpected
                }
              }
             ).to.throw('"foo3.Scenario.typing" must be boolean');

    expect(scenario_validator, 'Double nester Scenarios')
      .called('foo3', /* property name*/
              {       /* oject */
                typing: false,
                Scenario: {
                  Scenario: {
                    Menu: [
                      ['Start', 'End'],
                      "fooo"
                    ],
                  },
                  typing: false
                }
              }
             ).to.not.throw();
  });
});

describe('Scenario class', function(){
  // it('should fail when asserting false', function(){
  //   false.should.equal(true);
  // })
  describe('Internal shema validator' ,function() {
    it('Constructor', function() {
      expect(() => { new Scenario(); })
        .to.not.throw();
    });

    it('setApi()', function() {
      expect(() => {
        var s = new Scenario();
        s.setApi({ foo: 1});
        s.validate({
          typing: "<% foo %>"
        });
      })
        .to.not.throw();
    });

    it('setScenario() should set propert .scenario', function() {
      expect(() => {
        var scenario_templ = {
          typing: true
        };
        var s = new Scenario();
        s.setScenario(scenario_templ);

        s._scenario.should.to.be.equal(scenario_templ);
      })
        .to.not.throw();
    });

    it('validate method', function() {
      expect(() => {
        var s = new Scenario();
        s.validate({
          typing: true
        });
      })
        .to.not.throw();
    });

    it('Basic schema', function(){
      let scenario1 = {
        typing: true,
      };

      expect(() => { new Scenario({}, scenario1); })
        .to.not.throw();

      let scenario2 = {
        fail: true
      };

      expect(() => { new Scenario({}, scenario2); })
        .to.throw('object use unknown keys: ["fail"]');
    });

    it('Scenario. "commands"', function() {
      let scenario1 = {
        typing: true,
        commands: {
          "/help": {
            typing: true
          }
        }
      };

      expect(() => { new Scenario({}, scenario1); })
        .to.not.throw();

      let scenario2= {
        typing: true,
        commands: {
          "/help": {
            typing: 123 // <- fail here
          }
        }
      };

      expect(() => { new Scenario({}, scenario2); })
        .to.throw('"scenario.commands."/help".typing" must be boolean or function');
    });
  });

});
