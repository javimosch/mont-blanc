/* @preserve
 *
 * angular-pretty-checkable
 * https://github.com/itslenny/angular-pretty-checkable
 *
 * Version: 0.1.7 - 02/22/2015
 * License: MIT
 */
angular.module("pretty-checkable", []).constant("prettyCheckableConfig", {
    activeClass: "checked",
    disabledClass: "disabled",
    toggleEvent: "click"
}).controller("PrettyCheckableController", ["prettyCheckableConfig", function(prettyCheckableConfig) {
    this.activeClass = prettyCheckableConfig.activeClass || "checked";
    this.disabledClass = prettyCheckableConfig.disabledClass || "disabled";
    this.toggleEvent = prettyCheckableConfig.toggleEvent || "click"
}]).directive("prettyRadio", function() {
    return {
        restrict: "E",
        require: ["prettyRadio", "ngModel"],
        controller: "PrettyCheckableController",
        link: function(scope, element, attrs, ctrls) {
            var buttonsCtrl = ctrls[0],
                ngModelCtrl = ctrls[1];
            element.addClass("prettyradio");
            if (attrs.color) {
                element.addClass("pretty-" + attrs.color);
            }
            element.prepend(angular.element("<a></a>"));
            if (attrs.label !== "false") {
                var labelText = scope.$eval(attrs.label ? attrs.label : attrs.value);
                var label = angular.element("<label>" + labelText + "</label>");
                if (attrs.labelLeft) {
                    element.prepend(label)
                }
                else {
                    element.append(label)
                }
            }
            attrs.$observe("disabled", function(value) {
                ngModelCtrl.$render()
            });
            ngModelCtrl.$render = function() {
                var disabledAttr = attrs.disabled === "true" || attrs.disabled === "false" ? attrs.disabled : scope.$eval(attrs.disabled);
                var ngDisabledAttr = attrs.ngDisabled === "true" || attrs.ngDisabled === "false" ? attrs.ngDisabled : scope.$eval(attrs.ngDisabled);
                element.find("a").toggleClass(buttonsCtrl.activeClass, angular.equals(ngModelCtrl.$modelValue, scope.$eval(attrs.value)));
                element.find("a").toggleClass(buttonsCtrl.disabledClass, disabledAttr || ngDisabledAttr ? true : false)
            };
            element.bind(buttonsCtrl.toggleEvent, function() {
                if (!element.find("a").hasClass(buttonsCtrl.activeClass) && !element.find("a").hasClass(buttonsCtrl.disabledClass)) {
                    scope.$apply(function() {
                        ngModelCtrl.$setViewValue(scope.$eval(attrs.value));
                        ngModelCtrl.$render()
                    })
                }
            })
        },
        template: "<div ng-transclude></div>",
        replace: true,
        transclude: true
    }
}).directive("prettyCheckbox", function() {
    return {
        restrict: "E",
        require: ["prettyCheckbox", "ngModel"],
        controller: "PrettyCheckableController",
        link: function(scope, element, attrs, ctrls) {
            var buttonsCtrl = ctrls[0],
                ngModelCtrl = ctrls[1];
            var isRequired = false;
            var isMultiple = false;
            element.addClass("prettycheckbox");
            if (attrs.color) {
                element.addClass("pretty-" + attrs.color);
            }
            element.prepend(angular.element("<a></a>"));
            attrs.$observe("required", function(value) {
                isRequired = !!value;
                validate(isChecked())
            });
            attrs.$observe("disabled", function(value) {
                ngModelCtrl.$render()
            });
            if (angular.isDefined(attrs.multiple)) {
                isMultiple = true
            }
            if (attrs.label !== "false") {
                var labelText = scope.$eval(attrs.label ? attrs.label : attrs.value);
                var label = angular.element("<label>" + labelText + "</label>");
                if (attrs.labelLeft) {
                    element.prepend(label)
                }
                else {
                    element.append(label)
                }
            }

            function getTrueValue() {
                return getCheckboxValue(attrs.value, true)
            }

            function getCheckboxValue(attributeValue, defaultValue) {
                var val = scope.$eval(attributeValue);
                return angular.isDefined(val) ? val : defaultValue
            }

            function validate(isChecked) {
                ngModelCtrl.$setValidity("require", isChecked || !isRequired)
            }

            function isChecked() {
                return element.find("a").hasClass(buttonsCtrl.activeClass)
            }

            function modelIsArray() {
                return angular.isArray(ngModelCtrl.$modelValue)
            }

            function modelIsChecked(trueValue) {
                if (modelIsArray()) {
                    return ngModelCtrl.$modelValue.indexOf(trueValue) > -1
                }
                return angular.equals(ngModelCtrl.$modelValue, trueValue)
            }

            function updateViewValue(value, remove) {
                var model = ngModelCtrl.$modelValue;
                if (isMultiple) {
                    var newModel = [];
                    if (modelIsArray()) {
                        angular.copy(model, newModel)
                    }
                    model = newModel;
                    var index = model.indexOf(value);
                    if (remove && index > -1) {
                        model.splice(index, 1)
                    }
                    else if (!remove && index === -1) {
                        model.push(value)
                    }
                }
                else {
                    model = remove ? false : value
                }
                ngModelCtrl.$setViewValue(model)
            }
            ngModelCtrl.$render = function() {
                var disabledAttr = attrs.disabled === "true" || attrs.disabled === "false" ? attrs.disabled : scope.$eval(attrs.disabled);
                var ngDisabledAttr = attrs.ngDisabled === "true" || attrs.ngDisabled === "false" ? attrs.ngDisabled : scope.$eval(attrs.ngDisabled);
                element.find("a").toggleClass(buttonsCtrl.activeClass, modelIsChecked(getTrueValue()));
                element.find("a").toggleClass(buttonsCtrl.disabledClass, disabledAttr || ngDisabledAttr ? true : false)
            };
            element.bind(buttonsCtrl.toggleEvent, function() {
                if (!element.find("a").hasClass(buttonsCtrl.disabledClass)) {
                    scope.$apply(function() {
                        var wasChecked = isChecked();
                        updateViewValue(getTrueValue(), wasChecked);
                        validate(!wasChecked);
                        ngModelCtrl.$render()
                    })
                }
            })
        },
        template: "<div ng-transclude></div>",
        replace: true,
        transclude: true
    }
});
//# sourceMappingURL=angular-pretty-checkable.min.js.map
