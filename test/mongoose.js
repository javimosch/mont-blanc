var chai = require('chai');
var expect = chai.expect;
var path = require('path');
require('dotenv').config({
  path: path.join(process.cwd(), '.env')
});
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var logger = resolver.loggerFacade({
  name: "MOCHA",
  category: "MONGOOSE"
});

describe('Mongoose connection', function() {
  before("Open connection", function(done) {
    resolver.co(function*() {
      yield require(path.join(process.cwd(), 'model/db')).configure();
      done();
    });
  });
  after('Close connection', function() {
    resolver.db().disconnect();
  });
  it('Can fetch an user account from database', function(done) {
    resolver.co(function*() {
      var doc = yield resolver.ctrl('User').model.findOne();
      expect(doc).to.be.an('object');
    }).then(done).catch(logger.errorTerminal);
  });
});
