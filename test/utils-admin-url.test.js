var path = require('path');
var mongoose = require(path.join(process.cwd(), 'model/db')).mongoose;
var ctrl = require(path.join(process.cwd(), 'model/db.controller')).create;
var chai = require('chai');
var expect = chai.expect;
var adminUrl = require(path.join(process.cwd(),'model/utils')).adminUrl;

describe('Backend Utils', function() {
    beforeEach(function(done) {
        done();
    });
    it('Can resolves adminUrl', function(done) {
        var loginPath = adminUrl('login','http://localhost:3000');
        var expected = path.join('http://localhost:3000','login');
        //console.log('Expected',expected,'Resolves',loginPath);
        expect(loginPath).to.equal(expected);
        done();
    });
});
