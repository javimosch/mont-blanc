/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
	var app = angular.module('app').service('paymentApi', function($rootScope, server, backendApi, $log, lemonwayApi) {
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
			registerDiagWallet: function(diag) {
				return MyPromise(function(resolve, err, emit) {

					if (diag._wallet) {
						return emit('validate', 'Diag already has a wallet');
					}
					if (!diag.email) {
						return emit('validate', 'Diag email required');
					}
					if (!diag.firstName) {
						return emit('validate', ' firstName required');
					}
					if (!diag.lastName) {
						return emit('validate', 'Diag lastName required');
					}

					var data = {
						clientMail: diag.email,
						clientFirstName: diag.firstName,
						clientLastName: diag.lastName,
						postCode: diag.postCode,
						mobileNumber: diag.cellPhone
					};

					return lemonwayApi.registerWallet(data).then(function(res) {
							if (res.result && res.result.WALLET) {
								diag.wallet = res.result.WALLET.ID;
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
