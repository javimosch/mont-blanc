(function() {
    /*global angular*/
    angular.module('app').service('diagnosticalRoutes', diagnosticalRoutes);

    function diagnosticalRoutes(snippets) {
        var self = {};
        snippets.exposeGlobal('dr', self);

        self.getBookingRoutes = () => {
            return [{
                name: "",
                description: "Welcome page, booking form (questions)"
            }, {
                name: "choix-diagnostics",
                description: "The user needs to select inspection cards and click continue"
            }, {
                name: "rendez-vous",
                description: "The user needs to select a date slot"
            }];
        };

        self.getBackofficeRoutes = () => {
            return [, {
                name: "login",
                description: "shared login view"
            }, {
                name: "dashboard",
                description: "The backoffice dashboard for client, diag or admin account"
            }, {
                name: "orders",
                description: "Admins can view and edit all orders"
            }, {
                name: "settings",
                description: "Change prices, text blocks, invoice template, view logs, notifications, etc"
            }, {
                name: "notifications",
                description: "view notifications (emails) saved to database"
            }, {
                name: "clients",
                description: "Admin can view all clients"
            }];
        };

        self.isBackofficeRoute = (routeName) => {
            var arr = self.getBackofficeRoutes();
            var rta = false;
            arr.forEach(r => {
                if (r.name == routeName) rta = true;
            });
            return rta;
        };

        self.isBookingRoute = (routeName) => {
            var arr = self.getBookingRoutes();
            var rta = false;
            arr.forEach(r => {
                if (r.name == routeName) rta = true;
            });
            return rta;
        }

        return self;
    }
})();
