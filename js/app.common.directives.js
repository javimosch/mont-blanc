var app = angular.module('app.common.directives', []);

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
            type: "@type"
        },
        restrict: 'AE',
        replace: true,
        templateUrl: './views/directives/directive.alert.html',
        link: function(scope, elem, attrs) {
            $timeout(function() {
                scope.$apply(function() {
                    elem.addClass(scope.type || 'alert-danger');
                });
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
            //console.info('directive:my-alerts:log-add:', s.add);
            s.add = function(message, type,timeout) {
                var msg = s.decodeMessage(message);
                if (s.el) {
                    s.el.alert('close');
                }
                var el = $compile("<my-alert message='" + msg + "' type='alert-" + (type || 'danger') + "'/>")(s);
                s.el = el;
                elem.append(el);

                if(timeout){
                    r.dom(function(){
                        elem.html('');
                    },timeout);
                }
            };
            console.log('myAlerts attached');
        }
    };
});


app.directive('modalConfirm', function($rootScope, $timeout, $compile,$uibModal) {
    return {
        restrict: 'AE',
        replace: true,
        scope: {
            open: '=open'
        },
        template: '<output></output>',
        link: function(s, elem, attrs) {
            console.info('directive:modalSure:link:start');
            s.open = function(message,okCallback) {
                var modalInstance = $uibModal.open({
                    animation: true,
                    templateUrl: 'views/directives/directive.modal.sure.html',
                    controller: function($scope,$uibModalInstance) {
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
            console.log('directive:modalSure:attached');
        }
    };
});
