(function() {
    /*global angular*/
    /*global _*/
    /*global $U*/
    /*global moment*/
    angular.module('app').service('orderHelper', function(localSession, $log, orderPrice, backendApi, appSettings, $rootScope) {
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
        self.createFromBookingData = () => {
            return $U.MyPromise(function(resolve, reject, emit) {

                //We fetch the booking data from cache
                var bookingData = self.getBookingDetails();
                //$log.debug('bookingData', bookingData);

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
                        orderPrice.set({
                            date: bookingData.start,
                            diagIsAutoentrepreneur: bookingData._diag && bookingData._diag.isAutoentrepreneur,
                            buildingType: bookingData.info.buildingType,
                            modifiersPercentages: remoteSettings.pricePercentageIncrease,
                            squareMetersPrice: remoteSettings.metadata.squareMetersPrice,
                            squareMeters: bookingData.info.squareMeters,
                            clientDiscountPercentage: bookingData._client.discount,
                            departmentMultipliers: remoteSettings.metadata.departmentMultipliers,
                            postCode: bookingData.postCode,
                            basePrice: remoteSettings.metadata.prices.basePrice,
                            selectedDiags: bookingData.diags,
                            availableDiags: localData.diags,

                            diagCommissionRate: bookingData._diag && bookingData._diag.commission,
                        });
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
            var data = m.booking && m.booking.item || m.params && m.params.item || {};
            return data;
        };
        self.getFromSession = () => {
            return localSession.getMetadata()._order || localSession.getMetadata().params && localSession.getMetadata().params._order || {};
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

        function getOrderDescriptionTitle(data) {
            if (data && data.info && data.info.buildingState == '1') return "Pack Vente: ";
            else return "Pack Location: ";
        }

        function getOrderDescriptionBody(data) {
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
