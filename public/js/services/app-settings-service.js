(function() {
    /*global angular*/
    /*global $U*/
    angular.module('app-settings-service', []).service('appSettings', ['$rootScope', '$log', '$timeout', 'server', function(r, $log, $timeout, server) {

        $log.debug('(init) appSettings', window.location.href.indexOf('iframe') !== -1 ? "(iframe)" : '');

        var requested = false;
        var self = {
            initialize:fetchDatabaseSettings,
            URL: window.location.origin + '/',
            databaseSettings: null,
            parseLocalData: parseLocalData,
            fetchFromRemote: () => {
                return $U.MyPromise(function(resolve, error) {
                    getDatabaseSettings(resolve);
                });
            },
            syncAll: () => {
                return $U.MyPromise(function(resolve, error) {
                    function waitLocalAndRemoteData(resolve) {
                        if (self.databaseSettings && self.localData) {
                            return resolve(self);
                        }
                        else return setTimeout(() => {
                            waitLocalAndRemoteData(resolve);
                        }, 200);
                    }
                    waitLocalAndRemoteData(resolve)
                });
            },
            localData: null
        };
        assignGlobalSettings(self);


        if (window.location.href.indexOf('iframe') == -1) { //Only if not an iframe
            fetchDatabaseSettings(); //initial and unique fetch
        }

        $U.exposeGlobal('as', self);
        return self;


        function getDatabaseSettings(resolve) {
            if (self.databaseSettings) {
                //$log.debug('appSettings databaseSettings', 'resolved');
                return resolve(self.databaseSettings);
            }
            else return setTimeout(() => {
                getDatabaseSettings(resolve);
            }, 200);
        }

        function fetchDatabaseSettings() {
            requested = true;
            server.ctrl('Settings', 'getAll', {}).then(r => {
                if (r.ok && r.result.length > 0) {
                    self.databaseSettings = r.result[0];
                }
                else {
                    self.databaseSettings = {};
                    $log.warn('Unable to fetch database settings');
                }
            });
        }



        function parseLocalData(localData) {
            return $U.MyPromise(function(resolve, error) {
                getDatabaseSettings(dbSettings => {

                    if (!dbSettings.metadata) {
                        $log.warn('appSettings databaseSettings metadata missing');
                    }
                    else {
                        if (dbSettings.metadata.prices) {
                            localData = inyectPrices(dbSettings, localData);
                        }
                        if (dbSettings.metadata.squareMetersPrice) {
                            for (var x in dbSettings.metadata.squareMetersPrice) {
                                localData.squareMetersPrice[x] = dbSettings.metadata.squareMetersPrice[x];
                            }
                        }

                    }
                    self.localData = localData;
                    return resolve(localData);
                });
            });
        }

    }]);

    function assignGlobalSettings(self) {
        if (window.__settings) {
            for (var x in window.__settings) {
                self[x] = window.__settings[x];
            }
            delete window.__settings;
        }
    }

    function inyectPrices(dbSettings, localData) {
        if (dbSettings.metadata.prices.basePrice !== undefined &&
            !isNaN(dbSettings.metadata.prices.basePrice) &&
            dbSettings.metadata.prices.basePrice !== '') {
            try {
                localData.basePrice = parseInt(dbSettings.metadata.prices.basePrice);
            }
            catch (err) {}
        }
        else {}
        Object.keys(dbSettings.metadata.prices).forEach(function(diagName) {
            for (var i in localData.diags) {
                if (localData.diags[i].name == diagName) {

                    if (dbSettings.metadata.prices[diagName] !== undefined) {
                        try {
                            localData.diags[i].price = parseInt(dbSettings.metadata.prices[diagName]);
                        }
                        catch (e) {

                        }
                    }
                }
            }
        });
        return localData;
    }


})();
