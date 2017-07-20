(function() {
    /*global angular Notification*/
    angular.module('app').run(function($log) {
        function browser_support_notification() {
            return ("Notification" in window);
        }

        function request_permission() {
            if (Notification.permission === "granted") {
                $log.log('Notifications are enabled');
            }
            else if (Notification.permission !== "denied") {
                Notification.requestPermission(function(permission) {
                    if (permission === "granted") {
                        $log.log('Notifications are enabled');
                    }
                    else {
                        $log.warn('Notifications are disabled');
                    }
                });
            }
        }
        request_permission();
    });
})();
