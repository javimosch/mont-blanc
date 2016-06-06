/*global angular*/
/*global $U*/
/*global $D*/
/*global moment*/
/*global _*/
/*global tinymce*/
(function() {
    var app = angular.module('diags_ctrl_unit_tests', []);
    app.controller('diags_ctrl_unit_tests', ['server', '$scope', '$rootScope',
        function(db, s, r) {

            function orderPaymentDelegated() {
                if(!s._order){
                    return db.ctrl('Order','get',{}).then(res=>{
                       s._order = res.result;
                       orderPaymentDelegated();
                    });
                }
                $D.getInvoiceHTMLContent(db, s._order, r, html => {
                    db.ctrl('Notification', 'LANDLORD_ORDER_PAYMENT_DELEGATED', {
                        _user: s._user,
                        _order: s._order,
                        attachmentPDFHTML: html
                    }).then(data => {
                        console.info(data);
                    });
                });
            }

            s.order = {
                paymentDelegated: orderPaymentDelegated
            };

        }
    ]);
})()