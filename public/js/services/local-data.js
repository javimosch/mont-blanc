/*global angular*/
/*global $*/
/*global $U*/
var app = angular.module('local-data', []).service('localData', ['$rootScope', '$log', '$timeout', 'appSettings', function(r, $log, $timeout, appSettings) {
    var data = null;
    var requested = false;

    function getData(resolve) {
        if (data) {
            //$log.debug('localData', 'resolve from cache');
            return resolve(data);
        }
        else return setTimeout(() => {
            getData(resolve);
        }, 200);
    }
    var self = () => {
        return $U.MyPromise(function(resolve, error) {
            if (data) {
                //$log.debug('localData', 'resolve from cache');
                resolve(data);
            }
            else {

                if (requested) {
                    return getData(resolve);
                }
                else {
                    requested = true;
                }
                $.getJSON('./data.json', function(localData) {
                    appSettings.parseLocalData(localData).then((_data) => {
                        data = _data;
                        //$log.debug('localData', 'resolved');
                        resolve(data);
                    });
                }).fail(function(jqxhr, textStatus, error) {
                    var err = textStatus + ", " + error;
                    $log.error("localData get json error", err);
                    data = {};
                    resolve(data);
                });
            }
        });
    };
    self.initializeSettings = () => appSettings.initialize();
    self.cache = () => data;
    self().then(() => $log.debug('local-data OK'));
    $U.exposeGlobal('ld', self);
    return self;
}]);
