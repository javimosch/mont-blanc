/*global val*/
/*global angular*/
/*global _*/
/*global moment*/
/*global $*/
/*global getParameterByName*/
/*global ifThenMessage*/
/*global subTotal*/
/*global openStripeModalPayOrder*/
/*global $U*/
/*global sizePrice*/
/*global totalPrice*/
/*global $D*/
angular.module('app').controller('client-area-controller', ['server',
    '$timeout', '$scope', '$rootScope', '$uibModal', 'diagSlots', 'orderPrice', '$log', 'orderPaymentForm', 'orderQuestion', 'appText', 'appRouter',
    function(db, $timeout, s, r, $uibModal, diagSlots, orderPrice, $log, orderPaymentForm, orderQuestion, appText, appRouter) {

        s._user = r.sessionMetadata()._user || {};
        s.auth = {};
        s.warningMsg = (msg) => {
            s.notify(msg, {
                type: 'warning',
                duration: 5000
            });
        };
        s.infoMsg = (msg) => {
            s.notify(msg, {
                type: 'info',
                duration: 5000
            });
        };

        function changeRoute(url, delay) {
            r.sessionMetadata({
                _user: s._user
            }, true);
            r.route(url, delay);
        }
        s.validateAuthInput = function(cb) {
            ifThenMessage([
                [!s.auth.email, '==', true, appText.VALIDATE_CLIENT_EMAIL],
                [!s.auth.pass, '==', true, appText.VALIDATE_CLIENT_PASS],
            ], (m) => {
                if (typeof m[0] !== 'string') {
                    s.warningMsg(m[0]())
                }
                else {
                    s.warningMsg(m[0]);
                }
            }, cb);

        }
        s.subscribeMode = (clientType) => s.subscribe(clientType, r.URL.ACCOUNT_DETAILS);
        s.subscribe = (clientType, nextRoute, useAuthCredentials) => {
            useAuthCredentials = useAuthCredentials == undefined ? true : useAuthCredentials;
            if (useAuthCredentials) {
                s.validateAuthInput(_validateEmail);
            }
            else {
                _setAndGo();
            }


            function _validateEmail() {
                db.ctrl('User', 'exists', {
                    email: s.auth.email,
                    userType: 'client',
                }).then(exists => {
                    exists = exists.ok && exists.result == true;
                    if (exists) {
                        s.warningMsg(appText.DUPLICATED_EMAIL_ADDRESS);
                    }
                    else {
                        _setAndGo();
                    }
                });
            }

            function _setAndGo() {
                s._user = {};
                if (useAuthCredentials) {
                    s._user.email = s.auth.email;
                    s._user.password = s.auth.pass;
                }
                s._user.clientType = clientType;
                s._user.__subscribeMode = true;
                changeRoute(nextRoute);
            }
        };

        s.subscribeClientStandAlone = function() {
            s.createClient(function() {
                s.infoMsg(appText.CLIENT_ACCOUNT_CREATED);
                changeRoute(r.URL.HOME);
            });
        };
        s.createClient = function(cb) {
            s.validateClientDetails(function() {
                db.ctrl('User', 'createClient', s._user).then(data => {
                    if (data.ok) {
                        s._user = data.result;
                        cb();
                    }
                    else {
                        s.warningMsg(data.err);
                    }
                });
            });
        };
        s.validateClientDetails = function(cb) {

            if (!s._user.email) return s.warningMsg(appText.VALIDATE_CLIENT_EMAIL);

            if (s._user.clientType !== 'landlord' && !s._user.siret) return s.warningMsg(appText.VALIDATE_CLIENT_SIRET);

            db.ctrl('User', 'exists', {
                email: s._user.email,
                userType: 'client',
            }).then(exists => {
                exists = exists.ok && exists.result == true;
                if (exists) {
                    s.warningMsg(appText.DUPLICATED_EMAIL_ADDRESS);
                }
                else {
                    //validate fields
                    ifThenMessage([
                        [!s._user.email, '==', true, appText.VALIDATE_CLIENT_EMAIL],
                        [!s._user.password, '==', true, appText.VALIDATE_CLIENT_PASS],
                        [!s._user.cellPhone, '==', true, appText.VALIDATE_CLIENT_MOBILE_NUMBER],
                        [!s._user.address, '==', true, appText.VALIDATE_CLIENT_ADDRESS],
                    ], (m) => {
                        if (typeof m[0] !== 'string') {
                            s.warningMsg(m[0]())
                        }
                        else {
                            s.warningMsg(m[0]);
                        }
                    }, cb);
                }
            });
        }




    }

]);
