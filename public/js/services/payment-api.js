/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
	angular.module('app').service('paymentApi', function($rootScope, server, backendApi, $log, lemonwayApi) {
		function isCompany(d) {
			return d.siret && (d.isAutoentrepreneur==undefined||d.isAutoentrepreneur==false);
		}
		var self = {
			payOrder: function(data) {
				return MyPromise(function(resolve, err, emit) {
					return backendApi.payOrder(data).then(function(res) {
						resolve(res.ok, res);
					}).error(err).on('validate', (msg) => emit('validate', msg));
				});
			},
			moneyInWithCardId: function(data) {
				return MyPromise(function(resolve, err, emit) {
					lemonwayApi.moneyInWithCardId(data).then(function(res) {
							if (res.ok && res.result) {
								if (res.result.TRANS.HPAY.STATUS == '3') {
									resolve(true, res);
								}
								else {
									resolve(false, res);
								}
							}
							else {
								err(res);
							}
						})
						.error(err)
						.on('lemonway-error', (msg) => emit('validate', msg))
						.on('validate', (msg) => emit('validate', msg));
				});
			},
			registerUserWallet: function(user) {
				return MyPromise(function(resolve, err, emit) {

					if (user._wallet) {
						return emit('validate', 'User already has a wallet');
					}
					if (!user.email) {
						return emit('validate', 'User email required');
					}
					if (!user.firstName) {
						return emit('validate', 'User firstName required');
					}
					if (!user.lastName) {
						return emit('validate', 'User lastName required');
					}
					if (!user.userType) {
						return emit('validate', 'User userType required');
					}
					if (user.userType == 'client' && !user.clientType) {
						return emit('validate', 'User clientType required');
					}
					if (user.userType == 'diag' && !user.siret) {
						return emit('validate', 'User siret required');
					}


					var data = {
						clientMail: user.email,
						clientFirstName: user.firstName,
						clientLastName: user.lastName,
						postCode: user.postCode,
						mobileNumber: user.cellPhone
					};

					if (isCompany(user)) {
						data.isCompany = '1';
						data.companyName = user.companyName || (user.firstName + ' ' + user.lastName);
						data.companyIdentificationNumber = user.siret;
					}

					if (user.userType == 'client') {
						data.isTechWallet = '1';
					}

					return lemonwayApi.registerWallet(data).then(function(res) {
							if (res.result && res.result.WALLET) {
								user.wallet = res.result.WALLET.ID;
								resolve();
							}
							else {
								err(res);
							}
						}).error(err).on('lemonway-error', (msg) => emit('validate', msg))
						.on('validate', (msg) => emit('validate', msg));
				});
			}
		};
		$rootScope._lemonwayApi = self;
		return self;

	});
})();
