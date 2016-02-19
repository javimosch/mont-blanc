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
        

        var waitForProperties=(cb,props)=>{
            var i =  setInterval(function(){
                var rta = true;
                props.forEach((v)=>{
                    if(_.isUndefined(s[v])){
                        rta = false;
                    }
                }) ;
                if(rta){
                    clearInterval(i);
                    cb();
                }
            },200);
        };

        db.localData().then(function(data) {
            Object.assign(s, data);
            
            updateChecksVisibilityOnDemand();

            waitForProperties(loadDefaults,['notify']);
            
        });


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

        var param = (n, validate) => {
            var val = (getParameterByName(n) || '').toString();
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
        var paramDate = (n) => {
            var v = (getParameterByName(n) || '').toString()
            if (isFinite(new Date(v))) {
                return new Date(v);
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

        s.model = {
            diags: {}
        };


        function updateChecksVisibilityOnDemand() {
            var toggle = (n, val) => {
                s.diags.forEach((diag) => {
                    if ((n && diag.name == n) || !n) {
                        diag.show = val;
                    }
                });
            };
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
                date: paramDate('date')
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
            db.getAvailableRanges(date).then(function(data) {
                //                console.info('availableTimeRanges:', data);
                s.availableTimeRanges = data;

                //fill _diag with a random _diag for now
                db.custom('user', 'get', {
                    userType: 'diag'
                }).then(function(res) {
                    s.availableTimeRanges.forEach(function(v, k) {
                        v._diag = res.data.result._id;
                    });
                    console.log('FIX: ranges filled with _diag=', res.data.result._id);
                });

            });
        });
        s.down = function() {
            console.info('FP:DOWN');
            $.fn.fullpage.moveSectionDown();
        };
        s.up = function() {
            $.fn.fullpage.moveSectionUp();
        };
        s.selectedDate = function() {
            return moment(s.model.date).format('MMMM Do YYYY, dddd');
        };
        s.drawRange = function(rng) {
            return moment(rng.diagStart).format("HH:mm") + 'h - ' + moment(rng.diagEnd).format("HH:mm") + 'h';
        };

        s.onModelChange = function(a, b, c) {
            //            console.info(s.model);
        };
        s.$watch('model', s.onModelChange, true);


        //----------------------------------------------------------
        /*
        //DEFAULTS
        s.model = Object.assign(s.model, {
            sell: true,
            house: true,
            squareMeters: "-40m2",
            constructionPermissionDate: "avant le 01/01/1949",
            address: '15 Boulevard Voltaire, París, Francia',
            gasInstallation: "Oui, Moins de 15 ans",
            date: new Date()
        });
*/
        //-------
        s.diags = DIAGS;
        s.diags.forEach(function(val, key) {
            s.model.diags[val.name] = (val.mandatory) ? true : false;
        });


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
                    showModal('Email Sended');
                    console.info('ORDER:SAVE:SUCCESS', res.data);
                } else {
                    if (_.includes(res.data.result), ['diagFrom', 'diagTo', 'inspectorId']) {
                        showModal('You need to choice an available time for inspection.');
                        s.up();
                    }
                    console.info('ORDER:SAVE:ISSUES', res.data);
                }
                s.sendingEmail = false;
            }).error(function(res) {
                s.sendingEmail = false;
                console.warn('ORDER:SAVE:ERROR', res);
            });
        };

        s.totalPrice = function() {
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
            s.model.price = total;
            return total;
        };
        s.pickTimeRange = function(timeRange) {
            s.model.diagStart = timeRange.diagStart;
            s.model._diag = timeRange._diag;
            s.model.diagEnd = timeRange.diagEnd;
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
            s.model.time = hours + ':' + minutes;
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



var DIAGS = [{
    label: "DPE - Diagnostic Performance Energétique",
    name: 'dpe',
    mandatory: true,
    comments: 'Mandatory',
    time: 20,
    price: 15
}, {
    label: "Diagnostic amiante avant vente",
    name: 'dta',
    comments: 'Before 01/07/1997',
    time: 30,
    price: 25
}, {
    label: "Diagnostic Plomb",
    name: 'crep',
    comments: 'Before 01/01/1949',
    time: 60,
    price: 40
}, {
    label: 'Diagnostic loi Carrez',
    name: 'loiCarrez',
    mandatory: true,
    comments: 'Mandatory',
    time: 30,
    price: 25
}, {
    label: 'Diagnostic ERNT - ERNMT',
    name: 'ernt',
    mandatory: true,
    comments: 'Mandatory',
    time: 15,
    price: 30
}, {
    label: 'Diagnostic Termites',
    name: 'termites',
    mandatory: false,
    comments: 'depends on postcode 2 first figures : http://www.developpement-durable.gouv.fr/IMG/pdf/Dpts_termites_2015.pdf',
    time: 25,
    price: 75
}, {
    label: 'Diagnostic Gaz',
    name: 'gaz',
    mandatory: false,
    comments: 'IF Oui, plus de 15 ans',
    time: 30,
    price: 50
}, {
    label: 'Diagnostic Electricité',
    name: 'electricity',
    mandatory: false,
    comments: 'IF Oui, plus de 15 ans',
    time: 10,
    price: 30
}, {
    label: 'Diagnostic Etat Parasitaire',
    name: 'parasitaire',
    mandatory: false,
    comments: 'Always optional',
    time: 45,
    price: 60
}];