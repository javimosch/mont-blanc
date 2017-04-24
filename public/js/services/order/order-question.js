/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
    var app = angular.module('app').service('orderQuestion', function($rootScope, $log, appSettings, orderBooking) {

        /*
        info scheme
        
        
        buildingState
        buildingType
        squareMeters
        constructionPermissionDate
        gasInstallation
        electricityInstallation
        addressBatiment
        description
        
        */

        const BUILDING_STATE = {
            RENTING: 0,
            SELLING: 1
        };

        const BUILDING_TYPE = {
            HOUSE: 0,
            APPARTEMENT: 1,
            COMMERCIAL: 2
        };

        var hasLocalData = false;

        function bindAnswersToDefaultDiags(ctrlScope) {

            if (!hasLocalData) {
                return appSettings.syncAll().then(() => {
                    hasLocalData = true;
                    bindAnswersToDefaultDiags(ctrlScope);
                });
            }
            else {
                $log.debug(appSettings);
            }

            //s mean scope
            //an scope has an item key (order)
            //scope has local data loaded (s.diags has available diags)
            //an item should store questions answers in .info key (ex item.info.buildingType)


            ctrlScope.diags.forEach(function(val, key) {
                ctrlScope.item.diags[val.name] = (val.mandatory) ? true : false;
            });

            ctrlScope.$watch('item.info.constructionPermissionDate', onQuestionAnswersChange);
            ctrlScope.$watch('item.info.buildingState', onQuestionAnswersChange);
            ctrlScope.$watch('item.info.gasInstallation', onQuestionAnswersChange);
            ctrlScope.$watch('item.address', onQuestionAnswersChange);
            ctrlScope.$watch('item.info.electricityInstallation', onQuestionAnswersChange);
            ctrlScope.$watch('item.info.buildingType', onQuestionAnswersChange);
            ctrlScope.$watch('item.info.buildingState', onQuestionAnswersChange);

            function onQuestionAnswersChange() {
                if (!dataRootExists()) return;
                if (!questionHasAValue('buildingType')) return;
                var buildingType = ctrlScope.item.info.buildingType;
                if (buildingType == BUILDING_TYPE.COMMERCIAL) {
                    if (isSelling()) {
                        moveToMandatory(['dta', 'loiCarrez', 'dpe', 'ernt', 'termites']);
                        moveToOptional(['gaz', 'electricity', 'crep']);
                        //
                        checkTermitesUsingPostode();
                        checkConstructionDateAnswerForAmiante();
                    }
                    else {
                        moveToMandatory(['dta', 'dpe', 'ernt']);
                        moveToOptional(['gaz', 'electricity', 'crep', 'termites', 'loiCarrez']);
                        //
                        checkConstructionDateAnswerForAmiante();
                    }
                    checkConstructionDateAnswerForAmiante();
                    checkConstructionDateAnswerForPlomp();
                    checkTermitesUsingPostode();
                    checkGazInstallationAnswer();
                    checkElectricityAnswer();
                }
                else {
                    setMandatory('loiCarrez', true);
                    checkConstructionDateAnswerForAmiante();
                    checkConstructionDateAnswerForPlomp();
                    checkTermitesUsingPostode();
                    checkGazInstallationAnswer();
                    checkElectricityAnswer();
                }

                orderBooking.saveCardsSettings(ctrlScope.diags);
            }

            function departmentHasTermites() {
                var departments = appSettings.localData.termitesDepartments;
                if (!departments) $log.error('termitesDepartments are missings');
                if (ctrlScope.item.postCode != undefined) {
                    var code = ctrlScope.item.postCode.substring(0, 2);
                    return _.includes(departments.map(v => (v.toString())), code);
                }
                else {
                    $log.warn('departmentHasTermites no postCode');
                    return false;
                }
            };

            function moveToMandatory(stringArr) {
                stringArr.forEach(function(n) {
                    toggleVisibility(n, true);
                    setMandatory(n, true);
                    if (dataRootExists()) {
                        selectDiagType(n, true);
                    }
                })
            }

            function moveToOptional(stringArr) {
                stringArr.forEach(function(n) {
                    toggleVisibility(n, true);
                    setMandatory(n, false);
                    if (dataRootExists()) {
                        selectDiagType(n, false);
                    }
                })
            }

            function setMandatory(n, val) {
                ctrlScope.diags.forEach((diag) => {
                    if ((n && diag.name == n) || !n) {
                        diag.mandatory = val;
                    }
                });
            }

            function toggleVisibility(n, val) {
                ctrlScope.diags.forEach((diag) => {
                    if ((n && diag.name == n) || !n) {
                        diag.show = val;
                        if (diag.show == false) {
                            ctrlScope.item.diags[diag.name] = false;
                        }
                    }
                });
            };

            function dataRootExists() {
                return ctrlScope.item && ctrlScope.item.info;
            }

            function getAnswer(key) {
                return ctrlScope.item.info[key];
            }

            function questionHasAValue(propertyName) {
                return dataRootExists() && ctrlScope.item.info[propertyName];
            }

            function isTruth(propertyName) {
                return questionHasAValue(propertyName) && ctrlScope.item.info[propertyName] == true;
            }

            function isSelling() {
                if (questionHasAValue('buildingState')) {
                    return getAnswer('buildingState') == BUILDING_STATE.SELLING;
                }
                if (questionHasAValue('sell')) {
                    return getAnswer('sell') == true; //retro-compatible
                }
            }

            function selectDiagType(diagName, bool) {
                if (!ctrlScope.item) return;
                ctrlScope.item.diags[diagName] = bool;
            }

            function setMandatoryTruthAndSelect(diagName) {
                setMandatory(diagName, true);
                if (dataRootExists()) {
                    selectDiagType(diagName, true);
                }
            }

            function checkConstructionDateAnswerForPlomp() {
                if (ctrlScope.item.info.constructionPermissionDate === 'Avant le 01/01/1949') {
                    var buildingType = ctrlScope.item.info.buildingType;
                    if (buildingType != BUILDING_TYPE.COMMERCIAL) {
                        ctrlScope.item.diags.crep = true;
                        setMandatory('crep', true);
                    }
                    toggleVisibility('crep', true);
                }
                else {
                    ctrlScope.item.diags.crep = false; //
                    toggleVisibility('crep', true);
                    setMandatory('crep', false);
                }
            }

            function checkConstructionDateAnswerForAmiante() {
                if (_.includes(['Avant le 01/01/1949', 'Entre 1949 et le 01/07/1997'], ctrlScope.item.info.constructionPermissionDate)) {
                    toggleVisibility('dta', true);
                    ctrlScope.item.diags.dta = true; //mandatory
                    setMandatory('dta', true);
                }
                else {
                    toggleVisibility('dta', true);
                    ctrlScope.item.diags.dta = false;
                    setMandatory('dta', false);
                }
            }

            function checkTermitesUsingPostode() {
                //$log.debug('departmentHasTermites', departmentHasTermites());
                //$log.debug('isSelling', isSelling());
                if (departmentHasTermites() && isSelling()) {
                    //toggleVisibility('termites', true);
                    ctrlScope.item.diags.termites = true;
                    setMandatory('termites', true);
                }
                else {
                    toggleVisibility('termites', false);
                    ctrlScope.item.diags.termites = false;
                    setMandatory('termites', false);
                }
            }


            function checkGazInstallationAnswer() {
                if (_.includes(['Oui, Plus de 15 ans', 'Oui, Moins de 15 ans'], ctrlScope.item.info.gasInstallation)) {
                    toggleVisibility('gaz', true);
                    if (isSelling() && ctrlScope.item.info.gasInstallation === 'Oui, Plus de 15 ans') {
                        var buildingType = ctrlScope.item.info.buildingType;
                        if (buildingType != BUILDING_TYPE.COMMERCIAL) {
                            ctrlScope.item.diags.gaz = true;
                            setMandatory('gaz', true);
                        }
                    }
                    else {
                        ctrlScope.item.diags.gaz = false;
                        setMandatory('gaz', false);
                    }
                }
                else {
                    toggleVisibility('gaz', false);
                    setMandatory('gaz', false);
                }
            }


            function checkElectricityAnswer() {
                if (_.includes(['Plus de 15 ans', 'Moins de 15 ans'], ctrlScope.item.info.electricityInstallation)) {
                    toggleVisibility('electricity', true);
                    if (isSelling() && ctrlScope.item.info.electricityInstallation === 'Plus de 15 ans') {
                        var buildingType = ctrlScope.item.info.buildingType;
                        if (buildingType != BUILDING_TYPE.COMMERCIAL) {
                            ctrlScope.item.diags.electricity = true;
                            setMandatory('electricity', true);
                        }

                    }
                    else {
                        ctrlScope.item.diags.electricity = false;
                        setMandatory('electricity', false);
                    }
                }
                else {
                    toggleVisibility('electricity', false);
                    setMandatory('electricity', false);
                }
            }


            toggleVisibility(undefined, true); //all checks visibles.
        }

        var self = {
            isDiagTypeMandatory: function(diagName, diagsArray) {
                var diag = null;
                for (var x in diagsArray) {
                    diag = diagsArray[x];
                    if (diagName && diag.name == diagName) {
                        return diag.mandatory;
                    }
                }
                return false;
            },
            bindAnswersToDefaultDiags: bindAnswersToDefaultDiags
        };
        return self;
    });
})();
