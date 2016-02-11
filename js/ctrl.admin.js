var app = angular.module('admin', ['adminInspector']);

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
                            scope.arr.push(scope.val);
                        } else {
                            _.remove(scope.arr, function(e) {
                                return e === scope.val;
                            });
                        }
                        console.log(scope.arr)
                    })
                });
            })

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
        templateUrl: './partials/directive.alert.html',
        link: function(scope, elem, attrs) {
            $timeout(function() {
                scope.$apply(function() {
                    elem.addClass(scope.type || 'alert-danger')
                });
            })

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
            }
            s.add = function(message, type) {
                var msg = s.decodeMessage(message);
                if (s.el) {
                    s.el.alert('close');
                }
                var el = $compile("<my-alert message='" + msg + "' type='alert-" + (type || 'danger') + "'/>")(s);
                s.el = el;
                elem.append(el);
            };
            //console.log('myAlerts linked')
        }
    };
});



app.controller('admin', ['server', '$scope', '$rootScope', function(db, s, r) {
    //console.warn('ADMIN');

    r.toggleBody(true);
    var vm = this;
    vm.login = function() {
        //console.info('ADMIN:LOGIN')
        var session = r.session();
        if (session.email && session.expire < new Date().getTime()) {
            r.db.createSession(true);
        }
        if (session.email && session.expire > new Date().getTime()) {
            r.session(r._login);
            r.adminRoute(r._adminRouteDefault)
            return;
        }

        db.login(r._login).then(function(res) {
            if (res.data.logged) {
                r.session({
                    email: r._login.email,
                    pass: r._login.pass, // ? btoa(r._login.pass) : r._login.pass,
                    expire: new Date().getTime() + (1000 * 60) * 120
                });
                r.adminRoute(r._adminRouteDefault)
            } else {
                vm.addAlert(res.data.message);
            }
            console.log(res.data);
        }).error(function(res) {
            vm.addAlert(res);
        });
    };

    var session = r.session();
    if (session.email && session.expire > new Date().getTime()) {
        r.session(r._login);
        r.adminRoute(r._adminRouteDefault)
    } else {
        vm.show = true;
    }


}]);
