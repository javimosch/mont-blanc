/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
	var app = angular.module('app').service('paymentApi', function($rootScope, server, $log, lemonwayApi) {
		var self = {
			registerDiagWallet: function(diag) {
				return MyPromise(function(resolve, err, emit) {

					if(diag._wallet){
						return err('Diag already has a wallet');
					}
					if(!diag.email){
						return err('Diag email required');
					}
					if(!diag.firstName){
						return err('Diag firstName required');	
					}
					if(!diag.lastName){
						return err('Diag lastName required');	
					}

					var data = {
						clientMail: diag.email,
						clientFirstName: diag.firstName,
						clientLastName: diag.lastName,
						postCode: diag.postCode,
						mobileNumber: diag.cellPhone
					};

					return lemonwayApi.registerWallet(data).then(function(res){
						if(res&&res.WALLET){
							diag.wallet = res.WALLET.ID;
							resolve();
						}else{
							err(res);
						}
					}).error(err);
				});
			}
		};
		$rootScope._lemonwayApi = self;
		return self;

	});
})();