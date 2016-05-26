/*global angular*/
/*global $U*/
/*global moment*/
(function(){
    var app = angular.module('diags_ctrl_tools', []);
    app.controller('diags_ctrl_tools', ['server',
    '$timeout', '$scope', '$rootScope', '$uibModal',
    function(db, $timeout, s, r, $uibModal) {
        $U.expose('s',s);
        
        s.dtpMin = moment().toDate().toString();
        s.datetimepicker={
            start: moment().add(1,'month')
        }
        s.name = 'Tools';
    }
]);
})();

