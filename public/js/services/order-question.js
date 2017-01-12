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

            function setMandatory(n, val) {
                s.diags.forEach((diag) => {
                    if ((n && diag.name == n) || !n) {
                        diag.mandatory = val;
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
            
            function dataRootExists(){
                return s.item && s.item.info;
            }
            
            function questionHasAValue(propertyName){
                return dataRootExists() && s.item.info[propertyName];
            }
            
            function isTruth(propertyName){
                return questionHasAValue(propertyName) && s.item.info[propertyName]==true;
            }
            
            function isSelling(){
                return isTruth('sell');
            }
            
            function selectDiagType(diagName,bool){
                if(!s.item) return;
                s.item.diags[diagName] = bool;
            }
            
            function setMandatoryTruthAndSelect(diagName){
                setMandatory(diagName,true);
                if(dataRootExists()){
                    selectDiagType(diagName,true);
                }
            }
            
            s.$watch('item.info.buildingType', onBuildingTypeChange);
            function onBuildingTypeChange(buildingType){
                if(!questionHasAValue('buildingType')) return;
                if(buildingType==BUILDING_TYPE.OFFICE){
                    if(isSelling()){
                        //Amiante / Termites / Carrez / DPE / ERNMT
                        setMandatory('dpe',true);
                        setMandatory('ernt',true);
                        setMandatory('carrez',true);
                    }else{
                        //Amiante / DPE / ERNMT
                        setMandatory('dpe',true);
                        setMandatory('ernt',true);
                        setMandatory('carrez',false);
                    }
                }
            }

            function updateChecks() {


                if(!s.item || !s.item.info) return;

                if (s.item.info.constructionPermissionDate === 'Avant le 01/01/1949') {
                    toggle('crep', true);
                    s.item.diags.crep = true; //mandatory
                    setMandatory('crep', true);
                } else {
                    s.item.diags.crep = false; //
                    toggle('crep', true);
                    setMandatory('crep', false);
                }

                if (departmentHasTermites() && s.item.info.sell) {
                    //toggle('termites', true);
                    s.item.diags.termites = true;
                    setMandatory('termites', true);
                } else {
                    toggle('termites', false);
                    s.item.diags.termites = false;
                    setMandatory('termites', false);
                }

                if (_.includes(['Avant le 01/01/1949', 'Entre 1949 et le 01/07/1997'], s.item.info.constructionPermissionDate)) {
                    toggle('dta', true);
                    s.item.diags.dta = true; //mandatory
                    setMandatory('dta', true);
                } else {
                    toggle('dta', true);
                    s.item.diags.dta = false;
                    setMandatory('dta', false);
                }

                if (_.includes(['Oui, Plus de 15 ans', 'Oui, Moins de 15 ans'], s.item.info.gasInstallation)) {
                    toggle('gaz', true);
                    if (s.item.info.sell == true && s.item.info.gasInstallation === 'Oui, Plus de 15 ans') {
                        s.item.diags.gaz = true;
                        setMandatory('gaz', true);
                    } else {
                        s.item.diags.gaz = false;
                        setMandatory('gaz', false);
                    }
                } else {
                    toggle('gaz', false);
                    setMandatory('gaz', false);
                }
                if (_.includes(['Plus de 15 ans', 'Moins de 15 ans'], s.item.info.electricityInstallation)) {
                    toggle('electricity', true);
                    if (s.item.info.sell == true && s.item.info.electricityInstallation === 'Plus de 15 ans') {
                        s.item.diags.electricity = true;
                        setMandatory('electricity', true);
                    } else {
                        s.item.diags.electricity = false;
                        setMandatory('electricity', false);
                    }
                } else {
                    toggle('electricity', false);
                    setMandatory('electricity', false);
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