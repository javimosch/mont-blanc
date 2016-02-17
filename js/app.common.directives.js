var app = angular.module('app.common.directives', []);

app.directive('address', function($rootScope, $timeout) {
    return {
        scope: {
            model: "=model",
            field: "@field",
            change: "=change"
        },
        restrict: 'AE',
        link: function(scope, elem, attrs) {
            $timeout(function() {
                elem.geocomplete().bind("geocode:result", function(event, result) {
                    scope.model[scope.field] = result.formatted_address;
                    scope.change && scope.change(result.formatted_address);
                });
                function read() {
                    $timeout(function() {
                        if (scope.model[scope.field] !== '') {
                            elem.geocomplete("find", scope.model[scope.field]);
                        }
                        scope.$apply();
                    });
                }
                read();
                scope.$watch('model.'+scope.field, read);
                scope.$apply();
            });
        }
    };
});


app.directive('debug', function($rootScope, $timeout, server, $compile) {
    return {
        scope: {
            show: "=show"
        },
        restrict: 'AE',
        replace: true,
        template: '<div><i ng-show="show" ng-click="click()" class="link fa fa-bug fa-lg fixed left-1 bottom-1"><input type="checkbox" ng-click="stop()" ng-model="check"></i><span data-output></span></div>',
        link: function(s, elem, attrs) {
            var r = $rootScope;
            s.check = false;
            s.opt = {
                onClose : () => {
                    r.logger.clearErrors();
                }
            };

            s.stop = () => window.event.stopPropagation();
            s.click = () => {
                var log = r.logger.pending();
                if (log) {
                    s.create(log, 'info');
                }

                var err = r.logger.errors();
                if (err) {
                    s.create(err, 'danger');
                }

            };



            s.$watch('check', (v) => {
                if (v) {
                    if (s.checking) clearInterval(s.checking);
                    s.checking = setInterval(() => {
                        if (r.logger.hasErrors()) {
                            r.dom(() => {
                                if (elem.find('[data-output] .alert-danger').length === 0) {
                                    s.create(r.logger.errors(), 'danger');
                                }
                            });
                        }
                    }, 1000);
                    window.onerror = (err) => {
                        s.create(err, 'danger');
                    };
                } else {
                    if (s.checking) clearInterval(s.checking);
                    window.onerror = (err) => {};
                }
            });



            s.create = (msg, type) => {
                //msg = JSON.stringify(msg);
                s.msgs = s.msgs || {};
                var cls = "fixed overlay limit-h-200 fullwidth " + ((type === 'danger') ? 'bottom-1' : 'top-1');
                var el = $compile("<my-alert opt='opt' message='" + msg + "' type='alert-" + (type || 'danger') + "' cls='" + cls + "' />")(s);
                if (s.msgs[type] !== undefined) {
                    s.msgs[type].alert('close')
                }
                s.msgs[type] = el;
                r.dom(() => {
                    elem.find('[data-output]').append(el);
                });
            }
            if (server.URL.indexOf('localhost')) {
                s.show = true;
                r.dom();
            }
            console.log('directive.debug.linked');
        }
    };
});
app.directive('spinner', function($rootScope, $timeout) {
    return {
        scope: {
            show: "=show"
        },
        restrict: 'AE',
        replace: true,
        templateUrl: './views/directives/directive.spinner.html',
        link: function(scope, elem, attrs) {
            console.log('directive.spinner.linked');
        }
    };
});

app.directive('checkBox', function($rootScope, $timeout) {
    return {
        scope: {
            val: "=val",
            arr: "=push"
        },
        restrict: 'AE',
        replace: true,
        template: "<input type='checkbox'/>",
        link: function(scope, elem, attrs) {
            $timeout(function() {
                scope.$apply(function() {
                    elem.value = scope.val;
                    elem.on('change', function() {
                        var checked = elem.get(0).checked;
                        if (checked) {
                            scope.arr = scope.arr || [];
                            scope.arr.push(scope.val);
                        } else {
                            _.remove(scope.arr, function(e) {
                                return e === scope.val;
                            });
                        }
                        console.log(scope.arr);
                    });
                });
            });

        }
    };
});

