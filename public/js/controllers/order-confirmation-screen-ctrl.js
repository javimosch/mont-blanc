/*global angular*/
/*global $D*/
/*global $U*/
angular.module('app').controller('orderConfirmation', ['server',
    '$timeout', '$scope', '$rootScope', '$uibModal', 'diagSlots', '$log',
    function(db, $timeout, s, r, $uibModal, diagSlots, $log) {

        createProperties();
        if (hasValidProperties()) {
            createActions();
        }


        function createProperties() {
            window.s = s;
            s.order = r.params && r.params._order || null;

            s.data = generateData(s.order);
            if (s.order && r.params._client && r.params._client.firstName) {
                s.order._client = r.params._client;
            }
        }


        function hasValidProperties() {
            if (!s.order) {
                $log.warn('r.params expect _order to be not null');
                r.route('home');
                return false;
            }
            if (!s.order._client.firstName) {
                $log.warn('r.params expect _order pupulated with _client details.');
                r.route('home');
                return false;
            }
            return true;
        }



        function generateData(order) {
            if (!order) return;
            var keysInfo = (order.keysAddress || order._client.address) + ' / ' + r.momentDateTimeWords(s.order.keysTimeFrom) +
                ' - ' + r.momentTime(s.order.keysTimeTo);
            return Object.assign(order, {
                diagNameConvertion: $D.diagNameConvertion,
                keysInfo: keysInfo
            });
        }

        function createActions() {
            s.back = function() {
                r.route('home');
            };
        }


    }
]);
