(function() {
    /*global angular*/
    angular.module('app').run(function(backendApi, $rootScope, $log, localSession, orderHelper, appRouter,diagnosticalRoutes) {
        appRouter.onChange((currentPath, nextPath) => {
           // $log.debug('resume-booking', 'routing', currentPath, nextPath);

            var paymentRoute = 'payment';
            
            if (nextPath !== paymentRoute && !diagnosticalRoutes.isBackofficeRoute(nextPath)) {
                //There is a valid order in cache ?
                var order = orderHelper.getFromSession();
                if (order && order._id) {
                    //$log.debug('There is a valid order in cache');


                    $rootScope.openModal({
                        backdrop: 'static', //disables close on click
                        templateUrl: 'views/modals/resume-booking-modal.html',
                        helpers:{
                            withScope:function(scope){
                                scope.orderDateHour=()=>{
                                  return $rootScope.momentDateTimeWords(order.start,'le');
                                };
                            }
                        }
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
                   // $log.debug('There is not a valid order', order);
                }
            }
            else {
               // $log.debug('resume-booking', 'route not satisfied', currentPath, nextPath);
            }

            //$log.debug('resume-booking', 'Check end');

        });
    });
})();
