var path = require('path');

var mongoose = require(path.join(process.cwd(),'model/db')).mongoose;
var ctrl = require(path.join(process.cwd(),'model/db.controller')).create;

var chai = require('chai');
var expect = chai.expect;

describe('Mongoose connection', function () {
  

  beforeEach(function (done) {
    done();
  });

  it('Can fetch text items from database', function (done) {
    //expect(hbs.registerHelper).to.be.a('function');
    
    var text = ctrl('Text');
    
    expect(text).to.be.an('object');
    
    text.getAll(function(err,res){
      expect(err).to.be.an('undefined');
      expect(res).to.be.an('array');
    });

    done();
  });

/*
  it('Can register a classic helper', function (done) {
    hbs.registerHelper('classicHelper', function (arg1, options) {
      return arg1.toUpperCase() + '-' + options.hash.arg2;
    });

    var tpl = hbs.compile('{{classicHelper "value" arg2="value2"}}');

    tpl(function (err, content) {
      expect(content).to.be.equal("VALUE-value2");
      done();
    });
  });

  it('Can register a async helper via registerAsyncHelper', function (done) {
    hbs.registerAsyncHelper('asyncHelper', function (arg1, options, callback) {
      process.nextTick(function () {
        return callback(null, arg1.toUpperCase() + '-' + options.hash.arg2);
      });
    });

    var tpl = hbs.compile('{{asyncHelper "value" arg2="value2"}}');

    tpl(function (err, content) {
      expect(content).to.be.equal("VALUE-value2");
      done();
    });
  });

  it('Can register a async helper via registerHelper', function (done) {
    hbs.registerHelper('asyncHelper', function (arg1, options) {
      var callback = this.async();
      process.nextTick(function () {
        return callback(null, arg1.toUpperCase() + '-' + options.hash.arg2);
      });
    });

    var tpl = hbs.compile('{{asyncHelper "value" arg2="value2"}}');

    tpl(function (err, content) {
      expect(content).to.be.equal("VALUE-value2");
      done();
    });
  });
  
  it('Can use an special context', function (done) {
    hbs.registerHelper('asyncHelper', function (arg1, options) {
      var callback = this.async();
      process.nextTick(function () {
        return callback(null, arg1.toUpperCase() + '-' + options.hash.arg2);
      });
    });

    var tpl = hbs.compile('{{asyncHelper "value" arg2="value2"}}{{PROD}}');

    tpl({
        PROD:0
    },function (err, content) {
      expect(content).to.be.equal("VALUE-value20");
      done();
    });
  });

  it('Can register a async helper with a partial', function (done) {
    hbs.registerHelper('asyncHelper', function (arg1, options) {
      var callback = this.async();
      process.nextTick(function () {
        return callback(null, arg1.toUpperCase() + '-' + options.hash.arg2);
      });
    });

    hbs.registerPartial('partials/thePartial', 'Hello Iam a partial');

    var tpl = hbs.compile('{{asyncHelper "value" arg2="value2"}}{{> "partials/thePartial"}}');

    tpl(function (err, content) {
      expect(content).to.be.equal("VALUE-value2Hello Iam a partial");
      done();
    });
  });*/

});
