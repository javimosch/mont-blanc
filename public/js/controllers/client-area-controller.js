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
            },true);
            r.route(url, delay);
        }
        s.validateAuthInput = function(cb) {
            ifThenMessage([
                [!s.auth.email, '==', true, "Email required."],
                [!s.auth.pass, '==', true, "Password required."],
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
                        s.warningMsg('This email address belongs to an existing member.');
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
                s.infoMsg('Le compte a été créé . Vérifiez votre email .');
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

            if (!s._user.email) return s.warningMsg('Email c&#39;est obligatoire.');

            if (s._user.clientType !== 'landlord' && !s._user.siret) return s.warningMsg('Siret c&#39;est obligatoire.');

            db.ctrl('User', 'exists', {
                email: s._user.email,
                userType: 'client',
            }).then(exists => {
                exists = exists.ok && exists.result == true;
                if (exists) {
                    s.warningMsg('This email address belongs to an existing member.');
                }
                else {
                    //validate fields
                    ifThenMessage([
                        [!s._user.email, '==', true, "Email c&#39;est obligatoire."],
                        [!s._user.password, '==', true, "Password c&#39;est obligatoire."],
                        [!s._user.cellPhone, '==', true, "Mobile c&#39;est obligatoire"],
                        [!s._user.address, '==', true, "Adresse c&#39;est obligatoire"],
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
