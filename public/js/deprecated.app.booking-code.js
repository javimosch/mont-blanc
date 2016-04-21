/*DEPRECATED 
                s.goRightAndHideNav = () => {
                    s.openConfirm('You are sure to continue?. You cannot modified Order time and selected inspections after this point', () => {
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
        */
        
        

        ///////////DEPRECATED
        /*
                function _payOrder(order) {
                    openStripeModalPayOrder(order, (token) => {
                        order.stripeToken = token.id;
                        db.ctrl('Order', 'pay', order).then((data) => {
                            if (data.ok) {
                                //_modalSuccess();
                                console.info('PAY-OK', data.result);
                                s.notify('Order created and paid. We send you an email.', {
                                    type: 'success',
                                    duration: 100000
                                });
                            }
                            else {
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
                        }
                        else {
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
                        var data = _.clone(s.model);
                        data._client = data._client.id || data._client;
                        db.custom('order', 'saveWithEmail', data).then(function(res) {
                            if (res.data.ok) {
                                //showModal('Detailed information was send to ' + s.model.email);
                                if (payAfterSave) {
                                    _payOrder(res.data.result);
                                }
                                else {
                                    //agency
                                    s.notify('Order created. We send you an email.', {
                                        type: 'success',
                                        duration: 100000
                                    });
                                }
                                s._orderSAVED = true;
                                console.info('ORDER:SAVE:SUCCESS', res.data);
                            }
                            else {
                                if (res.data.err === 'ORDER_EXISTS') {
                                    //if landlord && if payment pending (paymodal)
                                    var _order = res.data.result;
                                    if (isLandlord() && !_.includes(['prepaid', 'completed'], _order.status)) {
                                        return _payOrder(_order);
                                    }
                                    else {
                                        var backOffice = '<a target="_blank" href="' + location.origin + '/admin#/orders/edit/' + _order._id + '">View Order</a>';
                                        _modalInfo('A similar order is alredy associated to the email you enter: ' + s.model.email + '.<br>' + backOffice + ' in our back-office.');
                                    }

                                    //_modalInfo('An order with same address / start/ end is alredy associated to ' + s.model.email);
                                }
                                else {
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
               */


 //DEPRECATED
        /*
                s.keysWhereTime = {
                    invalidKeysTimeMessage: () => {
                        var startTime = () => moment(s._order.diagStart).format('HH:mm');
                        return 'Keys time should be between 8:00 and ' + startTime();
                    },
                    invalidKeysTime: () => {
                        var before = (d1, h) => moment(d1).isBefore(moment(d1).hours(8));
                        var diag = {
                            hours: moment(s._order.diagStart).hours(),
                            minutes: moment(s._order.diagStart).minutes()
                        };
                        var after = (d1) => moment(d1).isAfter(moment(d1).hours(diag.hours).minutes(diag.minutes));
                        var tfrom = s._order.keysTimeFrom;
                        var tto = s._order.keysTimeTo;
                        if (!tfrom || before(tfrom) || after(tfrom)) {
                            console.warn('invalidKeysTime from', (!tfrom), before(tfrom), after(tfrom));
                            return true;
                        }
                        if (!tto || before(tto) || after(tto)) {
                            console.warn('invalidKeysTime to', (!tto), before(tto), after(tto));
                            return true;
                        }
                        if (tto && tfrom && moment(tto).isBefore(moment(tfrom))) {
                            console.warn('invalidKeysTime from <- to required.');
                            return true;
                        }

                        return false;
                    },
                    emit: function(n) {
                        var self = this;
                        var arr = self.evts[n] || [];
                        arr.forEach(evt => (evt(self)))
                    },
                    evts: {
                        onItem: [(self) => {
                            s.keysWhereTime.updateItems(self);
                        }]
                    },
                    mstep: 15,
                    hstep: 1,
                    address: '',
                    scope: s,
                    val: undefined,
                    disabled: () => r.state.working(),
                    cls: () => ({
                        btn: true,
                        'btn-default': true
                    }),
                    filterWatch: '_order',
                    filter: (v) => {
                        if (s._order && s._order._client && s._order._client.clientType) {
                            if (s._order._client.clientType !== 'agency') {
                                if (v.val == 'agency') {
                                    return false;
                                }
                            }
                        }
                        return true;
                    },
                    label: '(Select where)',
                    modelPath: '_order.keysWhere',
                    items: [],
                    updateItems: ((self) => {
                        var o = [{
                            label: () => s._order && s._order.address || 'Diag Address',
                            val: 1,
                            get: () => s._order && s._order.address
                        }];
                        if (s._order._client && s._order._client.clientType == 'agency') {
                            o.push({
                                label: () => s._user.address || 'Agency address',
                                val: 3,
                                get: () => s._user.address || ''
                            }, {
                                label: () => s._order.landLordAddress || 'Landlord address',
                                val: 4,
                                disabled: () => !s._order.landLordAddress,
                                get: () => s._order.landLordAddress || ''
                            }); //when agency / other
                        }
                        else {
                            o.push({
                                label: () => s._user.address || 'Client address',
                                val: 3,
                                get: () => s._user.address || ''
                            }); //when landlord
                        }
                        self.items = o;
                    }),
                    change: (v, self, setOldValue) => {
                        if (!v) return;
                        var address = v.get();
                        if (!address) {
                            s.notify('Address not found', {
                                type: 'warning',
                                duration: 5000,
                                clickDismissable: true
                            });
                            self.val = undefined;
                            setOldValue();
                            return;
                        }
                        if (s._order.keysAddress && s._order.keysAddress == address) {
                            if (!s._order.keysTime) {
                                s._order.keysTime = moment(s._order.diagStart).hours(8).minutes(0)._d;
                            }
                            return;
                        }
                        else {
                            s._order.keysAddress = address;
                        }

                    }
                };
                
        */
        
           //DEPRECATED
        /*
                s.validModel = () => {
                    var isValid = true &&
                        (true && s.model.sell !== undefined) &&
                        (true && s.model.house !== undefined) &&
                        //
                        //(true && s.model.house && s.model.squareMeters) &&
                        //(true && s.model.house == false && !s.model.apartamentType) &&

                        //deprecated: now there is only squareMeters (for house and apartment)
                        //((true && s.model.house == true && s.model.squareMeters) || (true && s.model.house == false && s.model.apartamentType)) &&
                        (true && s.model.squareMeters || false) &&


                        (true && s.model.constructionPermissionDate || false) &&
                        (true && s.model.gasInstallation || false) &&
                        (true && s.model.electricityInstallation || false) &&
                        (true && s.model.address || false) &&
                        (true && s.model.diagStart || false) &&
                        (true && s.model.diagEnd || false) &&
                        true;
                    return isValid;
                };
        */



        /*DEPRECATED    
             s.moveTo = (n) => {
                 $.fn.fullpage.moveTo(n);
             };
             s.left = () => ($.fn.fullpage.moveSlideLeft());
             s.right = () => ($.fn.fullpage.moveSlideRight());
             s.down = function(force) {

                 var curr = $.hrefAnchor();
                 var anchors = ['question1', 'question2', 'question3', 'question4', 'question5', 'question6', 'question7', 'diags', 'calendar-timepicker', 'confirm-order'];
                 var req = {
                     'question1': () => (true && s.model.sell !== undefined),
                     'question2': () => (true && s.model.house !== undefined),
                     //'question3': () => ((true && s.model.house == true && s.model.squareMeters) ||(true && s.model.house == false && s.model.apartamentType)),
                     'question3': () => (true && s.model.squareMeters),
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
                 if (force == true) {
                     $.fn.fullpage.moveSectionDown();
                 }
                 else {
                     s.moveTo(nextInvalidAnchor(curr));
                 }

                 //$.fn.fullpage.moveSectionDown();
             };
             s.up = function() {
                 $.fn.fullpage.moveSectionUp();
             };
             
            */



        /*DEPRECATED 
                s.backToBookingQuestions = () => {
                    s.moveTo('question5');
                    $('#fp-nav').toggle(true) //nav on again
                    s.left();
                };
                s.slideToAuth = () => {
                    if (s.subscribeMode) {
                        s.saveAsync();
                    }
                    s.hideNav();
                    s.right();
                }
        */


   /*deprecated 
                s.subscribeMode = false;
                s.subscribeConfirm = () => {
                    var addressMessage = () => {
                        if (s._user.clientType == 'landlord') return 'Address required.';
                        if (s._user.clientType == 'agency') return 'Agency address required.';
                        if (s._user.clientType == 'other') return 'Company address required.';
                    };
                    ifThenMessage([
                        [!s._user.address, '==', true, addressMessage],
                        [!s._user.email, '==', true, "Email required."],
                        [!s._user.password, '==', true, "Password required."],
                        [!s._user.fixedTel && !s._user.cellPhone, '==', true, "at least one fixed phone or cell phone is required."],
                    ], (m) => {
                        if (typeof m[0] !== 'string') {
                            s.warningMsg(m[0]())
                        }
                        else {
                            s.warningMsg(m[0]);
                        }
                    }, () => {
                        db.setAsync().ctrl('User', 'update', s._user).then(() => {}); //async (we don't want to wait here).
                        s.right();
                    });


                };
                */
