(function() {
    /*global angular*/
    /*global _*/
    /*global $U*/
    /*global moment*/
    angular.module('app').controller('rdv-controller', ['server',
        '$timeout', '$scope', '$rootScope', 'rdvSlotService', 'orderPrice', '$log', 'orderPaymentForm', 'orderQuestion', 'appText', 'appRouter', 'localData', 'appSettings', 'orderHelper', 'localSession', 'backendApi', 'Analytics',
        function(db, $timeout, $scope, $rootScope, rdvSlotService, orderPrice, $log, orderPaymentForm, orderQuestion, appText, appRouter, localData, appSettings, orderHelper, localSession, backendApi, Analytics) {


            (function() {
                var session = localSession.getData();
                if (session._id && session.userType === 'admin' && Analytics.userId && Analytics.userId == session._id) {
                    Analytics.unsetUser();
                }
            })();


            //Expose controller for debugging
            $U.exposeGlobal('rc', $scope);

            //Fetch booking details from cache
            $scope.item = orderHelper.getBookingDetails();

            //Expose slots to view
            $scope.diagSlots = rdvSlotService($scope, $scope.item);


            appSettings.syncAll().then(() => {
                Object.assign($scope, appSettings.localData); //patch scope with local data
                $scope.settings = appSettings.databaseSettings; //patch scope with remote settings

                //$log.debug('rdv slots start with booking data',_.clone($scope.item));

                //Initialize slots
                $scope.diagSlots.init(undefined, {
                    daysPerPage: 8, //$(window).width()>1200?8:4,
                    department: $scope.item && $scope.item.postCode && $scope.item.postCode.substring(0, 2)
                });
            });




            function changeRoute(url, delay) {
                //Before we jump into a new view, we save the booking data
                orderHelper.setBookingDetails($scope.item);
                $rootScope.route(url, delay);
            }


            //Class dom helper
            $scope.dateSlotSelected = function(rng) {
                return ($scope.item.range && ($scope.item.range == rng.id));
            }

            //Continue button
            $scope.proceedToPayment = function(range) {
                $scope.item.range = range.id;
                $scope.item._diag = range._diag;
                $scope.item.start = range.start;
                $scope.item.end = range.end;

                db.ctrl('User', 'get', {
                    _id: $scope.item._diag,
                    __select: "firstName lastName email"
                }).then(res => {
                    $scope.item.__diag = res.result;

                    setTimeout(function() {
                        validateDate($scope.item, function() {

                            Analytics.trackEvent('booking_rdv_next_button', {
                                address: $scope.item.address,
                                diagId: $scope.item.__diag._id,
                                diagFirstName: $scope.item.__diag.firstName,
                                diagLastName: $scope.item.__diag.lastName,
                                diagEmail: $scope.item.__diag.email,
                                start: moment($scope.item.start).format("DD/MM/YYYY hh[h]mm"),
                                end: moment($scope.item.end).format("DD/MM/YYYY hh[h]mm")
                            });

                            changeRoute($rootScope.URL.PAYMENT);
                        });
                    }, 500);
                });


            };

            //Slot content
            $scope.drawRange = function(rng) {
                var rta = moment(rng.start).format("HH[h]mm");
                rta += ' - ' + Math.floor(rng.price) + ' €';
                return rta;
            };


            function validateDate(data, cb, err) {
                $U.ifThenMessage([
                    [data.start, '==', undefined, ""],
                    [data.end, '==', undefined, ""],
                    [data._diag, '==', undefined, ""],
                ], (m) => {
                    $rootScope.warningMessage(appText.BOOKING_VALIDATE_ORDER_DATE);
                    if (err) err();
                }, cb);
            }

        }
    ]);
})();
