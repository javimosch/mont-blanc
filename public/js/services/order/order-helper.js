(function() {
    /*global angular*/
    /*global _*/
    /*global $U*/
    /*global moment*/
    angular.module('app').service('orderHelper', function(localSession, $log, orderPrice, backendApi, appSettings, $rootScope, appText, appRouter) {
        var PAID_STATUS_LIST = ['prepaid', 'completed'];
        var CLIENT_TYPES_COMPANY = ['agency', 'enterprise', 'other'];
        var CLIENT_TYPES = ['agency', 'enterprise', 'landlord', 'other'];

        var self = {};
        $U.exposeGlobal('oh', self);



        self.status = (o) => {
            return {
                isPaid: () => _.includes(PAID_STATUS_LIST, o.status),
                isOrdered: () => o.status == 'ordered',
                isNotCreated: () => o.status !== 'created'
            };
        };

        self.CLIENT_TYPES = CLIENT_TYPES;
        self.isLandLord = (o) => {
            if (!o || !o._client || !o._client.clientType) return true;
            return !_.includes(CLIENT_TYPES_COMPANY, o._client.clientType);
        }
        self.isAgency = (o) => !self.isLandLord(o);

        function setPricesCalculationRequirements(data, remoteSettings, localData) {
            orderPrice.set({
                date: data.start,
                diagIsAutoentrepreneur: data._diag && data._diag.isAutoentrepreneur,
                buildingType: data.info.buildingType,
                modifiersPercentages: remoteSettings.pricePercentageIncrease,
                squareMetersPrice: localData.squareMetersPrice,//remoteSettings.metadata.squareMetersPrice,
                squareMeters: data.info.squareMeters,
                clientDiscountPercentage: data._client.discount,
                departmentMultipliers: remoteSettings.metadata.departmentMultipliers,
                postCode: data.postCode,
                basePrice: remoteSettings.metadata.prices.basePrice,
                selectedDiags: data.diags,
                availableDiags: localData.diags,
                couponDiscount:data.couponDiscount,
                diagCommissionRate: data._diag && data._diag.commission,
            });
        }

        self.createFromBookingData = (existingOrder) => {
            return $U.MyPromise(function(resolve, reject, emit) {

                //We fetch the booking data from cache
                var bookingData = self.getBookingDetails();
                //$log.debug('bookingData', bookingData);

                if (existingOrder && existingOrder._id) {
                    var bookingDataCached = bookingData;
                    bookingData = existingOrder;
                    for (var x in bookingDataCached) {
                        bookingData[x] = bookingDataCached[x];
                    }
                }
                else {
                    $log.warn('Invalid cached order. Using booking cache');
                }

                //validations
                if (!bookingData) return reject('booking data missing');
                if (!bookingData._diag) return reject('_diag property required');
                if (!bookingData.info) return reject('info property required');

                //We use the logged user or a default system user (temporarily)
                var session = localSession.getData();
                if (session._id && session.userType == 'client') {
                    withUser(session);
                }
                else {
                    backendApi.users.fetchBookingSystemUser().then(withUser);
                }

                function withUser(_user) {
                    bookingData._client = _user;
                    //$log.debug('withUser', _user);

                    //Fetch _diag
                    backendApi.User.getById({
                        _id: bookingData._diag
                    }).then((res) => withDiag(res.result));
                }

                function withDiag(_diag) {
                    bookingData._diag = _diag;

                    appSettings.syncAll().then((appSettings) => {
                        var remoteSettings = appSettings.databaseSettings;
                        var localData = appSettings.localData;
                        //$log.debug('appSettings', appSettings);

                        //Set prices
                        setPricesCalculationRequirements(bookingData, remoteSettings, localData);
                        orderPrice.assignPrices(bookingData);

                        //Set order info description
                        if (bookingData && bookingData.info && !bookingData.info.description) {
                            bookingData.info.description = self.getDescription(bookingData);
                        }
                        if (bookingData && bookingData.info && bookingData.info.addressBatiment === undefined) {
                            bookingData.info.addressBatiment = 'Sur rue';
                        }

                        //defaults for keysTime
                        if (!bookingData.keysTimeFrom && bookingData.start) {
                            bookingData.keysTimeFrom = moment(bookingData.start).subtract(2, 'hour');
                        }
                        if (!bookingData.keysTimeTo && bookingData.start) {
                            bookingData.keysTimeTo = moment(bookingData.start);
                        }

                        emit('available', bookingData);

                        //Lets try save
                        backendApi.Order.save(bookingData).then((res) => {
                            localSession.setMetadata({
                                _order: res.result
                            });
                            resolve(res.result);
                        }).error(reject).on('validate', (m) => emit('validate', m));

                    });


                }

            });
        };

        self.getSquareMetersSelectedIndex = (o) => {
            if (!o || !o.info || !o.info.squareMeters) return 0;
            var x = 0;
            for (var pos in appSettings.localData.squareMeters) {
                if (o.info.squareMeters == appSettings.localData.squareMeters[pos]) {
                    break;
                }
                else {
                    x++;
                }
            }
            return x;
        };

        self.updateFromBookingData = () => {
            return self.createFromBookingData(self.getFromSession());
        };

        self.populate = (data) => {
            return $U.MyPromise(function(resolve, err, emit) {
                var payload = {
                    _id: data._id,
                    __populate: {
                        _client: '_id email clientType address firstName lastName discount companyName siret wallet',
                        _diag: '_id email clientType address firstName lastName commission siret wallet'
                    }
                };
                return backendApi.Order.getById(payload).then(r => resolve(r.result)).error(err).on('validate', (msg) => emit('validate', msg));
            });
        };

        self.getDescription = function(data) {
            return getOrderDescriptionTitle(data) + getOrderDescriptionBody(data);
        };
        self.getDescription.title = () => getOrderDescriptionTitle(self.getBookingDetails());
        self.getDescription.body = () => getOrderDescriptionBody(self.getBookingDetails());

        self.getBookingDetails = () => {
            var m = localSession.getMetadata();
            var data = (m && m.bookingDetails) || {};
            //$log.info('Booking details are ', _.clone(data));
            return data;
        };
        self.setBookingDetails = (details) => {
            localSession.setMetadata({
                bookingDetails: details
            });
        };

        self.getFromSession = () => {
            var m = localSession.getMetadata();
            return m && m._order || {};
        };
        self.clearCache = ()=>{
            localSession.setMetadata({
                _order: {}
            });  
        };

        self.getDiagAccountDescription = (data) => {
            if (!data || !data._diag || !data._diag.firstName) return '';
            return 'Avec ' +
                (((data && data._diag && data._diag.firstName) && data._diag.firstName + ' ') || 'Pepe ') +
                (((data && data._diag && data._diag.lastName) && data._diag.lastName.substring(0, 1).toUpperCase() + ' ') || 'G');
        };
        self.getDateFormatted = (data) => {
            if (!data || !data.start) return '';
            var _date = data && data.start;
            var m = moment(_date).format('dddd D MMMM YYYY');
            m += ' à ' + $rootScope.momentTime(_date);
            return m.substring(0, 1).toUpperCase() + m.slice(1);
        };

        self.validateQuestions = validateQuestions;

        self.validateMetadata = validateMetadata;

        function validateMetadata(bookingDetails) {
            return $U.MyPromise(function(resolve, reject, emit) {
                //At welcome page, we reset order data (if there is an existing order, we keep it separately)
                if (appRouter.currentPath == '') {
                    /*$rootScope.sessionMetadata({
                        _order: {}
                    });*/
                    return resolve();
                }

                //If form questions are not OK, booking data cache is reseted and url jumps to welcome page
                self.validateQuestions(bookingDetails).then(() => {
                    resolve();
                }).error((error) => {
                    reject(error);
                });
            });
        }



        function validateQuestions(data) {
            return $U.MyPromise(function(resolve, reject, emit) {
                $U.ifThenMessage([
                    [data.info.buildingState, '==', undefined, appText.BOOKING_VALIDATE_OPERATION],
                    [data.info.buildingType, '==', undefined, appText.BOOKING_VALIDATE_BUILDING_TYPE],
                    [data.info.squareMeters, '==', undefined, appText.BOOKING_VALIDATE_BUILDING_SIZE],
                    [data.info.constructionPermissionDate, '==', undefined, appText.BOOKING_VALIDATE_CONSTRUCTION_DATE],
                    [data.info.gasInstallation, '==', undefined, appText.BOOKING_VALIDATE_GAZ],
                    [data.info.electricityInstallation, '==', undefined, appText.BOOKING_VALIDATE_ELECTRICITY],
                    [data.address, '==', undefined, appText.BOOKING_VALIDATE_ADDRESS],
                    [data.postCode, '==', 'France', appText.BOOKING_VALIDATE_ADDRESS_PRECISION],
                    [data.postCode, '==', 'Francia', appText.BOOKING_VALIDATE_ADDRESS_PRECISION]
                ], (m) => {
                    reject({
                        message: m[0]
                    });
                }, () => {
                    validateAddressDepartment(data.postCode, resolve, reject);
                });
            });
        }

        function validateAddressDepartment(postCode, resolve, reject) {
            var code = postCode.substring(0, 2);
            backendApi.User.custom('departmentCoveredBy', {
                department: code.toString()
            }).then(res => {
                if (!res.ok) {
                    return resolve && resolve(); //ignores validation
                }
                if (res.result == true) {
                    resolve && resolve();
                }
                else {
                    reject && reject({
                        addressDepartmentCovered: res.result
                    });
                }
            })

        };

        function getOrderDescriptionTitle(data) {
            if (!data || !data.info) return "";
            if (data && data.info && data.info.buildingState == '1') return "Pack Vente: ";
            else return "Pack Location: ";
        }

        function getOrderDescriptionBody(data) {
            if (!data || !data.info) return "";
            var rta = "";
            if (data && data.info && data.info.buildingType == '0') {
                rta += "Maison";
            }
            if (data && data.info && data.info.buildingType == '1') {
                rta += "Appartement";
            }
            if (data && data.info && data.info.buildingType == '2') {
                rta += "Local commercial";
            }
            if (data.city) {
                rta += " à " + data.city;
            }
            if (data && data.info && data.info.constructionPermissionDate) {
                rta += " " + data.info.constructionPermissionDate;
            }
            if (data && data.info && data.info.squareMetersPrice) {
                rta += ', ' + data.info.squareMeters;
            }
            if (!_.includes(['Non', 'Oui, Moins de 15 ans'], data.info.gasInstallation)) {
                rta += ', Gaz';
            }
            if (data.info.electricityInstallation != 'Moins de 15 ans') {
                rta += ", Électricité";
            }
            rta += '.';
            return rta;
        }

        return self;
    });
})();
