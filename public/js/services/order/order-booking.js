(function() {
    /*global angular*/
    /*global _*/
    /*global $U*/
    /*global moment*/
    angular.module('app').service('orderBooking', function(localSession, $log, orderPrice, backendApi, appSettings, $rootScope, orderHelper, appRouter) {
        var self = {};
        $U.expose('ob', self);


        var bookingDetails = orderHelper.getFromSession();

        self.getData = () => {
            return bookingDetails;
        };


        self.navigate = (url, bookingDetails, params) => {
            //function changeRoutePreserveBookingDetails(url, bookingDetails, delay, params) {
            //$log.info('navigate to ', url);
            self.resume();
            appRouter.params(params);
            orderHelper.setBookingDetails(bookingDetails);
            $rootScope.route(url, undefined);
        }


        self.saveCardsSettings = (cards) => {
            localSession.setMetadata({
                bookingCards: cards
            });
        }
        self.applyCardsSettingsCache = (cards) => {
            var m = localSession.getMetadata();
            if (m && m.bookingCards) {
                for (var x in m.bookingCards) {
                    cards[x] = m.bookingCards[x];
                }
            }
        };

        self.inProgress = () => {
            var p = appRouter.params();
            var rta = p && p.bookingInProgress === true;
            $log.log('Booking: inProgress', rta);
            return rta;
        };

        self.resume = () => {
            appRouter.params({
                bookingInProgress: true
            });
        };
        self.reset = () => {
            appRouter.params({
                bookingInProgress: false
            });
            localSession.setMetadata({
                bookingDetails: {},
                bookingCards:{}
            });
        };
        self.pause = () => {
            appRouter.params({
                bookingInProgress: false
            });
        };
        return self;
    });
})();
