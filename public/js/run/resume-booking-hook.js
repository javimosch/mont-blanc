(function() {
    /*global angular*/
    angular.module('app').run(function(backendApi, $rootScope, $log, localSession, orderHelper, appRouter) {
        appRouter.onChange((currentPath, nextPath) => {
           // $log.info('resume-booking', 'routing', currentPath, nextPath);

            var paymentRoute = 'payment';
            if (nextPath !== paymentRoute) {
                //There is a valid order in cache ?
                var order = orderHelper.getFromSession();
                if (order && order._id) {
                    //$log.info('There is a valid order in cache');


                    $rootScope.openModal({
                        backdrop: 'static', //disables close on click
                        templateUrl: 'views/modals/resume-booking-modal.html',
                    }).then((resume) => {
                        if(resume){
                            appRouter.to($rootScope.URL.PAYMENT);
                        }else{
                            //Delete order in database
                            backendApi.Order.removeWhen({
                                _id:order._id
                            });
                            orderHelper.clearCache();
                        }
                    });

                }
                else {
                   // $log.info('There is not a valid order', order);
                }
            }
            else {
               // $log.info('resume-booking', 'route not satisfied', currentPath, nextPath);
            }

            //$log.info('resume-booking', 'Check end');

        });
    });
})();
