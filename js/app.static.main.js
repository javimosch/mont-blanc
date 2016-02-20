var app = angular.module('app', [
    'app.common.service',
    'app.common.root',
    'app.common.directives',
    'app.static.calendar',
    'ui.bootstrap'
]);


app.controller('fullpage', ['server',
    '$timeout', '$scope', '$rootScope', '$uibModal',
    function(db, $timeout, s, r, $uibModal) {
        window.r = r;
        window.s = s;
        r.dom(); //compile directives

        s.datepicker = {
            minDate: moment().add(1, 'day'),
            maxDate: moment().add(60, 'day'),
            initDate: new Date()
        };
        s.model = {
            date: undefined,
            diags: {}
        };

        s.validModel = () => {
            var isValid = true &&
                (true && s.model.diagStart) &&
                (true && s.model.diagEnd) &&
                (true && !_.isUndefined(s.model.address)) &&
                (true && !_.isNull(s.model.address)) &&
                (true && s.model.address != '') &&
                true;
            return isValid;
        };


        var waitForProperties = (cbArray, props) => {
            var i = setInterval(function() {
                var rta = true;
                props.forEach((v) => {
                    if (_.isUndefined(s[v])) {
                        rta = false;
                    }
                });
                if (rta) {
                    clearInterval(i);
                    cbArray.forEach((cb) => {
                        cb();
                    });
                }
            }, 200);
        };

        db.localData().then(function(data) {
            Object.assign(s, data);
            updateChecksVisibilityOnDemand();
            waitForProperties([loadDefaults, scrollToAnchor, r.dom], ['notify']);
        });

        function scrollToAnchor() {
            try {
                $.fn.fullpage.moveTo($.hrefAnchor());
            } catch (e) {

            }
        }



        var diagDescription = (n) => {
            var rta = n;
            s.diags.forEach((diag) => {
                if ((n && diag.name == n)) {
                    rta = diag.label;
                }
            });
            if (n === 'cpd') rta = 'constructionPermissionDate';
            return rta;
        }
        var diag = (n) => {
            var rta = null;
            s.diags.forEach((diag) => {
                if ((n && diag.name == n)) {
                    rta = diag;
                }
            });
            return rta;
        }
        s.diagLabel = (n, v) => {
            if (!v) return;
            return diag(n).label;
        };
        s.diagPrice = (n, v) => {
            if (!v) return;
            return diag(n).price;
        };

        var param = (n, validate) => {
            var val = getParameterByName(n);
            if (!val) return undefined;
            if (!validate) {
                return val;
            } else {
                var vals = Object.keys(validate).map((v) => {
                    return validate[v]
                }); //valid vals
                if (vals.length > 0 && !_.includes(vals, val)) {
                    var msg = 'Parameter ' + diagDescription(n) + ' has the follow valid values:' + JSON.stringify(vals);
                    console.warn(msg);
                    s.notify(msg, 'warning', 0, true, { duration: 99999 })
                    return undefined;
                } else {
                    return val;
                }
            }
        };
        var paramDate = s.paramDate = (n) => {
            var v = (getParameterByName(n) || '').toString()
            var d = new Date(v);
            if (isFinite(d)) {
                var fail = false;
                if (moment(d).isBefore(s.datepicker.minDate, 'day')) {
                    fail = true;
                }
                if (moment(d).isAfter(s.datepicker.maxDate, 'day')) {
                    fail = true;
                }
                if (fail) {
                    s.notify('Parameter ' + n + ' needs to be a valid date between ' + s.datepicker.minDate.format("DD/MM/YY") + ' and ' + s.datepicker.maxDate.format('DD/MM/YY'), 'warning', 0, true, { duration: 99999 })
                    return undefined;
                }
                return d;
            } else {
                if (getParameterByName(n) !== null) {
                    s.notify('Parameter ' + n + ' needs to be a valid date', 'warning', 0, true, { duration: 99999 })
                }
            }
            return undefined;
        }
        var paramBool = (n) => {
            var v = (getParameterByName(n) || '').toString()
            if (_.includes(['1', '0'], v)) {
                return v === '1';
            } else {
                if (getParameterByName(n) !== null) {
                    s.notify('Parameter ' + n + ' needs to be a 1/0', 'warning', 0, true, { duration: 99999 })
                }
                return undefined;
            }
        }




        function updateChecksVisibilityOnDemand() {
            var toggle = (n, val) => {
                s.diags.forEach((diag) => {
                    if ((n && diag.name == n) || !n) {
                        diag.show = val;
                    }
                });
            };
            s.diags.forEach(function(val, key) {
                s.model.diags[val.name] = (val.mandatory) ? true : false;
            });
            s.$watch('model', (v) => {
                //if(v.gasInstallation==='Non') toggle('gaz',false);

                if (v.constructionPermissionDate !== 'Before le 01/01/1949') {
                    toggle('crep', true);
                } else {
                    toggle('crep', false);
                }

                if (_.includes(['Before le 01/01/1949', 'entre 1949 et le 01/07/1997'], v.constructionPermissionDate)) {
                    toggle('dta', true);
                } else {
                    toggle('dta', false);
                }

                if (v.gasInstallation === 'Oui, Plus de 15 ans') {
                    toggle('gaz', true);
                    toggle('electricity', true);
                } else {
                    toggle('gaz', false);
                    toggle('electricity', false);
                }

            }, true);
            toggle(undefined, true); //all checks visibles.
        }

        function loadDefaults() {
            s.model = Object.assign(s.model, {
                sell: paramBool('sell'),
                house: paramBool('house'),
                squareMeters: param('squareMeters', s.squareMeters) || undefined,
                apartamentType: param('apartamentType', s.apartamentType) || undefined,
                constructionPermissionDate: param('cpd', s.constructionPermissionDate) || undefined,
                address: param('address') || undefined,
                gasInstallation: param('gasInstallation', s.gasInstallation) || undefined,
                date: paramDate('date'),
                time: param('time', ['any'])
            });

            s.diags.forEach((diag) => {
                var val = paramBool(diag.name);
                if (!_.isUndefined(val) && !_.isNull(val)) {
                    s.model.diags[diag.name] = val;
                }
            });
        }





        //----------------------------------------------------------
        s.$watch('model.date', function(date) {

            if (!isFinite(new Date(date))) return; //invalid

            var time = s.totalTime();
            var order = {
                day: date,
                time: time
            };

            db.getAvailableRanges(order).then(function(data) {
                //                console.info('availableTimeRanges:', data);
                s.availableTimeRanges = data.length > 0 && data || null;

                if (s.model.time == 'any') {
                    if (s.availableTimeRanges && s.availableTimeRanges.length > 0) {
                        s.pickTimeRange(s.availableTimeRanges[0]);
                    }
                }

                /*
                //fill _diag with a random _diag for now
                db.custom('user', 'get', {
                    userType: 'diag'
                }).then(function(res) {
                    s.availableTimeRanges.forEach(function(v, k) {
                        v._diag = res.data.result._id;
                    });
                    console.log('FIX: ranges filled with _diag=', res.data.result._id);
                });
*/

            });
        });
        s.moveTo = (n) => { $.fn.fullpage.moveTo(n); };
        s.down = function() {
            $.fn.fullpage.moveSectionDown();
        };
        s.up = function() {
            $.fn.fullpage.moveSectionUp();
        };
        s.selectedDate = function() {
            return moment(s.model.date).format('MMMM Do YYYY, dddd');
        };
        s.drawRange = function(rng) {
            return moment(rng.start).format("HH:mm") + 'h - ' + moment(rng.end).format("HH:mm") + 'h';
        };

        s.onModelChange = function(a, b, c) {
            //            console.info(s.model);
        };
        s.$watch('model', s.onModelChange, true);


        //----------------------------------------------------------



        function showModal(message, okCallback) {
            var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'views/directives/directive.modal.ok.html',
                controller: function($scope, $uibModalInstance) {
                    $scope.message = message;
                    $scope.yes = function() {
                        $uibModalInstance.close();
                        if (okCallback) {
                            okCallback();
                        }
                    };
                },
                //size: '',
                //resolve: {}
            });
            confirm
        }

        s.confirm = function() {
            s.sendingEmail = true;

            //downloadJSON('order.model.json',s.model);
            //console.info(ToStringParameters(s.model));
            //return;

            db.custom('order', 'saveWithEmail', s.model).then(function(res) {
                if (res.data.ok) {
                    showModal('Detailed information was send to ' + s.model.email);
                    console.info('ORDER:SAVE:SUCCESS', res.data);
                } else {

                    if (res.data.err === 'ORDER_EXISTS') {
                        showModal('An order with same address / start/ end is alredy associated to ' + s.model.email);
                    } else {

                        if (_.includes(res.data.result), ['diagFrom', 'diagTo', 'inspectorId']) {
                            showModal('You need to choice an available time for inspection.');
                            s.up();
                        }

                    }
                    console.info('ORDER:SAVE:ISSUES', res.data);
                }
                s.sendingEmail = false;
            }).error(function(res) {
                s.sendingEmail = false;
                console.warn('ORDER:SAVE:ERROR', res);
            });
        };


        s.getDate = () => {
            return {
                date: moment(s.model.diagStart).format('DD-MM-YY'),
                start: moment(s.model.diagStart).format('HH:mm'),
                end: moment(s.model.diagEnd).format('HH:mm')
            };
        };
        s.subTotal = function() {
            var total = 0;
            s.model.diags = s.model.diags || {};
            Object.keys(s.model.diags).forEach(function(mkey) {
                if (!s.model.diags[mkey]) return;
                s.diags.forEach(function(dval, dkey) {
                    if (!dval.show) {
                        return;
                    }
                    if (dval.name == mkey) {
                        total += dval.price || 0;
                        return false;
                    }
                });
            });
            return s.basePrice + total;
        };
        s.sizePrice = () => {
            var rta = s.subTotal();
            if (s.model.house && s.model.squareMeters) {
                var porcent = s.squareMetersPrice[s.model.squareMeters];
                if (parseInt(porcent) === 0) {
                    rta = 0;
                } else {
                    rta = (rta * parseInt(porcent)) / 100;
                }
            }
            return rta;
        }
        s.totalPrice = (showRounded) => {
            var tot = s.subTotal() + s.sizePrice();

            var realTot = parseInt(parseInt(tot) / 10, 10) * 10;
            s.model.price = realTot;

            return showRounded ? realTot : tot;
        };
        s.pickTimeRange = function(timeRange) {
            s.model.diagStart = timeRange.start;
            s.model._diag = timeRange._diag;
            s.model.diagEnd = timeRange.end;
        };

        s.totalTime = function() {
            var total = 0;
            s.model.diags = s.model.diags || {};
            Object.keys(s.model.diags).forEach(function(mkey) {
                if (!s.model.diags[mkey]) return;
                s.diags.forEach(function(dval, dkey) {
                    if (dval.name == mkey) {
                        total += dval.time || 0;
                        return false;
                    }
                });
            });
            var hours = Math.floor(total / 60);
            var minutes = total % 60;
            var t = {
                hours: hours,
                minutes: minutes
            };
            return normalizeOrderTime(t);
        };
        s.totalTime.formatted = () => {
            var time = s.totalTime();
            var hours = time.hours,
                minutes = time.minutes;
            minutes = (minutes < 10) ? '0' + minutes : minutes;
            if (hours > 0) {
                return hours + ':' + minutes + ' hours';
            } else {
                return minutes + ' minutes';
            }
        };

    }

]);

app.directive('modal', function($rootScope, $timeout, $compile) {
    return {
        scope: true,
        replace: true,
        restrict: 'AE',
        templateUrl: "./views/directives/directive.modal.html",
        link: function(scope, elem, attrs) {
            if (!r.__modalModel) {
                r.__modalModel = {
                    content: '',
                    show: false
                };
                r.showModal = (msg) => {
                    r.__modalModel.content = msg;
                    toggle(true);
                };
                r.showModalUsingTemplate = (templateUrl) => {
                    $('output').load(templateUrl, function(html) {
                        setHtml(html);
                    });
                };
                window.r = r;
            }
            scope.model = r.__modalModel;
            //
            function setHtml(html) {
                $timeout(() => {
                    var el = $compile(html)($rootScope);
                    elem.find('.modal-content').html('').append(el);
                    scope.$apply();
                });
            }

            function toggle(_show) {
                $timeout(function() {
                    scope.$apply(function() {
                        elem.modal({
                            show: _show
                        });
                    });
                });
            }
            toggle(scope.model.show || false);
        }
    };
});
