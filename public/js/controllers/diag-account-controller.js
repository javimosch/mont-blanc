(function() {
    /*global angular*/
    /*global $U*/
    /*global _*/
    /*global $D*/
    angular.module('diag-account-feature-module').controller('diag-account-controller', [

        'server', '$scope', '$rootScope', '$routeParams', 'paymentApi', '$log', 'Analytics', 'localSession',
        function(db, s, r, params, paymentApi, $log, Analytics, localSession) {
            //        console.info('app.admin.diag:adminDiagsEdit');
            //
            s.pdf = {
                file: null
            };


            s.$on('item.read', function(item) {
                s.activated = !item.disabled;
                r.dom();
                s.$watch('activated', function(v) {
                    if (typeof v === 'boolean' && s.item && s.item.disabled != undefined) {
                        //s.item.disabled = !v;
                    }
                });
            });



            s.uncheckNotification = (type) => {
                if (!s.item.notifications[type]) return;
                if (type.toUpperCase().indexOf('CREATED') !== -1) {
                    return r.okModal('CREATED notifications are only triggered uppon account creation. You can still manually send this email from the notifications section.');
                }
                r.openConfirm('If you uncheck the flag, this notification will be sended in the next trigger event. Normally, this will happen after saving this document.', () => {

                    db.ctrl('Notification', 'removeWhen', {
                        _user: s.item._id,
                        type: type
                    }).then((res => {
                        s.item.notifications[type] = false;
                        r.dom();
                        //s.save(true);
                    }));


                });
            };


            s.createWallet = function() {
                paymentApi.registerUserWallet(s.item).then(function() {
                    r.dom();
                    r.infoMessage('Linked to ' + s.item.wallet + '.');
                    s.save(true);
                }).error(function(res) {
                    r.errorMessage();
                }).on('validate', function(msg) {
                    r.warningMessage(msg);
                });
            }

            //
            var isAdmin = r.userIs(['admin']);
            var isClient = r.userIs(['client']);
            var notCurrentDiag = (r.userIs(['diag']) && r.session()._id !== params.id);
            var logged = r.logged();

            s.inscriptionLabel = {
                val: "Suivant",
                update: function() {
                    r.dom(function() {
                        if (s.item._id) {
                            s.inscriptionLabel.val = "Suivant";
                        }
                        else {
                            s.inscriptionLabel.val = "Suivant"
                        }
                    });
                }
            };

            if (!logged) {
                //new diag public route
                r.__hideNavMenu = true;
                $U.once('route-exit:diag-inscription', function(url) {
                    r.__hideNavMenu = false;
                });
                r.toggleNavbar(true);
            }
            else {
                r.toggleNavbar(true);
                r.secureSection(s);
                if (isClient || notCurrentDiag) {
                    return r.handleSecurityRouteViolation();
                }
            }
            //
            $U.expose('s', s);
            //
            r.dom();
            //
            s.item = {
                email: '',
                password: '',
                address: '',
                userType: 'diag',
                priority: 100,
                commission: 0,
                disabled: true
            };

            if (isAdmin) {
                s.item.disabled = false
            }

            s.original = _.cloneDeep(s.item);


            s.department = null;
            s.removeDeparment = (nro) => {
                s.item.departments = s.item.departments || [];
                s.item.departments.splice(s.item.departments.indexOf(nro), 1);
            };
            s.addDepartment = () => {
                if (!s.department) return r.warningMessage('Indiquez le département');
                if (s.department.toString().length === 1) {
                    s.department = '0' + s.department;
                }
                s.item.departments = s.item.departments || [];
                if (!_.includes($D.availableFranceDepartementsNumbers(), s.department.toString())) {
                    return r.warningMessage('Le département est pas valide');
                }
                if (_.includes(s.item.departments, s.department)) {
                    return r.warningMessage('Le département est déjà sélectionné');
                }

                s.item.departments.push(s.department);
            };


            s.$watch('item.disabled', (v) => {
                if (v && s.item._id) {
                    db.ctrl('Order', 'count', {
                        _diag: s.item._id //{ $eq: s.item._id }
                    }).then(d => {
                        if (d.ok && d.result > 0) {
                            s.item.disabled = false;
                            r.warningMessage('Diag can only be disabled when there are not orders assigned.', 5000);
                        }
                    });
                }
            });

            s.$watch('item.priority', (v) => {

            });

            s.validatePriority = (v, okCb) => {
                if (!_.isUndefined(v) && !_.isNull(v) && isFinite(v) && !isNaN(v)) {
                    if (v === s.original.priority) return okCb();
                    db.ctrl('User', 'get', {
                        userType: 'diag',
                        priority: v,
                        __select: "email"
                    }).then((data) => {
                        if (data.result !== null) {
                            s.item.priority = s.original.priority;
                            r.warningMessage('Priority ' + v + ' is alredy assigned to ' + data.result.email, 5000);
                        }
                        else {
                            okCb();
                        }
                    });
                }
            };


            s.$watch('item.address', (v) => {
                //            console.info('ADDRESS:CHANGE', v);
            });
            s.addressChange = (v) => s.item.address = v;

            //
            if (params && params.id && params.id.toString() !== '-1') {
                r.dom(read, 1000);
            }
            else {
                reset();
            }
            //
            s.cancel = function() {
                r.route('diags');
            };

            function handleErrors(_err) {
                r.errorMessage('Error, try later.');
            }




            s.validate = () => {

                if (!localSession.logged()) {
                    Analytics.trackEvent('diag_account_sign_up_presave_validation', {
                        email: s.item.email,
                        siret: s.item.siret,
                        firstName: s.item.firstName,
                        lastName: s.item.lastName,
                        mobile: s.item.cellPhone
                    });
                }

                $U.ifThenMessage([
                    [s.item.email, '==', '', "email est nécessaire"],
                    [s.item.password, '==', '', "Password est nécessaire"],
                    [s.item.siret, '==', '', "siret est nécessaire"],
                    [s.item.commission == undefined, '==', true, "Commission est nécessaire"],
                    [isNaN(s.item.commission), '==', true, "Commission allowed values are 0..100"],
                    [(s.item.commission < 0 || s.item.commission > 100), '==', true, "Commission allowed values are 0..100"],
                    [!s.item.priority, '==', true, "Priority required"],
                    [isNaN(s.item.priority), '==', true, "Priority allowed values are 0..100"],
                    [(s.item.priority < 0 || s.item.priority > 100), '==', true, "Priority allowed values are 0..100"],

                    [s.item.departments && s.item.departments.length == 0, '==', true, "Un Département en charge est requis"],

                    [
                        s.item.notifications && s.item.notifications.DIAG_DIAG_ACCOUNT_CREATED == true && s.item._id && (!s.item.diplomes || (s.item.diplomes && s.item.diplomes.length == 0)), '==', true, 'A Diplome est nécessaire'
                    ]

                ], (m) => {
                    r.warningMessage(m[0], 5000);
                }, () => {
                    s.validatePriority(s.item.priority, () => {
                        s.save();
                    })
                });
            };









            s.diplomesExpirationDateChange = (_id) => {
                if (s.item.diplomesInfo[_id]) {
                    s.item.diplomesInfo[_id].expirationDateNotificationSended = false;
                    s.item.diplomesInfo[_id].expirationDateNotificationEnabled = false;
                    s.item.diplomesInfo[_id].expirationDate = s.diplomesData[_id].info.expirationDate;
                    db.ctrl('User', 'update', {
                        _id: s.item._id,
                        diplomesInfo: s.item.diplomesInfo
                    });
                }
            };
            s.diplomesExpirationDateNotificationEnabled = (_id) => {
                if (!r.userIs('admin')) return false;
                if (!s.item.diplomesInfo) return false;
                if (s.item.diplomesInfo[_id]) {
                    if (s.item.diplomesInfo[_id].expirationDateNotificationEnabled == undefined) {
                        s.item.diplomesInfo[_id].expirationDateNotificationEnabled = false;
                    }
                    return s.item.diplomesInfo[_id].expirationDateNotificationEnabled;
                }
                else {
                    return false;
                }

            };
            s.diplomesEnableExpirationDateNotification = (_id) => {
                if (!s.item.diplomesInfo) {
                    console.error('diplomesInfo expected.');
                }
                s.item.diplomesInfo[_id].expirationDateNotificationEnabled = true;
                s.item.diplomesInfo[_id].expirationDateNotificationSended = false
                db.ctrl('User', 'update', {
                    _id: s.item._id,
                    diplomesInfo: s.item.diplomesInfo
                }).then(d => {
                    r.infoMessage('Expiration Date Notification Enabled', 15000);
                });
            };

            s.diplomesUpdate = () => {
                if (s.item && s.item.diplomes && s.item.diplomes.length > 0) {
                    s.diplomesData = {};

                    var infoToDelete = [];
                    Object.keys(s.item.diplomesInfo || {}).forEach(_id => {
                        if (!_.includes(s.item.diplomes, _id)) {
                            infoToDelete.push(_id);
                        }
                    });
                    infoToDelete.forEach(k => {
                        delete s.item.diplomesInfo[k];
                    });

                    $log.info('diplomesUpdate: info to delete', _.clone(infoToDelete));

                    db.ctrl('User', 'update', {
                        _id: s.item._id,
                        diplomesInfo: s.item.diplomesInfo
                    });

                    $log.info('diplomesUpdate: looping diplomes');

                    s.item.diplomes.forEach((_id, k) => {

                        $log.info('diplomesUpdate: fetching file', _id);
                        db.ctrl('File', 'find', {
                            _id: _id
                        }).then(data => {
                            var file = data.result;
                            if (data.ok && file) {

                                $log.info('diplomesUpdate: file', _id);

                                s.item.diplomesInfo = s.item.diplomesInfo || {};
                                if (!s.item.diplomesInfo[_id]) {
                                    $log.info('diplomesUpdate: file lack info, creating', _id);
                                    s.item.diplomesInfo[_id] = {
                                        //obtentionDate: data.info.obtentionDate,
                                        //expirationDate: data.info.expirationDate,
                                        expirationDateNotificationEnabled: false,
                                        expirationDateNotificationSended: false,
                                        filename: file.filename
                                    };
                                    db.ctrl('User', 'update', {
                                        _id: s.item._id,
                                        diplomesInfo: s.item.diplomesInfo
                                    });
                                }
                                else {
                                    $log.info('diplomesUpdate: file has info, updating name', _id);
                                    s.item.diplomesInfo[_id].filename = file.filename;
                                }

                                //copy diplomesInfo values to file
                                for (var x in s.item.diplomesInfo[_id]) {
                                    file[x] = s.item.diplomesInfo[_id][x];
                                }

                                s.diplomesData[_id] = s.diplomesDataCreate(file);
                            }
                            else {
                                //if is unable to fetch the diplome, we assume that was removed from the db, so we delete the reference.
                                console.info('diplome-fetch-fail: deleting-reference', _id);
                                s.item.diplomes = _.pull(s.item.diplomes, _id);
                                s.item.diplomesInfo = _.pull(s.item.diplomesInfo, _id);
                                if (s.diplomesData[_id]) {
                                    delete s.diplomesData[_id];
                                }
                                if (Object.keys(s.diplomesData).length === 0) {
                                    s.diplomesNew();
                                }
                                db.ctrl('User', 'update', {
                                    _id: s.item._id,
                                    diplomes: s.item.diplomes,
                                });
                            }
                        });
                    });
                }
                else {
                    s.item.diplomes = s.item.diplomes || [];
                    s.diplomesNew();
                }
            };
            s.diplomesFile = {

            };
            s.diplomesFileChange = (id) => {
                console.info(id);
                setTimeout(() => {

                    s.diplomesSave(id);
                }, 1000)

            };
            s.diplomesData = {};
            s.diplomesDelete = (_id) => {
                if (!s.diplomesExists(_id)) return;
                var name = s.diplomesData[_id] && s.diplomesData[_id].info.filename || "File";
                r.openConfirm('Delete ' + name + ' ?', () => {
                    db.ctrl('File', 'remove', {
                        _id: _id
                    }).then((d) => {
                        if (d.ok) {
                            delete s.diplomes[_id];
                            delete s.diplomesInfo[_id];
                            delete s.diplomesData[_id];
                            if (Object.keys(s.diplomesData).length === 0) {
                                s.diplomesNew();
                            }
                            s.diplomesUpdate();
                        }
                    });
                });
            };
            s.diplomesExists = (_id) => s.item && s.item.diplomes && _.includes(s.item.diplomes, _id);
            s.diplomesDownload = (_id) => {
                window.open(db.URL() + '/File/get/' + _id, '_newtab');
            };
            s.diplomesNew = () => {
                if (s.item && s.item.diplomes.length !== Object.keys(s.diplomesData).length) {
                    return;
                }

                s.diplomesData[new Date().getTime()] = s.diplomesDataCreate();
            };
            s.diplomesLabel = _id => {
                //Pdf {{(d.info && "("+d.info.filename+")")||""}}
                var d = s.diplomesData[_id];
                if (s.diplomesExists(_id)) {
                    return 'Pdf ' + (d.info && "(" + d.info.filename + ")" || "unkown");
                }
                else {
                    d = s.diplomesFile[_id];
                    if (d && d.name) {
                        return 'Sélectionné: ' + d.name.toLowerCase() + ' ';
                    }
                    else {
                        return 'Sélectionnez le fichier';
                    }
                }
            };
            s.diplomesDataCreate = (info) => {
                var o = {
                    obtentionMaxDate: new Date(),
                    obtentionDateOpen: false,
                    obtentionDateClick: () => o.obtentionDateOpen = !o.obtentionDateOpen,
                    //
                    expirationMinDate: new Date(),
                    expirationDateOpen: false,
                    expirationDateClick: () => o.expirationDateOpen = !o.expirationDateOpen,
                    //
                    dateOptions: {
                        formatYear: 'yy',
                        startingDay: 1
                    },
                    info: {
                        filename: 'Sélectionnez le fichier',
                    }
                };

                if (info) {
                    o.info.obtentionDate = isFinite(new Date(info.obtentionDate)) && new Date(info.obtentionDate);
                    o.info.expirationDate = isFinite(new Date(info.expirationDate)) && new Date(info.expirationDate);
                    $log.info('diplomesDataCreate: from existing info', info);
                }
                else {
                    o.info.obtentionDate = new Date();
                    o.info.expirationDate = new Date();
                    $log.info('diplomesDataCreate: from scratch');
                }


                return o;
            };


            s.diplomeInfoApply = function() {
                s.item.diplomesInfo = s.item.diplomesInfo || {};
                Object.keys(s.diplomesData).forEach(id => {
                    if (s.diplomesExists(id)) {
                        var data = s.diplomesData[id];
                        s.item.diplomesInfo[id] = {
                            obtentionDate: data.info.obtentionDate,
                            expirationDate: data.info.expirationDate,
                            expirationDateNotificationEnabled: false,
                            expirationDateNotificationSended: false,
                            filename: data.info.filename
                        };
                    }
                });
            };

            s.diplomesSave = (_id) => {
                var file = s.diplomesFile[_id];
                if (!file) {
                    return r.warningMessage("Un fichier requis", 5000);
                }
                if (file.type !== 'application/pdf') {
                    return r.warningMessage("Format pdf nécessaire", 5000);
                }
                if (file.size / 1024 > 10240) {
                    $log.warn('size', file.size);
                    return r.warningMessage("Limite 10mb pour le fichier pdf", 5000);
                }

                if (!s.diplomesFile[_id]) return;
                var curr = _id;


                _uploadNew(); //starts here


                function _deleteCurr() {
                    db.ctrl('File', 'remove', {
                        _id: curr
                    });
                }

                function _uploadNew() {



                    r.infoMessage('Patientez, le chargement de vos certifications est en cours', 99999);


                    db.form('File/save/', {
                        name: s.diplomesFile[_id].name,
                        file: s.diplomesFile[_id]
                    }).then((data) => {
                        if (data.ok) {
                            var newId = data.result._id;
                            s.item.diplomes.push(newId);

                            s.item.diplomesInfo = s.item.diplomesInfo || {};
                            s.item.diplomesInfo[newId] = s.diplomesData[_id].info;

                            if (s.diplomesExists(curr)) {
                                s.item.diplomes = _.pull(s.item.diplomes, curr);
                                s.item.diplomesInfo = _.pull(s.item.diplomesInfo, curr);
                            }
                            db.ctrl('User', 'update', {
                                _id: s.item._id,
                                diplomes: s.item.diplomes,
                            }).then(data => {
                                if (data.ok) {
                                    if (s.diplomesExists(curr)) {
                                        _deleteCurr();
                                    }
                                    r.infoMessage('Vos certifications ont été chargées avec succès.', 5000);
                                }
                                else {
                                    r.warningMessage('Upload échoué, essayez plus tard.', 99999);
                                }
                                read(s.item._id);
                            });
                        }
                        else {
                            r.warningMessage('Upload échoué, essayez plus tard.', 99999);
                        }
                    });
                }
            };









            s.save = function(silent) {
                silent = silent || false;

                var payload = {
                    email: s.item.email,
                    userType: 'diag'
                };

                db.ctrl('User', 'find', payload).then(function(res) {
                    if (res.result.length > 0) {
                        var _item = res.result[0];
                        if (s.item._id && s.item._id == _item._id) {
                            _save(); //same diag
                        }
                        else {
                            if (!silent) {
                                s.warningMessage('Email address in use.');
                            }
                        }
                    }
                    else {
                        _save(); //do not exist.
                    }
                }).error(handleErrors);

                function _save() {
                    s.diplomeInfoApply();
                    db.ctrl('User', 'save', s.item).then((res) => {
                        var _r = res;

                        if (!localSession.logged() && !res.ok) {
                            Analytics.trackEvent('diag_account_sign_up_fail', {
                                errorMessage: res.err && res.err.message,
                                code: res.err && res.err.code
                            });
                        }

                        if (_r.ok) {
                            s.item._id = res.result._id;


                            if (silent) {
                                return;
                            }

                            if (!logged) {
                                if (s.item && s.item.diplomes && s.item.diplomes.length > 0) {
                                    r.route('login');

                                    if (!localSession.logged()) {
                                        Analytics.trackEvent('diag_account_sign_up_success', {
                                            email: s.item.email
                                        });
                                    }
                                    //Analytics.syncUser(s.item,Analytics.userId?false:true);

                                    return r.infoMessage("Votre compte Diagnostiqueur est en cours de création. Un agent Diagnostical vous contactera prochainement pour finaliser votre inscription.", 10000);
                                }
                                else {
                                    s.item = res.result;
                                    s.inscriptionLabel.update();
                                    r.dom();
                                    return r.infoMessage("T&eacute;l&eacute;verser un diplome s&apos;il vous pla&Icirc;t", 10000);
                                }
                            }
                            else {
                                r.route('diags', 0);
                            }

                        }
                        else {
                            if (!silent) {
                                r.warningMessage('Error, try later', 'warning');
                            }
                        }
                    }).error(handleErrors);

                }

            };
            s.delete = function() {
                r.openConfirm('Delete Diag ' + s.item.email + ' ?', function() {
                    db.ctrl('User', 'remove', {
                        _id: s.item._id
                    }).then(function(res) {
                        r.infoMessage('Deleted');
                        reset();
                        r.route('diags', 0);
                    }).error(function(err) {
                        r.errorMessage('Error, try later.');
                    });
                });
            };

            function reset() {
                s.item = _.cloneDeep(s.original);
            }

            s.update = read;

            function read() {
                var id = params.id;
                if (s.item._id) {
                    id = s.item._id;
                }

                //s.infoMessage('Loading . . .');
                db.ctrl('User', 'get', {
                    _id: id,
                    userType: 'diag'
                }).then(function(res) {
                    s.original = _.clone(res.result);
                    s.item = res.result;
                    s.$emit('item.read', s.item);
                    s.diplomesUpdate();
                    if (!res.ok) {
                        r.infoMessage('Registry not found, maybe it was deleted.', 'warning', 5000);
                    }
                    else {

                    }
                });
            }

        }
    ]);

})();
