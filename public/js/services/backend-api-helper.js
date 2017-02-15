/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
    var app = angular.module('app').service('backendApiHelper', function($rootScope, server, $log) {

        var self = function(controller, item) {
            var instance = {};

            function checkKey(fieldName) {
                return '_' + fieldName + 'NotChecked';
            }

            function checkValue(n) {
                return item[checkKey(n)]; //example _codeChecked
            }
            instance.notChecked = function(fieldName) {
                item[checkKey(fieldName)] = checkValue(fieldName) == undefined ? true : checkValue(fieldName);
                var rta = item[checkKey(fieldName)];
                if (rta == false) {
                    item[checkKey(fieldName)] = true; //toggle function;
                }
                return rta;
            };
            instance.checkExists = function(fieldName) {
                return $U.MyPromise((resolve, reject, emit) => {
                    var payload = {};
                    payload[fieldName] = item[fieldName];
                    return controller.exists(payload).then(res => {
                        if (res && res.ok && res.result) {
                            return emit('duplicate');
                        }
                        else {
                            item[checkKey(fieldName)] = false;
                            emit('ok');
                        }
                    });
                });
            };
            instance.isEdit = () => item._id;
            instance.isNew = () => !item._id;
            return instance;
        };
        return self;

    });
})();
