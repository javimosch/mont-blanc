/*global angular*/
angular.module('betterSelect', []).directive('bselect', ['$log', '$parse', function($log, $parse) {

    return {
        scope: {
            options: "=options"
        },
        template: `
        <div class="dropdown with-caret">
            <button class="btn btn-default diags-input dropdown-toggle" type="button" id="id" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
                <span ng-bind="getLabel()"></span>
                <span class="caret"></span>
            </button>
            <ul class="dropdown-menu diags-select" aria-labelledby="dropdownMenu1">
                <li ng-repeat="(key,item) in items">
                    <a class="link" ng-click="select(item)" ng-bind="item.label"></a>
                </li>
            </ul>
        </div>
        `,
        link: function($scope, elem, attr) {
            var selected = null;
            if (!$scope.options) return $log.warn('options attribute required');
            var items = $scope.items = $scope.options.items.filter(v => {
                if (typeof v.show == 'boolean') return v.show;
                if (typeof v.show == 'function') return v.show();
                return true;
            });
            if (attr.placeholder) {
                items.unshift({
                    label: attr.placeholder,
                    value: '-1'
                });
            }



            //$log.log('INITIAL', $scope.initial);
            var compiledInitialValue = $scope.options.default == undefined ? '' : typeof $scope.options.default === 'function' ? $scope.options.default() : $scope.options.default;
            if (compiledInitialValue) {
                selectByValue(compiledInitialValue);
            }

            $scope.id = attr.id || 'select-' + Date.now();

            $scope.getLabel = () => {
                if (!selected) {
                    return '';
                }
                else {
                    return selected.label;
                }
            };
            $scope.select = (item) => {
                selectByValue(item.value);
            };

            function selectByValue(value) {
                var compiledValue = typeof value === 'function' ? value() : value;
                if (!compiledValue) $log.warn('BSELECT:', 'Trying to select undefined', value);
                compiledValue = compiledValue == undefined ? '' : compiledValue;
                //$log.log('BSELECT: SELECTING', compiledValue);
                var found = items.filter(v => {
                    if (typeof v === 'function') {
                        v() == compiledValue;
                    }
                    else {
                        return v.value.toString() == compiledValue.toString();
                    }
                });
                selected = found.length == 0 ? null : found[0];


                setModelValue(selected.value);
                if ($scope.options.change) {
                    $scope.options.change(selected.value);
                }
                //$log.info('BSELECT: SELECTED:', selected);
            }

            function setModelValue(value) {
                if (!attr.model) {
                    //$log.warn('BSELECT: There is no model to set');
                    return;
                }
                var getter = $parse(attr.model);
                var setter = getter.assign;
                setter($scope.$parent, value);
            }
        }
    };

}]);
