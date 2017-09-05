(function() {
    /*global angular*/
    /*global _*/
    /*global $U*/
    /*global moment*/
    angular.module('app').controller('cards-choice-controller', ['server',
        '$timeout', '$scope', '$rootScope', '$log', 'orderQuestion', 'appText', 'appRouter', 'localData', 'appSettings', 'orderHelper', 'localSession', 'backendApi', 'orderQueryParams', 'orderBooking', 'Analytics',
        function(db, $timeout, $scope, $rootScope, $log, orderQuestion, appText, appRouter, localData, appSettings, orderHelper, localSession, backendApi, orderQueryParams, orderBooking, Analytics) {

           (function() {
            var session = localSession.getData();
            if (session._id && session.userType === 'admin' && Analytics.userId && Analytics.userId == session._id) {
                Analytics.unsetUser();
            }
        })();

            //Expose controller for debugging
            $U.exposeGlobal('ccc', $scope);

            $scope.item = {
                diags: {}
            };

            appSettings.syncAll().then(() => {
                Object.assign($scope, appSettings.localData);

                orderBooking.applyCardsSettingsCache($scope.diags);

                if (cameFromIframe()) {
                    $scope.item = Object.assign($scope.item, orderQueryParams.getData($scope.item));
                }
                else {
                    $scope.item = Object.assign(orderHelper.getBookingDetails());
                }

                var autoSelectDiagsCards = cameFromIframe() || hasAutoSelectFlag();

                //$log.debug('IFRAME?', cameFromIframe(), 'autoselect flag?', hasAutoSelectFlag());

                if (autoSelectDiagsCards) {

                    appRouter.params({
                        autoSelectCards: false
                    });

                    orderQuestion.bindAnswersToDefaultDiags($scope);

                }
                $rootScope.dom();

            }).error($log.error);


            function atLeastOneDiagSelected() {
                for (var x in $scope.item.diags) {
                    if ($scope.item.diags[x] == true) return true;
                }
                return false;
            }

            function hasAutoSelectFlag() {
                var p = appRouter.params();
                return p && p.autoSelectCards === true;
            }

            function cameFromIframe() {
                var queryStringIfParameterValue = $U.getParameterByName('if');
                if (!queryStringIfParameterValue) return false;
                return queryStringIfParameterValue.toString() === "1";
            }

            $scope.proceedToDateSelection = function() {
                if (atLeastOneDiagSelected()) {

                    Analytics.trackEvent('booking_choix_diags_next_button', {
                        address: $scope.item.address,
                        postCode: $scope.item.postCode,
                        department: $scope.item.postCode.substring(0, 2),
                        dpe: $scope.item.diags.dpe,
                        dta: $scope.item.diags.dta,
                        crep: $scope.item.diags.crep,
                        loiCarrez: $scope.item.diags.loiCarrez,
                        ernt: $scope.item.diags.ernt,
                        termites: $scope.item.diags.termites,
                        gaz: $scope.item.diags.gaz,
                        electricity: $scope.item.diags.electricity,
                        parasitaire: $scope.item.diags.parasitaire,
                        metadata: JSON.stringify($scope.item.info)
                    });


                    return orderBooking.navigate('rendez-vous', $scope.item);
                }
                else {
                    return $rootScope.warningMessage(appText.BOOKING_PROCEED_TO_DATE_SELECTION_FLASH_MESSAGE);
                }
            }
            $scope.bookingDescriptionTitle = function(item) {
                return orderHelper.getDescription.title();
            };
            $scope.bookingDescriptionBody = function(item) {
                return orderHelper.getDescription.body();
            };

        }
    ]);

})();