app.directive('myAlert', function($rootScope, $timeout) {
    return {
        scope: {
            message: "@message",
            type: "@type",
            cls: "@cls",
            scroll: "=scroll",
            opt: "=opt"
        },
        restrict: 'AE',
        replace: true,
        templateUrl: './views/directives/directive.alert.html',
        link: function(scope, elem, attrs) {
            $timeout(function() {
                scope.$apply(function() {
                    elem.addClass(scope.type || 'alert-danger');
                    if (scope.cls) {
                        elem.addClass(scope.cls);
                    }
                });
            });
            scope.dismiss = () => {
                elem.alert('close');
                if (scope.opt.onClose) {
                    scope.opt.onClose();
                }
            };
            scope.$watch('message', (v) => {
                elem.find('[data-message]').html(v);
                if (v && scope.scroll) {
                    r.dom(() => {
                        $('html, body').animate({
                            scrollTop: elem.offset().top
                        }, 500);
                    });
                }
            });

        }
    };
});

app.directive('myAlerts', function($rootScope, $timeout, $compile) {
    return {
        restrict: 'AE',
        replace: true,
        scope: {
            add: '=add'
        },
        template: '<output></output>',
        link: function(s, elem, attrs) {
            s.decodeMessage = function(msg) {
                if (typeof msg == 'string') {
                    return msg;
                } else {
                    return JSON.stringify(msg);
                }
            };
            console.info('directive:my-alerts:log-add:', s.add);
            s.add = function(message, type, timeout, scroll) {
                var msg = s.decodeMessage(message);
                if (s.el) {
                    s.el.alert('close');
                }
                var el = $compile("<my-alert scroll='" + scroll + "' message='" + msg + "' type='alert-" + (type || 'danger') + "'/>")(s);
                s.el = el;
                elem.append(el);

                if (timeout) {
                    r.dom(function() {
                        elem.html('');
                    }, timeout);
                }
            };
            console.log('directive:my-alerts:linked');
        }
    };
});


app.directive('modalConfirm', function($rootScope, $timeout, $compile, $uibModal) {
    return {
        restrict: 'AE',
        replace: true,
        scope: {
            open: '=open'
        },
        template: '<output></output>',
        link: function(s, elem, attrs) {
            console.info('directive:modalSure:link:start');
            s.open = function(message, okCallback) {
                var modalInstance = $uibModal.open({
                    animation: true,
                    templateUrl: 'views/directives/directive.modal.sure.html',
                    controller: function($scope, $uibModalInstance) {
                        $scope.message = message;
                        $scope.yes = function() {
                            $uibModalInstance.close();
                            okCallback();
                        };
                        $scope.cancel = function() {
                            $uibModalInstance.dismiss('cancel');
                        };
                    },
                    //size: '',
                    //resolve: {}
                });
            };
            console.log('directive:modalSure:linked');
        }
    };
});

app.directive('dynamicTable', function(
    $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, $compile) {
    return {
        restrict: 'AE',
        replace: true,
        scope: {
            model: "=model"
        },
        templateUrl: 'views/partials/partials.table.html',
        link: function(s, elem, attrs) {
            var r = $rootScope;
            var n = attrs.name;
            if (!s.model) {
                console.error('directive.table: no model present');
                return
            }
            s.click = (item, index) => {
                if (s.model.click) {
                    s.model.click(item, index);
                }
            };
            s.buttons = s.model.buttons || null;
            s.columns = s.model.columns || [];
            s.items = s.model.items || [];
            s.model.update = (items) => {
                s.items = items;
                r.dom();
                console.log('directive.dynamic-table.set:' + items.length);
            };
            console.log('directive.dynamic-table.linked');
        }
    };
});

