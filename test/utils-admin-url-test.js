var path = require('path');
var chai = require('chai');
var expect = chai.expect;
require('dotenv').config({
    path: path.join(process.cwd(), '.env')
});
var adminUrl = require(path.join(process.cwd(), 'model/utils')).adminUrl;

describe('Backend Utils', function() {
    beforeEach(function(done) {
        done();
    });
    it('Can resolves adminUrl', function(done) {

        var loginPath = adminUrl('login', 'http://localhost:3000');
        var expected = path.join('http://localhost:3000', 'login');
        //console.log('Expected',expected,'Resolves',loginPath);
        expect(loginPath).to.equal(expected);
        done();
    });
});
