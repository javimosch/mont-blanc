/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
	var app = angular.module('app').service('lemonwayApi', function($rootScope, server, $log) {

		function getControlledErrorMsg(res) {
			return res.err.Msg + '  (LEMONWAY CODE ' + res.err.Code + ')';
		}

		function handle(controller, action, payload) {
			return MyPromise(function(resolve, err, emit) {
				server.ctrl(controller, action, payload).then(function(res) {
					if (res.ok != undefined && res.ok == false) {
						if (res.err && res.err.Code) {
							return emit('lemonway-error', getControlledErrorMsg(res));
						}
						err(res);
					} else {
						resolve(res);
					}
				}).error(function(res) {
					if (res.err && res.err.Code) {
						return emit('lemonway-error', getControlledErrorMsg(res));
					}
					err(res);
				});
			});
		}

		var self = {
			registerWallet: function(data) {
				return handle('lemonway', 'registerWallet', data);
			},
			getWalletDetails: function(data) {
				return handle('lemonway', 'getWalletDetails', data);
			},
			updateWalletDetails: function(data) {
				return handle('lemonway', 'updateWalletDetails', data);
			},
			registerCard: function(data) {
				return handle('lemonway', 'registerCard', data);
			},
			moneyInWithCardId: function(data) {
				return handle('lemonway', 'moneyInWithCardId', data);
			},
			sendPayment: function(data) {
				return handle('lemonway', 'sendPayment', data);
			},
			registerIBAN: function(data) {
				return handle('lemonway', 'registerIBAN', data);
			},
			moneyOut: function(data) {
				return handle('lemonway', 'moneyOut', data);
			}
		};
		$rootScope._lemonwayApi = self;
		return self;

	});
})();