app.directive('timeRange', function($rootScope, $timeout, $compile, $uibModal) {
    return {
        restrict: 'AE',
        replace: true,
        scope: {
            open: '=open'
        },
        template: '<output></output>',
        link: function(s, elem, attrs) {
            s.open = function(opt) {
                var modalInstance = $uibModal.open({
                    animation: true,
                    templateUrl: 'views/directives/directive.modal.timeRange.html',
                    controller: function($scope, $uibModalInstance) {
                        var s = $scope;
                        s.title = opt.title;

                        if (!s.title) {
                            s.title = "Time Range";
                            if (opt.action && opt.action === 'edit') {
                                s.title += ' - Edition';
                            } else {
                                s.title = 'New ' + s.title;
                            }
                        }
                        s.days = (() => {
                            var o = {
                                label: 'Day',
                                selected: '',
                                items: [],
                                val: null,
                                select: (val) => {
                                    o.items.forEach((v) => {
                                        if (v.val.toString() == val.toString()) {
                                            o.click(v);
                                        }
                                    });
                                },
                                click: (v) => {
                                    o.selected = v.label || v;
                                    o.val = v.val;
                                    if (s.start.val) {
                                        s.start.val = moment(s.start.val);
                                        s.start.val.day((o.val.toString() === '-1') ? 1 : o.val);
                                    }
                                    if (s.end.val) {
                                        s.end.val = moment(s.end.val);
                                        s.end.val.day((o.val.toString() === '-1') ? 1 : o.val);
                                    }
                                }
                            };
                            var m = moment();
                            o.items.push({
                                label: "(Choice a day)",
                                val: ''
                            }, {
                                label: "Every day",
                                val: '-1'
                            });
                            for (var x = 1; x <= 7; x++) {
                                m.day(x);
                                o.items.push({
                                    label: m.format('dddd'),
                                    val: x
                                });
                            }
                            o.selected = o.items[0].label;
                            return o;
                        })();
                        var timePickerData = (() => {
                            return (m) => {
                                return {
                                    hstep: 1,
                                    mstep: 10,
                                    repeat: '',
                                    minDate: moment().date(1),
                                    val: m || moment().hour(9).minutes(0)
                                };
                            };
                        })();
                        s.start = timePickerData(opt.start);
                        s.end = timePickerData(opt.end);
                        s.repeat = 'none';
                        s.$watch('repeat', (v) => {
                            if (v === 'day') s.days.select(-1);
                        })
                        s.validate = () => {

                            if (!s.description) {
                                //s.message('Description required', 'warning', 2000);
                                //return false;
                            }
                            if (!s.days.val) {
                                s.message('Choice a day', 'warning', 2000);
                                return false;
                            }
                            if (s.repeat !== 'day' && s.days.val.toString() === '-1') {
                                s.message('Choice a day', 'warning', 2000);
                                return false;
                            }
                            try {
                                var _d = moment(s.start.val);
                                _d = moment(s.end.val);
                            } catch (e) {
                                s.message('Invalid time', 'warning', 2000);
                                return false;
                            }
                            return true;
                        };
                        s.save = function() {
                            if (!s.validate()) return;
                            $uibModalInstance.close();
                            var rta = {
                                description: s.description || '',
                                start: s.start.val,
                                end: s.end.val,
                                type: opt.type,
                                repeat: s.repeat
                            };
                            if (opt.action == 'edit') {
                                rta._user = opt.item._user;
                                rta._id = opt.item._id;
                            }
                            opt.callback(rta);
                        };
                        s.cancel = function() {
                            $uibModalInstance.dismiss('cancel');
                        };
                        if (!opt.action) {
                            throw Error('directive timeRange open require arg.action');
                        }
                        if (opt.action == 'new') {

                        }
                        if (opt.action === 'edit') {
                            var start = moment(opt.item.start);
                            s.repeat = opt.item.repeat;
                            s.description = opt.item.description;
                            s.start.val = opt.item.start;
                            s.end.val = opt.item.end;
                            opt.type = opt.item.type;
                            s.days.val = start.day();
                            s.days.select(s.days.val);
                            if (s.repeat == 'day') {
                                s.days.val = -1;
                            }
                        }
                    }
                });
            };
            console.log('directive:timeRange:linked');
        }
    };
});
