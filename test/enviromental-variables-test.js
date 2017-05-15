var path = require('path');
require('dotenv').config({
    path: path.join(process.cwd(), '.env')
});
var chai = require('chai');
var expect = chai.expect;
var config = require(path.join(process.cwd(), 'model/config'))

describe('Enviromental variables', function() {
    it('Mongoose dbURI', function(done) {
        expect(config.DB_URI).not.to.be.an('undefined');
        done();
    });
});
