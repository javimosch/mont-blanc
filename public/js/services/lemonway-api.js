/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
	var app = angular.module('app').service('lemonwayApi', function($rootScope, server, $log) {
		var self = {
			registerWallet: function(data) {
				return server.ctrl('lemonway', 'registerWallet', data);
			},
			getWalletDetails: function(data) {
				return server.ctrl('lemonway', 'getWalletDetails', data);
			},
			updateWalletDetails: function(data) {
				return server.ctrl('lemonway', 'updateWalletDetails', data);
			},
			registerCard: function(data) {
				return server.ctrl('lemonway', 'registerCard', data);
			},
			moneyInWithCardId: function(data) {
				return server.ctrl('lemonway', 'moneyInWithCardId', data);
			},
			sendPayment: function(data) {
				return server.ctrl('lemonway', 'sendPayment', data);
			},
			registerIBAN: function(data) {
				return server.ctrl('lemonway', 'registerIBAN', data);
			},
			moneyOut: function(data) {
				return server.ctrl('lemonway', 'moneyOut', data);
			}
		};
		$rootScope._lemonwayApi = self;
		return self;

	});
})();