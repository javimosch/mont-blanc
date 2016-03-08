var app = angular.module('app', [
    'app.common.service',
    'app.common.root',
    'app.common.directives',
    'app.static.calendar',
    'ui.bootstrap'
]);


app.controller('fullpage', ['server',
    '$timeout', '$scope', '$rootScope', '$uibModal',
    function(db, $timeout, s, r, $uibModal) {
        window.r = r;
        window.s = s;
        r.dom(); //compile directives

        //user (when auth success)
        s._user = {};

        s.booking = {
            payment:{
                delegate:false
            }
        };

        //
        r.logger.addControlledErrors([
            "ORDER_EXISTS"
        ]);

        s.datepicker = {
            minDate: moment().add(1, 'day'),
            maxDate: moment().add(60, 'day'),
            initDate: new Date()
        };
        s.model = {
            date: undefined,
            diags: {},
            clientType: 'agency'
        };

        s.validModel = () => {
            var isValid = true &&
                (true && s.model.sell !== undefined) &&
                (true && s.model.house !== undefined) &&
                //
                //(true && s.model.house && s.model.squareMeters) &&
                //(true && s.model.house == false && !s.model.apartamentType) &&
                ((true && s.model.house == true && s.model.squareMeters) ||
                    (true && s.model.house == false && s.model.apartamentType)) &&
                //
                (true && s.model.constructionPermissionDate) &&
                (true && s.model.gasInstallation) &&
                (true && s.model.electricityInstallation) &&
                (true && s.model.address) &&
                (true && s.model.diagStart) &&
                (true && s.model.diagEnd) &&
                true;
            return isValid;
        };


        var waitForProperties = (cbArray, props) => {
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
        };

        db.localData().then(function(data) {
            Object.assign(s, data);
            updateChecksVisibilityOnDemand();
            waitForProperties([loadDefaults, scrollToAnchor, r.dom], ['notify']);
        });

        function scrollToAnchor() {
            try {
                if($.hrefAnchor()){
                    $.fn.fullpage.moveTo($.hrefAnchor());
                }
            } catch (e) {

            }
        }



        var diagDescription = (n) => {
            var rta = n;
            s.diags.forEach((diag) => {
                if ((n && diag.name == n)) {
                    rta = diag.label;
                }
            });
            if (n === 'cpd') rta = 'constructionPermissionDate';
            return rta;
        }
        var diag = (n) => {
            var rta = null;
            s.diags.forEach((diag) => {
                if ((n && diag.name == n)) {
                    rta = diag;
                }
            });
            return rta;
        }
        s.diagLabel = (n, v) => {
            if (!v) return;
            return diag(n).label;
        };
        s.diagPrice = (n, v) => {
            if (!v) return;
            return diag(n).price;
        };

        var param = (n, validate) => {
            var val = getParameterByName(n);
            if (!val) return undefined;
            if (!validate) {
                return val;
            } else {
                var vals = Object.keys(validate).map((v) => {
                    return validate[v]
                }); //valid vals
                if (vals.length > 0 && !_.includes(vals, val)) {
                    var msg = 'Parameter ' + diagDescription(n) + ' has the follow valid values:' + JSON.stringify(vals);
                    console.warn(msg);
                    s.notify(msg, 'warning', 0, true, { duration: 99999 })
                    return undefined;
                } else {
                    return val;
                }
            }
        };
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
                    s.notify('Parameter ' + n + ' needs to be a valid date between ' + s.datepicker.minDate.format("DD/MM/YY") + ' and ' + s.datepicker.maxDate.format('DD/MM/YY'), 'warning', 0, true, { duration: 99999 })
                    return undefined;
                }
                return d;
            } else {
                if (getParameterByName(n) !== null) {
                    s.notify('Parameter ' + n + ' needs to be a valid date', 'warning', 0, true, { duration: 99999 })
                }
            }
            return undefined;
        }
        var paramBool = (n) => {
            var v = (getParameterByName(n) || '').toString()
            if (_.includes(['1', '0'], v)) {
                return v === '1';
            } else {
                if (getParameterByName(n) !== null) {
                    s.notify('Parameter ' + n + ' needs to be a 1/0', 'warning', 0, true, { duration: 99999 })
                }
                return undefined;
            }
        }


        s.lineThrough = (item) => (item.show == false);

        function updateChecksVisibilityOnDemand() {
            var toggle = (n, val) => {
                s.diags.forEach((diag) => {
                    if ((n && diag.name == n) || !n) {
                        diag.show = val;
                        if (diag.show == false) {
                            s.model.diags[diag.name] = false;
                        }
                    }
                });
            };
            s.diags.forEach(function(val, key) {
                s.model.diags[val.name] = (val.mandatory) ? true : false;
            });

            s.$watch('model.constructionPermissionDate', updateChecks);
            s.$watch('model.sell', updateChecks);
            s.$watch('model.gasInstallation', updateChecks);
            s.$watch('model.electricityInstallation', updateChecks);

            function updateChecks() {
                if (s.model.constructionPermissionDate === 'Before le 01/01/1949') {
                    toggle('crep', true);
                    s.model.diags.crep = true; //mandatory
                } else {
                    s.model.diags.crep = false; //
                    toggle('crep', true);
                }

                if (_.includes(['Before le 01/01/1949', 'entre 1949 et le 01/07/1997'], s.model.constructionPermissionDate)) {
                    toggle('dta', true);
                    s.model.diags.dta = true; //mandatory
                } else {
                    toggle('dta', true);
                    s.model.diags.dta = false;
                }

                if (s.model.gasInstallation === 'Oui, Plus de 15 ans') {
                    toggle('gaz', true);
                    if (s.model.sell == true) {
                        s.model.diags.gaz = true;
                    } else {
                        s.model.diags.gaz = false;
                    }
                } else {
                    toggle('gaz', false);
                }
                if (s.model.electricityInstallation === 'Oui, Plus de 15 ans') {
                    toggle('electricity', true);
                    if (s.model.sell == true) {
                        s.model.diags.electricity = true;
                    } else {
                        s.model.diags.electricity = false;
                    }
                } else {
                    toggle('electricity', false);
                }

            }
            toggle(undefined, true); //all checks visibles.
        }

        function loadDefaults() {
            s.model = Object.assign(s.model, {
                sell: paramBool('sell'),
                house: paramBool('house'),
                squareMeters: param('squareMeters', s.squareMeters) || undefined,
                apartamentType: param('apartamentType', s.apartamentType) || undefined,
                constructionPermissionDate: param('cpd', s.constructionPermissionDate) || undefined,
                address: param('address') || undefined,
                gasInstallation: param('gasInstallation', s.gasInstallation) || undefined,
                electricityInstallation: param('gasInstallation', s.gasInstallation) || undefined,
                date: paramDate('date'),
                time: param('time', ['any']),
                clientType: param('clientType', ['agency', 'landlord'])
            });

            s.diags.forEach((diag) => {
                var val = paramBool(diag.name);
                if (!_.isUndefined(val) && !_.isNull(val)) {
                    s.model.diags[diag.name] = val;
                }
            });
        }





        //----------------------------------------------------------
        s.$watch('model.date', function(date) {

            if (!isFinite(new Date(date))) return; //invalid

            var time = s.totalTime();
            var order = {
                day: date,
                time: time
            };

            db.getAvailableRanges(order).then(function(data) {
                //                console.info('availableTimeRanges:', data);
                s.availableTimeRanges = data.length > 0 && data || null;

                if (s.model.time == 'any') {
                    if (s.availableTimeRanges && s.availableTimeRanges.length > 0) {
                        s.pickTimeRange(s.availableTimeRanges[0]);
                    }
                }

                //retrieve diag names.
                s.availableTimeRanges.forEach(r => {
                    db.ctrl('User', 'get', { _id: r._diag }).then(d => {
                        if (d.ok && d.result) {
                            r.name = d.result.firstName;
                            if (d.result.diagPriority) {
                                r.name += ' (' + d.result.diagPriority + ')';
                            }
                        }
                    });
                });


            });
        });
        s.moveTo = (n) => { $.fn.fullpage.moveTo(n); };
        s.left = () => ($.fn.fullpage.moveSlideLeft());
        s.right = () => ($.fn.fullpage.moveSlideRight());
        s.down = function() {

            var curr = $.hrefAnchor();
            var anchors = ['question1', 'question2', 'question3', 'question4', 'question5', 'question6', 'question7', 'diags', 'calendar-timepicker', 'confirm-order'];
            var req = {
                'question1': () => (true && s.model.sell !== undefined),
                'question2': () => (true && s.model.house !== undefined),
                'question3': () => ((true && s.model.house == true && s.model.squareMeters) ||
                    (true && s.model.house == false && s.model.apartamentType)),
                'question4': () => (true && s.model.constructionPermissionDate),
                'question5': () => (true && s.model.address),
                'question6': () => (true && s.model.gasInstallation),
                'question7': () => (true && s.model.electricityInstallation),
                'diags': () => false,
                'calendar-timepicker': () => (true && s.model.diagStart) && (true && s.model.diagEnd),
                'confirm-order': () => false
            };
            var nextInvalidAnchor = (curr) => {
                var index = _.indexOf(anchors, curr);
                if (index + 1 == anchors.length) return curr;
                index++;
                for (var section in req) {
                    if (req[anchors[index]]()) index++;
                    else return anchors[index];
                }
            };

            s.moveTo(nextInvalidAnchor(curr));
            //$.fn.fullpage.moveSectionDown();
        };
        s.up = function() {
            $.fn.fullpage.moveSectionUp();
        };
        s.selectedDate = function() {
            return moment(s.model.date).format('MMMM Do YYYY, dddd');
        };
        s.drawRange = function(rng) {
            var rta = moment(rng.start).format("HH:mm") + 'h - ' + moment(rng.end).format("HH:mm") + 'h';

            if (rng.name) {
                rta += ' by ' + rng.name;
            }

            return rta;
        };

        s.onModelChange = function(a, b, c) {
            //            console.info(s.model);
        };
        s.$watch('model', s.onModelChange, true);


        //----------------------------------------------------------
        s.infoMsg = (msg) => {

            s.notify(msg, {
                type: 'info',
                duration: 5000
            });

        };
        s.warningMsg = (msg) => {
            s.notify(msg, {
                type: 'warning',
                duration: 5000
            });
        };
        s.successMsg = (msg) => {
            s.notify(msg, {
                type: 'success',
                duration: 5000
            });
        };

        s.auto = () => {
            console.log('auto');
            r.dom(() => s.moveTo('confirm-and-save'), 0000);
            r.dom(() => s.right(), 2000);
            r.dom(() => s.login(), 4000);
            s.auth = {
                email: 'javiermosch@gmail.com',
                pass: 'client'
            };
        };


        s.auth = {
            email: undefined,
            pass: undefined
        };
        s.validateAuthInput = (cb) => {

            ifThenMessage([
                [!s.auth.email, '==', true, "Email required."],
                [!s.auth.pass, '==', true, "Password required."],
            ], (m) => {
                if (typeof m[0] !== 'string') {
                    s.warningMsg(m[0]())
                } else {
                    s.warningMsg(m[0]);
                }
            }, cb);

        }

        s.login = () => {
            s.validateAuthInput(() => {
                db.ctrl('User', 'get', {
                    email: s.auth.email,
                    password: s.auth.pass,
                    userType: 'client'
                }).then(_user => {
                    _user = _user.ok && _user.result || null;
                    if (_user) {
                        s.model.clientType = _user.clientType;
                        s._user = _user;
                        s.saveAsync();
                        s.subscribeMode = true;
                        //s.right();
                    } else {
                        s.warningMsg('Invalid credentials');
                    }
                });
            });
        }

        s.landlord = {
            name: undefined,
            email: undefined
        };

        s.sendPaymentLink = () => {

            ifThenMessage([
                [!s.landlord.email, '==', true, "Landlord Email required."],
                [!s.landlord.name, '==', true, "Landlord Name required."],
            ], (m) => {
                if (typeof m[0] !== 'string') {
                    s.warningMsg(m[0]());
                } else {
                    s.warningMsg(m[0]);
                }
            }, _sendPaymentLink);

            function _sendPaymentLink() {

                s._order.landLordFullName = s.landlord.name;
                s._order.landLordEmail = s.landlord.email;

                db.ctrl('Order', 'update', s._order); //async

                s.openConfirm('You want to send a payment link to ' + s.landlord.email + ' ?', () => {
                    s.infoMsg("Sending email.");
                    db.ctrl('Email', 'orderPaymentLink', s._order).then(data => {
                        s.infoMsg("Email sended to the landlord. Check the back-office to track your order status.");
                        s.landlord.emailsended = true;
                        s.booking.payment.delegate = false;
                    });
                });
            }
        };

        s.subscribeMode = false;
        s.subscribeConfirm = () => {
            db.ctrl('User', 'update', s._user).then(() => s.right());
        };
        s.subscribe = (clientType) => {
            s.validateAuthInput(() => {
                db.ctrl('User', 'exists', {
                    email: s.auth.email,
                    userType: 'client',
                }).then(exists => {
                    exists = exists.ok && exists.result == true;
                    if (exists) {
                        s.warningMsg('This email address belongs to an existing member.');
                    } else {
                        db.ctrl('User', 'createClient', {
                            email: s.auth.email,
                            clientType: clientType
                        }).then(data => {
                            if (data.ok) {
                                s._user = data.result;
                                s.saveAsync();
                                s.subscribeMode = true;
                                //s.right();
                            }
                        })
                    }
                });
            });
        };


        s.goRightAndHideNav = () => {
            s.openConfirm('You are sure to continue?. You cannot modified Order details after this point', () => {
                s.hideNav();
                s.right();
            });
        };

        s.hideNav = () => {
            r.dom(() => {
                $('#fp-nav').toggle(false);
            })
        };
        s.showNav = () => {
            r.dom(() => {
                $('#fp-nav').toggle(true);
            })
        };


        s.saveAsync = () => {
            if (s._user) {
                s.model._client = s._user._id;
                s.model.email = s._user.email;
                s.model.clientType = s._user.clientType;
            }
            db.ctrl('Order', 'saveWithEmail', s.model).then(data => {
                var saved = data.ok;
                var exists = (data.err === 'ORDER_EXISTS');
                s._order = data.result;
                //
                if (saved) {
                    s.successMsg('Order saved.');
                }
                if (exists) {
                    //s.warningMsg('Order already exists.');
                    s.successMsg('Order saved.');
                }
                s._orderSAVED = saved || exists;
            }).error(err => {
                s.notify('There was a server issue during the order saving proccess. Retrying in 10 seconds. Wait.', {
                    type: 'warning',
                    duration: 100000
                });
                setTimeout(saveAsync, 10000);
            });

        };




        var isLandlord = () => s.model.clientType === 'landlord';

        //require an order to be saved (s._order)
        s.payNOW = (success) => {
            var order = s._order;
            openStripeModalPayOrder(order, (token) => {
                order.stripeToken = token.id;
                db.ctrl('Order', 'pay', order).then((data) => {
                    if (data.ok) {
                        if (success) {
                            success();
                        }
                        console.info('PAY-OK', data.result);
                        s.notify('Order payment success. We send you an email.', {
                            type: 'success',
                            duration: 100000
                        });
                    } else {
                        console.info('PAY-FAIL', data.err);
                        s.notify('There was a server issue during the payment proccess. You pay later from the back-office.', {
                            type: 'warning',
                            duration: 100000
                        });
                    }
                }).error(() => {
                    s.notify('There was a server issue during the payment proccess. You pay later from the back-office.', {
                        type: 'warning',
                        duration: 100000
                    });
                });
            });
        };

        function _payOrder(order) {
            openStripeModalPayOrder(order, (token) => {
                order.stripeToken = token.id;
                db.ctrl('Order', 'pay', order).then((data) => {
                    if (data.ok) {
                        _modalSuccess();
                        console.info('PAY-OK', data.result);
                        s.notify('Order created and paid. We send you an email.', {
                            type: 'success',
                            duration: 100000
                        });
                    } else {
                        console.info('PAY-FAIL', data.err);
                        s.notify('There was a server issue during the payment proccess, but your Order has been created. Check your email for more information.', {
                            type: 'warning',
                            duration: 100000
                        });
                    }
                }).error(() => {
                    s.notify('There was a server issue during the payment proccess, but your Order has been created. Check your email for more information.', {
                        type: 'warning',
                        duration: 100000
                    });
                });
            });
        }

        s.confirm = function() {

            db.ctrl('User', 'get', {
                email: s.model.email,
                userType: 'client',
                //clientType: 'landlord'
            }).then(_modal)


            function _modal(_userResponse) {
                var _user = _userResponse.ok && _userResponse.result || null;
                if (_user) {
                    s._user = _user;
                    s.model.clientType = _user.clientType;
                }

                var url = 'views/directives/directive.modal.confirm.order.as.agency.html'
                if (!_user && s.model.clientType === 'landlord') {
                    url = url.replace('agency', 'landlord');
                } else {
                    if (_user.clientType === 'landlord') {
                        url = url.replace('agency', 'landlord');
                    }
                }
                s.openConfirm({
                    templateUrl: url,
                    data: {
                        total: s.totalPrice(true),
                        clientType: s.clientType[s.model.clientType],
                        hasUser: _userResponse.ok && _userResponse.result !== null,
                        _user: _userResponse.result
                    }
                }, () => {
                    _saveOrder(isLandlord());
                });
            }

            function _modalSuccess() {
                s.openConfirm({
                    templateUrl: 'views/directives/directive.modal.order.created.html',
                    data: {
                        email: s.model.email
                    }
                }, () => {
                    window.location.href = window.location.origin; //reset
                });
            }

            function _modalInfo(msg, cb) {
                s.openConfirm({
                    templateUrl: 'views/directives/directive.modal.ok.html',
                    message: msg
                });
            }



            function _saveOrder(payAfterSave) {
                db.custom('order', 'saveWithEmail', s.model).then(function(res) {
                    if (res.data.ok) {
                        //showModal('Detailed information was send to ' + s.model.email);
                        if (payAfterSave) {
                            _payOrder(res.data.result);
                        } else {
                            //agency
                            s.notify('Order created. We send you an email.', {
                                type: 'success',
                                duration: 100000
                            });
                        }
                        s._orderSAVED = true;
                        console.info('ORDER:SAVE:SUCCESS', res.data);
                    } else {
                        if (res.data.err === 'ORDER_EXISTS') {
                            //if landlord && if payment pending (paymodal)
                            var _order = res.data.result;
                            if (isLandlord() && !_.includes(['prepaid', 'completed'], _order.status)) {
                                return _payOrder(_order);
                            } else {
                                var backOffice = '<a target="_blank" href="' + location.origin + '/admin#/orders/edit/' + _order._id + '">View Order</a>';
                                _modalInfo('A similar order is alredy associated to the email you enter: ' + s.model.email + '.<br>' + backOffice + ' in our back-office.');
                            }

                            //_modalInfo('An order with same address / start/ end is alredy associated to ' + s.model.email);
                        } else {
                            console.info('ORDER:SAVE:ISSUES', res.data);
                            s.notify('There was a server issue. Try again later.', {
                                type: 'warning',
                                duration: 10000
                            });
                        }

                    }
                }).error(function(res) {
                    console.warn('ORDER:SAVE:ERROR', res);
                    s.notify('There was a server issue. Try again later.', {
                        type: 'warning',
                        duration: 10000
                    });
                });
            }

            function _after() {

            }
        };


        s.getDate = () => {
            return {
                date: moment(s.model.diagStart).format('DD-MM-YY'),
                start: moment(s.model.diagStart).format('HH:mm'),
                end: moment(s.model.diagEnd).format('HH:mm')
            };
        };

        s.subTotal = () => subTotal(s.model, s.diags, s.basePrice);
        s.sizePrice = () => sizePrice(s.model, s.diags, s.squareMetersPrice, s.basePrice);
        s.totalPrice = (showRounded) => totalPrice(showRounded, s.model, s.diags, s.squareMetersPrice, s.basePrice, {
            s: s
        });

        s.pickTimeRange = function(timeRange) {
            s.model.diagStart = timeRange.start;
            s.model._diag = timeRange._diag;
            s.model.diagEnd = timeRange.end;
        };

        s.totalTime = function() {
            var total = 0;
            s.model.diags = s.model.diags || {};
            Object.keys(s.model.diags).forEach(function(mkey) {
                if (!s.model.diags[mkey]) return;
                s.diags.forEach(function(dval, dkey) {
                    if (dval.name == mkey) {
                        dval.time = dval.price / 4;
                        total += dval.time || 0;
                        return false;
                    }
                });
            });
            total = parseInt(parseInt(total) / 10, 10) * 10 + 10;
            var hours = Math.floor(total / 60);
            var minutes = total % 60;
            var t = {
                hours: hours,
                minutes: minutes
            };
            //return normalizeOrderTime(t);
            return t;
        };
        s.totalTime.formatted = () => {
            var time = s.totalTime();
            var hours = time.hours,
                minutes = time.minutes;
            minutes = (minutes < 10) ? '0' + minutes : minutes;
            if (hours > 0) {
                return hours + ':' + minutes + ' hours';
            } else {
                return minutes + ' minutes';
            }
        };

    }

]);
