/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
    var app = angular.module('app').service('orderQuestion', function($rootScope, $log) {


        function bindAnswersToDefaultDiags(s) {
            //s mean scope
            //an scope has an item key (order)
            //scope has local data loaded (s.diags has available diags)
            //an item should store questions in .info key (ex item.info.sell)

            function departmentHasTermites() {
                if (s.termitesDepartments && s.item.department && s.item.postCode != undefined) {
                    var code = s.item.postCode.substring(0, 2);
                    return _.includes(s.termitesDepartments.map(v => (v.toString())), code);
                } else {
                    return false;
                }
            };

            function toggleMandatory(n, val) {
                s.diags.forEach((diag) => {
                    if ((n && diag.name == n) || !n) {
                        diag.mandatory = val;
                        //console.log('toggle-mandatory ',n,val);
                        r.dom();
                    }
                });
            }

            var toggle = (n, val) => {
                s.diags.forEach((diag) => {
                    if ((n && diag.name == n) || !n) {
                        diag.show = val;
                        if (diag.show == false) {
                            s.item.diags[diag.name] = false;
                        }
                    }
                });
            };
            s.diags.forEach(function(val, key) {
                s.item.diags[val.name] = (val.mandatory) ? true : false;
            });

            s.$watch('item.info.constructionPermissionDate', updateChecks);
            s.$watch('item.info.sell', updateChecks);
            s.$watch('item.info.gasInstallation', updateChecks);
            s.$watch('item.address', updateChecks);
            s.$watch('item.info.electricityInstallation', updateChecks);

            function updateChecks() {
                //$log.debug('orderQuestion updating diags');
                /*alredt done in questions validations
                                setTimeout(function() {
                                    if (s.item.country !== 'France') {
                                        s.warningMsg(MESSAGES.FRENCH_ADDRESS_REQUIRED);
                                    }
                                }, 2000);*/


                if (s.item.constructionPermissionDate === 'Avant le 01/01/1949') {
                    toggle('crep', true);
                    s.item.diags.crep = true; //mandatory
                    toggleMandatory('crep', true);
                } else {
                    s.item.diags.crep = false; //
                    toggle('crep', true);
                    toggleMandatory('crep', false);
                }

                if (departmentHasTermites()) {
                    toggle('termites', true);
                    s.item.diags.termites = true;
                    toggleMandatory('termites', true);
                } else {
                    toggle('termites', false);
                    s.item.diags.termites = false;
                    toggleMandatory('termites', false);
                }

                if (_.includes(['Avant le 01/01/1949', 'Entre 1949 et le 01/07/1997'], s.item.info.constructionPermissionDate)) {
                    toggle('dta', true);
                    s.item.diags.dta = true; //mandatory
                    toggleMandatory('dta', true);
                } else {
                    toggle('dta', true);
                    s.item.diags.dta = false;
                    toggleMandatory('dta', false);
                }

                if (_.includes(['Oui, Plus de 15 ans', 'Oui, Moins de 15 ans'], s.item.info.gasInstallation)) {
                    toggle('gaz', true);
                    if (s.item.info.sell == true && s.item.info.gasInstallation === 'Oui, Plus de 15 ans') {
                        s.item.diags.gaz = true;
                        toggleMandatory('gaz', true);
                    } else {
                        s.item.diags.gaz = false;
                        toggleMandatory('gaz', false);
                    }
                } else {
                    toggle('gaz', false);
                    toggleMandatory('gaz', false);
                }
                if (_.includes(['Plus de 15 ans', 'Moins de 15 ans'], s.item.info.electricityInstallation)) {
                    toggle('electricity', true);
                    if (s.item.info.sell == true && s.item.info.electricityInstallation === 'Plus de 15 ans') {
                        s.item.diags.electricity = true;
                        toggleMandatory('electricity', true);
                    } else {
                        s.item.diags.electricity = false;
                        toggleMandatory('electricity', false);
                    }
                } else {
                    toggle('electricity', false);
                    toggleMandatory('electricity', false);
                }

            }
            toggle(undefined, true); //all checks visibles.
        }

        var self = {
            bindAnswersToDefaultDiags: bindAnswersToDefaultDiags
        };
        return self;
    });
})();