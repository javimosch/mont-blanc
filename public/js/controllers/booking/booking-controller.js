/*global val*/
/*global angular*/
/*global _*/
/*global moment*/
/*global $*/


/*global subTotal*/
/*global openStripeModalPayOrder*/
/*global $U*/
/*global sizePrice*/
/*global totalPrice*/
/*global $D*/
var app = angular.module('app');
app.controller('ctrl.booking', ['server',
    '$timeout', '$scope', '$rootScope', 'orderPrice', '$log', 'orderQuestion', 'appText', 'appRouter', 'localData', 'appSettings', 'orderHelper', 'orderQueryParams', 'orderBooking', 'Analytics', 'localSession',
    function(db, $timeout, $scope, $rootScope, orderPrice, $log, orderQuestion, appText, appRouter, localData, appSettings, orderHelper, orderQueryParams, orderBooking, Analytics, localSession) {

        (function() {
            var session = localSession.getData();
            if (session._id && session.userType === 'admin' && Analytics.userId && Analytics.userId == session._id) {
                Analytics.unsetUser();
            }
        })();

        //We expose this scope to $g.bc
        $U.exposeGlobal('bc', $scope);

        /*BOOKING METADATA*/
        $scope.item = {
            date: undefined,
            diags: {},
            clientType: 'landlord',
            info: {}
        };

        var routeParams = {
            autoSelectCards: true,
            bookingInProgress: true
        };

        var autoSelectDiagsCards = (appRouter.currentPath === "" || appRouter.currentPath === "home");

        /*INIT*/
        localData().then(function(data) {
            Object.assign($scope, data);
            if (autoSelectDiagsCards) {
                orderQuestion.bindAnswersToDefaultDiags($scope);
            }
            $U.waitForProperties([loadDefaults, validateMetadata, $rootScope.dom], ['notify'], $scope);
        });

        function loadDefaults() {
            $scope.item.info = $scope.item.info || {};

            if (orderBooking.inProgress()) {
                $scope.item = Object.assign(orderHelper.getBookingDetails());
                orderBooking.pause();
            }
            else {
                $scope.item = Object.assign($scope.item, orderQueryParams.getData($scope.item));
            }

            $rootScope.dom(function() {
                try {
                    $("input[type=range]").val(orderHelper.getSquareMetersSelectedIndex($scope.item));
                }
                catch (e) {}
            });
        }

        function validateMetadata() {
            orderHelper.validateMetadata($scope.item).error((error) => {
                if (error.message) $rootScope.warningMessage(error.message, 6000);
                orderBooking.reset();
                orderBooking.navigate($rootScope.URL.HOME, $scope.item, routeParams);
            });
        }

        //MAIN BUTTONS
        $scope.proceedToDiagsSelection = function() {

            orderHelper.validateQuestions($scope.item).then(function() {

                Analytics.trackEvent('booking_form_next_button', {
                    address: $scope.item.address,
                    postCode: $scope.item.postCode,
                    department: $scope.item.postCode.substring(0, 2),
                    metadata: JSON.stringify($scope.item.info)
                });

                orderBooking.navigate('choix-diagnostics', $scope.item, routeParams);
            }).error((error) => {

                if (error && error.message) return $rootScope.warningMessage(error.message, 6000);

                if (error.addressDepartmentCovered !== undefined && error.addressDepartmentCovered == false) {

                    Analytics.trackEvent('department_not_covered', {
                        address: $scope.item.address,
                        postCode: $scope.item.postCode,
                        department: $scope.item.postCode.substring(0, 2)
                    });

                    var msg = "Votre département n'est pas encore couvert par Diagnostical.<br>";
                    msg += "Laissez-nous votre adresse e-mail pour être informé de l'ouverture du service dans votre département."
                    msg += "<div class='row margin-top-one' >";
                    msg += "   <div class='col-sm-12'>";
                    msg += "      <input class='diags-input' ng-model=\"data.email\" placeholder='adresse e-mail'>";
                    msg += "   </div>";
                    msg += "</div>";

                    db.ctrl('Notification', 'ADMIN_BOOKING_MISSING_DEPARTMENT', {
                        department: $scope.item.postCode.substring(0, 2),
                    });

                    var modal = $scope.openConfirm({
                        message: msg,
                        data: {
                            title: appText.VALIDATE_FRENCH_ADDRESS,
                            hideYesButton: true,
                            email: $rootScope.session() && $rootScope.session().email || '',
                            customButton: true,
                            customButtonLabel: appText.DEPARTEMENT_COVERED_SEND_BUTTON,
                            customButtonClick: () => {
                                if (!modal.scope.data.email) {
                                    return $rootScope.infoMessage(appText.VALIDATE_DEPARTEMENT_COVERED_SENDER_EMAIL);
                                }
                                else {

                                    db.ctrl('Notification', 'ADMIN_BOOKING_MISSING_DEPARTMENT_REQUEST', {
                                        department: $scope.item.postCode.substring(0, 2),
                                        email: modal.scope.data.email,
                                        metadata: JSON.stringify($scope.item),
                                    });

                                    Analytics.trackEvent('department_not_covered_alert_request', {
                                        address: $scope.item.address,
                                        postCode: $scope.item.postCode,
                                        department: $scope.item.postCode.substring(0, 2),
                                        email: modal.scope.data.email,
                                        metadata: JSON.stringify($scope.item.info)
                                    });

                                    modal.close();
                                    return $rootScope.infoMessage(appText.DEPARTEMENT_COVERED_EMAIL_SENDED)
                                }

                            }
                        }
                    });
                }
            });
        }

        $scope.__constructionPermissionDateSelectLabel = appText.SELECT_UNSELECTED_LABEL;
        $scope.__constructionPermissionDateSelect = (key, val) => {
            $scope.item.info.constructionPermissionDate = val;

        };
        $scope.$watch('item.info.constructionPermissionDate', function(val) {
            $scope.__constructionPermissionDateSelectLabel = val ? val : appText.SELECT_UNSELECTED_LABEL;
            $rootScope.dom();
        });

        $scope.__gazSelectLabel = appText.SELECT_UNSELECTED_LABEL;
        $scope.__gazSelect = (key, val) => {
            $scope.item.info.gasInstallation = val;
        };
        $scope.$watch('item.info.gasInstallation', function(val) {
            $scope.__gazSelectLabel = val ? val : appText.SELECT_UNSELECTED_LABEL;
            $rootScope.dom();
        });

    }
]);
