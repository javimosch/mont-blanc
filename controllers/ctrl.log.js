var createIfNotExist = require("create-if-not-exist");
var moment = require('moment');
var _ = require('lodash');
var fs = require('fs');
const FILE_NAME = process.cwd() + '/log.txt';
const VERBOSE_LEVEL = (process.env.VERBOSE_LEVEL || 'DEBUG').toUpperCase();
var ctrl = require('../model/db.controller').create;
module.exports = {
    createLogger: function(data, cb) {
        createIfNotExist(data.fileName || FILE_NAME, '');
        if (cb) return cb('Private action');
        const LOG_PREFIX = data.name;
        const CAT_PREFIX = data.category;
        var isAppending = false;

        var appendToFileStack = []; //First in, first out

        function processFileAppendingQueue() {
            if (appendToFileStack.length === 0) return;
            var str = appendToFileStack[0];
            appendToFileStack.splice(0, 1);
            fs.appendFile(FILE_NAME, str + '\n', function() {
                processFileAppendingQueue();
            });
        }

        function appendFile(str) {
            str = getParsedFileString(str);
            appendToFileStack.push(str);
            processFileAppendingQueue();
        }

        function getParsedFileString(str) {
            if (typeof str == 'object') {
                //str = JSON.stringify(str);
            }
            try {
                var newStr = '';
                if (str.forEach) {
                    str.forEach(string => {
                        if (typeof string == 'string') {
                            newStr += string + ' ';
                        }
                        else {
                            newStr += JSON.stringify(string) + ' ';
                        }
                    });
                    str = newStr;
                }
                else {
                    str = str.join(' ');
                }
            }
            catch (err) {
                try {
                    str = JSON.stringify(str);
                }
                catch (err) {
                    str = "OBJECT (Parse fail)";
                }
            }
            return str;
        }

        var saveData = {};

        function log(args, level, saveInDatabase, saveInFile) {
            saveInDatabase = saveInDatabase === undefined ? false : saveInDatabase;
            saveInFile = saveInFile === undefined ? true : saveInFile;

            if (VERBOSE_LEVEL == 'NONE') return;
            if (VERBOSE_LEVEL == 'WARN' && level == 'DEBUG') return;
            if (VERBOSE_LEVEL == 'ERROR' && level == 'DEBUG') return;
            if (VERBOSE_LEVEL == 'ERROR' && level == 'WARN') return;
            var originalArgs = _.clone(args);
            args.unshift("[" + level.toUpperCase() + "]");
            args.unshift((CAT_PREFIX||'') + "");
            args.unshift('' + moment().format('HH:mm DDMMYY') + "");
            args.unshift((LOG_PREFIX||'OTHER') + "");
            console.log.apply(console, args);
            if (saveInFile) {
                appendFile(args);
            }
            if (saveInDatabase) {
                originalArgs.unshift(CAT_PREFIX + "");
                ctrl('Log').save({
                    level: level.toLowerCase(),
                    type: level.toLowerCase(),
                    category: LOG_PREFIX,
                    message: originalArgs.join(' '),
                    data: saveData
                });
                saveData = {};
            }
        }
        var self = {
            debug: function() {
                log(Array.prototype.slice.call(arguments), 'DEBUG');
            },
            debugTerminal: function() {
                log(Array.prototype.slice.call(arguments), 'DEBUG', false, false);
            },
            debugSave: function() {
                log(Array.prototype.slice.call(arguments), 'DEBUG', true);
            },
            log: function() {
                log(Array.prototype.slice.call(arguments), 'DEBUG');
            },
            info: function() {
                log(Array.prototype.slice.call(arguments), 'DEBUG');
            },
            infoSave: function() {
                log(Array.prototype.slice.call(arguments), 'DEBUG', true);
            },
            warnTerminal: function() {
                log(Array.prototype.slice.call(arguments), 'WARN', false, false);
            },
            warn: function() {
                log(Array.prototype.slice.call(arguments), 'WARN');
            },
            warnSave: function() {
                log(Array.prototype.slice.call(arguments), 'WARN', true);
            },
            errorTerminal: function() {
                log(Array.prototype.slice.call(arguments), 'ERROR', false, false);
            },
            error: function() {
                log(Array.prototype.slice.call(arguments), 'ERROR');
            },
            errorSave: function() {
                log(Array.prototype.slice.call(arguments), 'ERROR', true);
            },
            setSaveData: function(data) {
                saveData = data;
                return self;
            },
            withData: function(data) {
                saveData = data;
                return self;
            }
        };
        return self;
    }
};
