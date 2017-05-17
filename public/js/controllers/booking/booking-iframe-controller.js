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
(function() {
    angular.module('app').controller('booking-iframe-controller', ['server',
        '$timeout', '$scope', '$rootScope', 'orderPrice', '$log', 'orderPaymentForm', 'orderQuestion', 'appText', 'appRouter', 'localData', 'orderQueryParams', 'orderHelper',
        function(db, $timeout, s, r, orderPrice, $log, orderPaymentForm, orderQuestion, appText, appRouter, localData, orderQueryParams, orderHelper) {

            s.warningMsg = (msg, delay) => {
                r.warningMessage(msg, delay);
            };

            s.proceedToDiagsSelection = function() {
                s.validateQuestions(function() {
                    if (!window.serverURL) {
                        //    return r.warningMessage('Define serverURL');
                    }
                    var url = "https://white-house-78-javoche.c9users.io/";

                    if (!r.isDevEnv()) {
                        url = "https://www.diagnostical.fr/";
                    }

                    if (window.location.href.indexOf('herokuapp') !== -1) {
                        url = 'https://diagnostical-preview.herokuapp.com/';
                    }

                    url += 'choix-diagnostics';

                    var addParam = (n, v) => {
                        if (url.indexOf('?') == -1) {
                            url += '?';
                        }
                        else {
                            url += '&';
                        }
                        url += n.toString() + '=' + v.toString();
                    };

                    addParam('buildingState', s.item.info.buildingState);
                    addParam('buildingType', s.item.info.buildingType);
                    addParam('squareMeters', window.btoa(s.item.info.squareMeters));
                    addParam('cpd', s.item.info.constructionPermissionDate);
                    addParam('gasInstallation', s.item.info.gasInstallation);
                    addParam('electricityInstallation', s.item.info.electricityInstallation);
                    addParam('address', s.item.address);
                    addParam('postCode', s.item.postCode);
                    addParam('if', "1");

                    //return r.routeExternal(url);
                    return window.open(url, '_newtab');
                }, () => {
                    if (!s.addressDepartmentCovered) {
                        var msg = "Votre département n'est pas encore couvert par Diagnostical.<br>";
                        msg += "Laissez-nous votre adresse e-mail pour être informé de l'ouverture du service dans votre département."
                        msg += "<div class='row margin-top-one' >";
                        msg += "   <div class='col-sm-12'>";
                        msg += "      <input class='diags-input' ng-model=\"data.email\" placeholder='adresse e-mail'>";
                        msg += "   </div>";
                        msg += "</div>";
                        db.ctrl('Notification', 'ADMIN_BOOKING_MISSING_DEPARTMENT', {
                            department: s.item.postCode.substring(0, 2),
                        });
                        s.openConfirm = s.openConfirm || r.openConfirm || window.top._openConfirm;
                        var modal = s.openConfirm({
                            message: msg,
                            data: {
                                title: "Département en cours d'ouverture",
                                hideYesButton: true,
                                email: r.session() && r.session().email || '',
                                customButton: true,
                                customButtonLabel: "Envoyer",
                                customButtonClick: () => {
                                    if (!modal.scope.data.email) {
                                        return r.infoMessage('Email est nécessaire.');
                                    }
                                    else {
                                        db.ctrl('Notification', 'ADMIN_BOOKING_MISSING_DEPARTMENT_REQUEST', {
                                            department: s.item.postCode.substring(0, 2),
                                            email: modal.scope.data.email,
                                            metadata: JSON.stringify(s.item),
                                        });
                                        modal.close();
                                        return r.infoMessage('Nous avons été informés. Merci beaucoup.')
                                    }
                                }
                            }
                        });
                    }
                });
            }

            window.s = s;
            s.item = {
                date: undefined,
                diags: {},
                clientType: 'landlord',
                info: {}
            };
            localData().then(function(data) {
                Object.assign(s, data);
                s.diags = _.sortBy(s.diags, function(o) {
                    return o.sort;
                });
                s.diag = s.diag || {};
                s.diags.forEach(diag => {
                    s.diag[diag.name] = diag;
                });
                s.diagSelected = s.diag.dpe;
                orderQuestion.bindAnswersToDefaultDiags(s);
                waitForProperties([loadDefaults, r.dom], ['notify']);
            });

            moment.locale('fr')
            var MESSAGES = {
                ANSWER_SELL_OR_RENT: 'Répondre Vendez / Louer',
                ANSWER_APPARTAMENT_OR_MAISON: appText.BOOKING_VALIDATE_BUILDING_TYPE,
                FRENCH_ADDRESS_REQUIRED: 'Adresse besoin d&#39;appartenir à France',
            };

            r.__textSTATIC = {
                BOOKING_STRIPE_TEXT: "Paiement simplifié et sécurisé avec Lemon Way accrédité ACPR",
                BOOKING_HOME_BG_TEXT_1: "Accédez aux calendriers en live des diagnostiqueurs immobiliers certifiés, disponibles, au bon prix*",
                BOOKING_HOME_BG_TEXT_2: "Nous joindre au"
            };





            s.dateSlot = {
                proceedToConnect: s.proceedToConnect
            };




            s.addressDepartmentCovered = true;
            s.validateAddressDepartment = (cb, err) => {
                var code = s.item.postCode.substring(0, 2);
                //console.info('debug validating address department', code);
                db.ctrl('User', 'departmentCoveredBy', {
                    department: code.toString()
                }).then(res => {
                    if (!res.ok) {
                        return cb && cb(); //ignores validation
                    }
                    s.addressDepartmentCovered = res.result;
                    if (res.result == true) {
                        cb && cb();
                    }
                    else {
                        err && err();
                    }
                })
            };


            s.validateQuestions = validateQuestions;

            function validateQuestions(cb, err) {
                $U.ifThenMessage([
                    [s.item.info.buildingState, '==', undefined, MESSAGES.ANSWER_SELL_OR_RENT],
                    [s.item.info.buildingType, '==', undefined, MESSAGES.ANSWER_APPARTAMENT_OR_MAISON],
                    [s.item.info.squareMeters, '==', undefined, "Répondre Superficie"],
                    [s.item.info.constructionPermissionDate, '==', undefined, appText.BOOKING_VALIDATE_CONSTRUCTION_DATE],
                    [s.item.info.gasInstallation, '==', undefined, "Répondre Gaz"],
                    [s.item.info.electricityInstallation, '==', undefined, "Répondre Electricité"],
                    [s.item.address, '==', undefined, appText.BOOKING_VALIDATE_ADDRESS],
                ], (m) => {
                    s.warningMsg(m[0], 6000);
                    if (err) err();
                }, () => {
                    s.validateAddressDepartment(cb, err);
                });
            }




            db.ctrl('Settings', 'getAll', {}).then(d => {
                if (d.ok && d.result.length > 0) s.settings = d.result[0];
            });



            s.departmentHasTermites = () => {
                if (s.item.department) {
                    var code = s.item.postCode.substring(0, 2);
                    return _.includes(s.termitesDepartments.map(v => (v.toString())), code);
                }
            };

            s.CLIENT_TYPES = ['agency', 'enterprise', 'landlord', 'other'];
            s.CLIENT_TYPES_COMPANY = ['agency', 'enterprise', 'other'];

            s.isLandLord = () => {
                return !_.includes(s.CLIENT_TYPES_COMPANY, s._user.clientType);
            }
            s.isAgency = () => {
                return !s.isLandLord();
            };





            function waitForProperties(cbArray, props) {
                var i = setInterval(function() {
                    var rta = true;
                    props.forEach((v) => {
                        if (_.isUndefined(s[v])) {
                            rta = false;
                        }
                    });
                    if (rta) {
                        clearInterval(i);
                        cbArray.forEach((cb) => {
                            cb();
                        });
                    }
                }, 200);
            }

            s.__constructionPermissionDateSelectLabel = 'choisir';
            s.__constructionPermissionDateSelect = (key, val) => {
                s.item.info.constructionPermissionDate = val;

            };
            s.$watch('item.info.constructionPermissionDate', function(val) {
                s.__constructionPermissionDateSelectLabel = val ? val : 'choisir';
                r.dom();
            });

            s.__gazSelectLabel = 'choisir';
            s.__gazSelect = (key, val) => {
                s.item.info.gasInstallation = val;
            };
            s.$watch('item.info.gasInstallation', function(val) {
                s.__gazSelectLabel = val ? val : 'choisir';
                r.dom();
            });






            function loadDefaults() {
                s.item.info = s.item.info || {};
                s.item = Object.assign(s.item, orderQueryParams.getData(s.item));
                //s.diagSlots = diagSlots(s, s.item);
                r.dom(function() {
                    try {
                        $("input[type=range]").val(orderHelper.getSquareMetersSelectedIndex(s.item));
                    }
                    catch (e) {}
                });
            }






        }
    ]);

})();
