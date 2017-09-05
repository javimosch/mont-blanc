(function() {
    /*global angular*/
    /*global _*/
    /*global $U*/
    /*global moment*/
    angular.module('app').service('orderQueryParams', function(localSession, $log, orderPrice, backendApi, appSettings, $rootScope, orderHelper) {

        var localData = null;

        appSettings.syncAll().then(() => {
            localData = appSettings.localData;
        });

        function warn(m) {
            $rootScope.warningMessage(m, 99999);
        }
        var datepicker = {
            minDate: moment(), //.add(1, 'day'), //today is available with an increase in price.
            maxDate: moment().add(60, 'day'),
            initDate: new Date()
        };
        var diagDescription = (n) => {
            var rta = n;
            localData.diags.forEach((diag) => {
                if ((n && diag.name == n)) {
                    rta = diag.label;
                }
            });
            if (n === 'cpd') rta = 'constructionPermissionDate';
            return rta;
        }


        var param = (n, validate, isEncoded) => {
            isEncoded = isEncoded || false;
            var val = $U.getParameterByName(n);
            if (val != undefined && isEncoded) {
                val = window.atob(val);
            }
            if (!val) return undefined;
            if (!validate) {
                return val;
            }
            else {
                var vals = Object.keys(validate).map((v) => {
                    return validate[v]
                }); //valid vals
                if (vals.length > 0 && !_.includes(vals, val)) {
                    var msg = 'Parameter ' + diagDescription(n) + ' has the follow valid values:' + JSON.stringify(vals) + '. Received: "' + val + '"';
                    console.warn(msg);
                    warn(msg);
                    return undefined;
                }
                else {
                    return val;
                }
            }
        };
        var paramDate = (n) => {
            var v = ($U.getParameterByName(n) || '').toString()
            var d = new Date(v);
            if (isFinite(d)) {
                var fail = false;
                if (moment(d).isBefore(datepicker.minDate, 'day')) {
                    fail = true;
                }
                if (moment(d).isAfter(datepicker.maxDate, 'day')) {
                    fail = true;
                }
                if (fail) {
                    warn('Parameter ' + n + ' needs to be a valid date between ' + datepicker.minDate.format("DD/MM/YY") + ' and ' + datepicker.maxDate.format('DD/MM/YY'), 'warning', 0, true, {
                        duration: 99999
                    })
                    return undefined;
                }
                return d;
            }
            else {
                if ($U.getParameterByName(n) !== null) {
                    warn('Parameter ' + n + ' needs to be a valid date', 'warning', 0, true, {
                        duration: 99999
                    })
                }
            }
            return undefined;
        }
        var paramBool = (n) => {
            var v = ($U.getParameterByName(n) || '').toString()
            if (_.includes(['1', '0'], v)) {
                return v === '1';
            }
            else {
                if ($U.getParameterByName(n) !== null) {
                    warn('Parameter ' + n + ' needs to be a 1/0', 'warning', 0, true, {
                        duration: 99999
                    })
                }
                return undefined;
            }
        }
        return {
            /*
            //This feature is not used (set diag cards via query string)
            setDiags: () => {
                s.diags.forEach((diag) => {
                    var val = paramBool(diag.name);
                    if (!_.isUndefined(val) && !_.isNull(val)) {
                        s.item.diags[diag.name] = val;
                    }
                });
            },*/
            getData: (bookingData) => {
                if (!localData) {
                    $log.error('appSettings localData not available !!');
                }
                var defaults = {
                    info: {
                        buildingState: param('buildingState', {
                            '0': '0',
                            '1': '1'
                        }) || '1',
                        buildingType: param('buildingType', {
                            '0': '0',
                            '1': '1',
                            '2': '2'
                        }) || undefined,
                        squareMeters: param('squareMeters', localData.squareMeters, true) || '90 - 110m²', // '- de 20m²',
                        constructionPermissionDate: param('cpd', localData.constructionPermissionDate) || 'Entre 1949 et le 01/07/1997', // 'Entre 1949 et le 01/07/1997',
                        gasInstallation: param('gasInstallation', localData.gasInstallation) || 'Oui, Plus de 15 ans', // 'Oui, Moins de 15 ans',
                        electricityInstallation: param('electricityInstallation', localData.electricityInstallation) || bookingData.info.electricityInstallation || 'Plus de 15 ans' // 'Plus de 15 ans',
                    },
                    address: param('address') || undefined,
                    postCode: param('postCode') || undefined,
                    date: paramDate('date'),
                    time: param('time', ['any']),
                    clientType: param('clientType', orderHelper.CLIENT_TYPES)
                };
                $log.debug('Defaults are ',defaults);
                return defaults;
            }
        };

    });

})();
