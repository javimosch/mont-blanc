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
var app = angular.module('app');
app.controller('booking-iframe-controller', ['server',
    '$timeout', '$scope', '$rootScope', '$uibModal', 'diagSlots', 'orderPrice', '$log', 'orderPaymentForm', 'orderQuestion', 'appText', 'appRouter', 'localData',
    function(db, $timeout, s, r, $uibModal, diagSlots, orderPrice, $log, orderPaymentForm, orderQuestion, appText, appRouter, localData) {
        /*
          info: {
                    buildingState: paramBool('buildingState') || '1',
                    buildingType: paramBool('buildingType') || undefined,
                    squareMeters: getParam('squareMeters', s.squareMeters) || '90 - 110m²', // '- de 20m²',
                    // apartamentType: param('apartamentType', s.apartamentType) || undefined,
                    constructionPermissionDate: getParam('cpd', s.constructionPermissionDate) || undefined, // 'Entre 1949 et le 01/07/1997',
                    gasInstallation: getParam('gasInstallation', s.gasInstallation) || 'Oui, Plus de 15 ans', // 'Oui, Moins de 15 ans',
                    electricityInstallation: getParam('electricityInstallation', s.electricityInstallation) || s.item.info.electricityInstallation || 'Plus de 15 ans' // 'Plus de 15 ans',
                },
                address: getParam('address') 
                */

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
                addParam('squareMeters', s.item.info.squareMeters);
                addParam('cpd', s.item.info.constructionPermissionDate);
                addParam('gasInstallation', s.item.info.gasInstallation);
                addParam('electricityInstallation', s.item.info.electricityInstallation);
                addParam('address', s.item.address);
                addParam('postCode', s.item.postCode);

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
            ANSWER_APPARTAMENT_OR_MAISON: appText.VALIDATE_BUILDING_TYPE,
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
            ifThenMessage([
                [s.item.info.buildingState, '==', undefined, MESSAGES.ANSWER_SELL_OR_RENT],
                [s.item.info.buildingType, '==', undefined, MESSAGES.ANSWER_APPARTAMENT_OR_MAISON],
                [s.item.info.squareMeters, '==', undefined, "Répondre Superficie"],
                [s.item.info.constructionPermissionDate, '==', undefined, appText.VALIDATE_CONSTRUCTION_DATE],
                [s.item.info.gasInstallation, '==', undefined, "Répondre Gaz"],
                [s.item.info.electricityInstallation, '==', undefined, "Répondre Electricité"],
                [s.item.address, '==', undefined, appText.VALIDATE_ADDRESS],

                /*
                removed: autocomplete is now limited to france
                [_.includes(['France', 'Francia', 'Frankrig', 'Frankrijk',
                    'Frankreich', 'Frankrike', 'Francja'
                ], s.item.country), '==', false, MESSAGES.FRENCH_ADDRESS_REQUIRED]
                */

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





        var paramDate = s.paramDate = (n) => {
            var v = (getParameterByName(n) || '').toString()
            var d = new Date(v);
            if (isFinite(d)) {
                var fail = false;
                if (moment(d).isBefore(s.datepicker.minDate, 'day')) {
                    fail = true;
                }
                if (moment(d).isAfter(s.datepicker.maxDate, 'day')) {
                    fail = true;
                }
                if (fail) {
                    s.notify('Parameter ' + n + ' needs to be a valid date between ' + s.datepicker.minDate.format("DD/MM/YY") + ' and ' + s.datepicker.maxDate.format('DD/MM/YY'), 'warning', 0, true, {
                        duration: 99999
                    })
                    return undefined;
                }
                return d;
            }
            else {
                if (getParameterByName(n) !== null) {
                    s.notify('Parameter ' + n + ' needs to be a valid date', 'warning', 0, true, {
                        duration: 99999
                    })
                }
            }
            return undefined;
        }
        var paramBool = (n) => {
            var v = (getParameterByName(n) || '').toString()
            if (_.includes(['1', '0'], v)) {
                return v === '1';
            }
            else {
                if (getParameterByName(n) !== null) {
                    s.notify('Parameter ' + n + ' needs to be a 1/0', 'warning', 0, true, {
                        duration: 99999
                    })
                }
                return undefined;
            }
        }


        function getParam(n, validate) {
            var val = getParameterByName(n);
            if (!val) return undefined;
            if (!validate) {
                return val;
            }
            else {
                var vals = Object.keys(validate).map((v) => {
                    return validate[v]
                }); //valid vals
                if (vals.length > 0 && !_.includes(vals, val)) {
                    var msg = 'Parameter ' + diagDescription(n) + ' has the follow valid values:' + JSON.stringify(vals);
                    console.warn(msg);
                    s.notify(msg, 'warning', 0, true, {
                        duration: 99999
                    })
                    return undefined;
                }
                else {
                    return val;
                }
            }
        };


        function loadDefaults() {
            //console.log('loadDefaults');
            s.item.info = s.item.info || {};
            s.item = Object.assign(s.item, {
                info: {
                    buildingState: paramBool('buildingState') || '1',
                    buildingType: paramBool('buildingType') || undefined,
                    squareMeters: getParam('squareMeters', s.squareMeters) || '90 - 110m²', // '- de 20m²',
                    // apartamentType: param('apartamentType', s.apartamentType) || undefined,
                    constructionPermissionDate: getParam('cpd', s.constructionPermissionDate) || 'Entre 1949 et le 01/07/1997', // 'Entre 1949 et le 01/07/1997',
                    gasInstallation: getParam('gasInstallation', s.gasInstallation) || 'Oui, Plus de 15 ans', // 'Oui, Moins de 15 ans',
                    electricityInstallation: getParam('electricityInstallation', s.electricityInstallation) || s.item.info.electricityInstallation || 'Plus de 15 ans' // 'Plus de 15 ans',
                },
                address: getParam('address') || undefined, // "15 rue L'Hopital Sain Louis",
                date: paramDate('date'),
                time: getParam('time', ['any'])
            });



            r.dom(function() {

                //Building size slider !?
                try {
                    var x = 0;
                    for (var pos in s.squareMeters) {
                        if (s.item.info.squareMeters == s.squareMeters[pos]) {
                            break;
                        }
                        else {
                            x++;
                        }
                    }
                    $("input[type=range]").val(x);
                    // console.log('range-set-at-', x);
                }
                catch (e) {}
            });

            $U.emitPreserve('booking-defaults-change');

            s.diags.forEach((diag) => {
                var val = paramBool(diag.name);
                if (!_.isUndefined(val) && !_.isNull(val)) {
                    s.item.diags[diag.name] = val;
                }
            });
        }






    }
]);
