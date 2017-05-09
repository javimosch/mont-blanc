(function() {
    /*global angular*/
    /*global $U*/
    angular.module('notifications-feature-module').controller('notificationEdit', ['$rootScope', '$scope', 'server', 'crud', '$routeParams', function(r, s, db, crud, params) {
        r.setCurrentCtrl(s);

        s.send = () => {
            var item = s.item;
            r.openConfirm('Confirm sending to ' + item.to + '?', () => {
                //html from to subject
                db.ctrl('Email', 'send', {
                    _user: item._user,
                    _notification: item._id,
                    html: item.contents,
                    to: item.to,
                    subject: item.subject,
                    __notificationType: item.type
                }).then(d => {
                    console.info(d);
                    r.infoMessage('Copy send to ' + item.to);
                    s.init();
                });
            });
        };

        crud.create({
            name: 'Notification',
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
                back: 'notifications'
            },
            modals: {
                confirm: r.openConfirm,
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



})();
