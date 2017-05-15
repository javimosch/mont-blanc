var chai = require('chai');
var expect = chai.expect;
var path = require('path');
require('dotenv').config({
    path: path.join(process.cwd(), '.env')
});
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var logger = resolver.loggerFacade({
    name: "MOCHA",
    category: "USERS"
});
var accountEmail = "mocha@fake.com";

describe('New admin account', function() {
    before("Open connection", function(done) {
        resolver.co(function*() {
            yield require(path.join(process.cwd(), 'model/db')).configure();
            done();
        });
    });
    after('Remove account', function(done) {
        resolver.co(function*() {
            yield resolver.ctrl('User').remove({
                email: accountEmail
            });
            resolver.db().disconnect();
        }).then(done).catch(logger.errorTerminal);
    });
    it('To Grant ADMIN_ADMIN_ACCOUNT_CREATED', function(done) {
        resolver.co(function*() {
            
            expect(resolver.db().model.user).not.to.be.an('undefined');
            expect(resolver.db().model.notification).not.to.be.an('undefined');
            
            var doc = yield resolver.db().model.user.create({
                email: accountEmail,
                password: "123",
                userType: "admin"
            });
            yield resolver.delay(1000);
            var notifications = yield resolver.db().model.notification.find({
                _user: doc._id
            });
            expect(notifications).to.be.an('array');
            expect(notifications).to.have.length(1);
        }).then(done).catch(logger.errorTerminal);
    });
});

/*
describe('User notifications', function() {

    

    before(function() {
        // runs before all tests in this block
    });

    after(function(done) {
        // runs after all tests in this block
        resolver.co(function*() {
            yield resolver.ctrl('User').remove({
                email: accountEmail
            });
        }).then(done).catch(logger.error);
    });

    beforeEach(function() {
        // runs before each test in this block
    });

    afterEach(function() {
        // runs after each test in this block
    });

    it('A new user account should have new notifications attached', function(done) {
        resolver.co(function*() {}).then(done).catch(logger.error);
    });
    it('Removing user account should remove associated notifications', function(done) {
        resolver.co(function*() {
            var doc = yield resolver.db().model.user.findOne({
                email: accountEmail
            });
            yield doc.remove();
            yield resolver.delay(1000);
            var notifications = yield resolver.db().model.notification.find({
                _user: doc._id
            });
            expect(notifications).to.be.an('array');
            expect(notifications).to.have.length(0);
        }).then(done).catch(logger.error);
    });
});
*/
