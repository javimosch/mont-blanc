var app = angular.module('adminInspector', []);



app.controller('adminInspector', ['server', '$scope', '$rootScope', function(db, s, r) {
    console.warn('adminInspector');


    if(!r.logged()){
        r.adminRoute('LOGIN');
    }

    var vm = this;
    vm.selectedItems=[];
    vm.list = [];
    s.state = 'list';
    vm.item = {
        firstName: '',
        lastName: '',
        email:'test@test.com'
    };

    s.switchTo = function(n) {
        s.state = n;
    };

    s.save = function() {
        //vm.showMessage(vm.item, 'info');
        //return;
        db.save('inspector', vm.item).then(function(res) {
            vm.showMessage(res.data.message);
        }).error(vm.showMessage);
    };

    s.get = function() {
        db.get('inspector', vm.item).then(function(res) {
            vm.showMessage(res.data.message, 'info');
        }).error(vm.showMessage);
    }

    s.getAll = function(){
        db.getAll('inspector',{}).then(function(res){
            vm.list = res.data.result;
            console.log('inspectors:retrieved'+res.data.result.length);
        }).error(console.error);
    }

    if (vm.item._id) {
        s.get();
    }

    s.getAll();

}]);
