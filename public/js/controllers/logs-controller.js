/*global angular*/

angular.module('app').controller('logEdit', ['$rootScope', '$scope', 'server', 'crud', '$routeParams', function(r, s, db, crud, params) {
    r.setCurrentCtrl(s);
    crud.create({
        name: 'Log',
        routeParams: params,
        scope: s,
        defaults: {
            data: {
                message: 'Write your message'
            }
        },
        save: {
            after: {
                goBack: true
            }
        },
        routes: {
            back: 'logs'
        },
        modals: {
            confirm: 'confirm',
            delete: {
                description: () => 'Delete item ' + s.item.type + ' ' + r.momentDateTime(s.item.created)
            }
        },
        events: {
            after: {
                save: [
                    () => {
                        //console.log('saved!');
                    }
                ]
            }
        },
        validate: {
            options: (s) => {
                return [
                    [s.item.message, '==', false, 'Message required']
                ];
            }
        }
    }).init();
}]);
