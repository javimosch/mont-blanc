/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
    var app = angular.module('app').service('orderPrice', function($rootScope, $log) {
        var settings = {
            buildingType: undefined,
            date: undefined, //date to get day ratio
            modifiersPercentages: {}, //pricePercentageIncrease
            squareMetersPrice: {},
            squareMeters: undefined, //selected squareMeters (order question)
            clientDiscountPercentage: undefined, //selected client discount (order _client.discount field)
            departmentMultipliers: {}, // db.settings.metadata.departmentMultipliers
            postCode: '',
            basePrice: undefined,
            selectedDiags: {},
            availableDiags: {},
            diagCommissionRate: undefined,
            diagIsAutoentrepreneur: false,
            VATRate: 20
        };

        $rootScope._orderPriceSettings = settings;


        function getBasePrice(diagsInCart, diagsAvailable) {
            var diag = null,
                rta = 0;
            Object.keys(diagsInCart).forEach(function(diagName) {
                if (!diagsInCart[diagName]) return;
                diag = diagsAvailable.filter(d => d.name == diagName)[0];
                rta += diag.price;
            });
            return rta;
        }

        function getDepartmentModifierPercentage(postCode, percentageTable) {
            if (postCode && percentageTable) {
                var department = postCode.substring(0, 2);
                return percentageTable[department] !== undefined && (percentageTable[department]) || 0;
            }
            else {
                return 0;
            }
        }

        function tenthDown10(v) {
            return (parseInt(parseInt(v) / 10, 10) * 10).toFixed(2);
        }


        var isSaturday = (d) => moment(d).weekday() === 5;
        var isSunday = (d) => moment(d).weekday() === 6;
        var isTomorrowSaturday = (d) => moment().add(1, 'day').weekday() === 5 &&
            moment(d).isSame(moment().add(1, 'day'), 'day');
        var isTomorrowSunday = (d) => moment().add(1, 'day').weekday() === 6 &&
            moment(d).isSame(moment().add(1, 'day'), 'day');
        var isTomorrow = (d) => moment(d).isSame(moment().add(1, 'day'), 'day');
        var isTodaySaturday = (d) => moment().weekday() === 5 && moment().isSame(moment(d), 'day');
        var isTodaySunday = (d) => moment().weekday() === 6 && moment().isSame(moment(d), 'day');
        var isToday = (d) => moment().isSame(moment(d), 'day');


        var self = {
            fixedPriceTTC: null,
            _settings: settings,
            set: function(_settings) {
                Object.assign(settings, _settings);
                self.fixedPriceTTC = null;
                //$log.debug('orderPrice setting is now ', _.clone(settings));
            },
            getDayModifierPercentage: function(percentages, date) {
                if (isTodaySaturday(date)) {
                    return percentages.todaySaturday;
                }
                if (isTodaySunday(date)) {
                    return percentages.todayMondayToFriday;
                }
                if (isToday(date)) {
                    return percentages.todayMondayToFriday;
                }
                if (isTomorrowSaturday(date)) {
                    return percentages.tomorrowSaturday;
                }
                if (isTomorrowSunday(date)) {
                    return percentages.tomorrowSunday;
                }
                if (isTomorrow(date)) {
                    return percentages.tomorrowMondayToFriday;
                }
                if (isSaturday(date)) {
                    return percentages.saturday;
                }
                if (isSunday(date)) {
                    return percentages.sunday;
                }
                return percentages.mondayToFriday;
            },
            getRatioModifierFor: function(type) {
                switch (type) {
                    case 'day':
                        return this.getDayModifierPercentage(settings.modifiersPercentages, settings.date);
                        break;
                    case 'size':
                        if (settings.squareMetersPrice && settings.squareMeters != undefined) {
                            return settings.squareMetersPrice[settings.squareMeters]
                        }
                        else {
                            return 0;
                        }

                        break;
                    case 'client':
                        return settings.clientDiscountPercentage || 0;
                        break;
                    case 'department':
                        if (!settings.departmentMultipliers || !settings.postCode) {
                            return 0;
                        }
                        return getDepartmentModifierPercentage(settings.postCode, settings.departmentMultipliers);
                        break;
                    case 'vat':
                        if (!settings.modifiersPercentages || settings.modifiersPercentages.VATRate == undefined) {
                            return 20;
                        }
                        return settings.modifiersPercentages.VATRate
                        break;
                    case 'commercial':
                        if (!settings.modifiersPercentages || !settings.modifiersPercentages.commercialBuilding) {
                            return 70;
                        }
                        return settings.modifiersPercentages.commercialBuilding || 70
                        break;
                    default:
                        $log.warn('no type', type);
                        return 0;
                }
            },
            getSelectedDiagsPrice: function() {
                return getBasePrice(settings.selectedDiags, settings.availableDiags);
            },
            getPriceBase: function() {
                if (!settings.basePrice) return 0;
                var base = parseFloat(settings.basePrice);
                return base + this.getSelectedDiagsPrice();
            },
            getDayRatio: function(k) {
                if (!settings.modifiersPercentages) {
                    $log.error('orderPrice modifiersPercentages required.');
                    return;
                }
                return settings.modifiersPercentages[k];
            },
            getPriceWithDay: function(k) {
                if (k) {
                    return (this.getPriceBase() * (1 + this.getDayRatio(k) / 100)).toFixed(2);

                }
                else {
                    return this.getPriceBase() * (1 + this.getRatioModifierFor('day') / 100);
                }
            },
            getPriceWithSize: function(k) {
                return (this.getPriceWithDay(k) * (1 + this.getRatioModifierFor('size') / 100)).toFixed(2);
            },
            getPriceWithDiscount: function(k) {
                return (this.getPriceWithSize(k) * (1 - this.getRatioModifierFor('client') / 100)).toFixed(2);
            },
            getPriceWithDepartment: function(k) {
                //100*((0.9*100)/100)
                return (this.getPriceWithDiscount(k) * (this.getRatioModifierFor('department') || 1)).toFixed(2);
            },
            getPriceWithCommercial: function(k) {
                if (settings.buildingType != undefined && settings.buildingType == '2') {
                    return (this.getPriceWithDepartment(k) * (1 + this.getRatioModifierFor('commercial') / 100)).toFixed(2);
                }
                else {
                    return this.getPriceWithDepartment(k);
                }
            },
            getPriceHT: function(k) {
                if (settings.diagIsAutoentrepreneur) {
                    return this.getPriceTTC(k);
                }
                return (this.getPriceTTC(k) / (1 + this.getRatioModifierFor('vat') / 100)).toFixed(2);

            },
            getVATPrice: function(k) {
                return (this.getPriceTTC(k) - this.getPriceHT(k)).toFixed(2);
            },
            getPriceWithVAT: function(k) {
                var vatRate = this.getRatioModifierFor('vat');
                return (this.getPriceWithCommercial(k) * (1 + vatRate / 100)).toFixed(2);
            },
            getPriceTTCBeforeDiscountCoupon: function(k) {
                var rta = 0;
                if (settings.diagIsAutoentrepreneur) {
                    rta = this.getPriceWithCommercial(k);
                }
                else {
                    rta = this.getPriceWithVAT(k);
                }
                if (isNaN(rta)) {
                    return 0;
                }
                return rta;
            },
            getPriceTTCWithDiscountCoupon: function(k) {
                var rta = this.getPriceTTCBeforeDiscountCoupon(k);
                if (settings.couponDiscount && rta > 0) {
                    return rta - ((rta * settings.couponDiscount) / 100);
                }
                return rta;
            },
            /*This should be the final client price*/
            getPriceTTC: function(k) {
                if (self.fixedPriceTTC) return self.fixedPriceTTC;
                return tenthDown10(this.getPriceTTCWithDiscountCoupon(k));
            },
            getPriceRemunerationHT: function(priceTTC, revenueTTC) {
                priceTTC = priceTTC || this.getPriceTTC();
                revenueTTC = revenueTTC || this.getPriceRevenueTTC();
                if (!settings.diagCommissionRate) {
                    return 0;
                }
                return (priceTTC - revenueTTC).toFixed(2);
            },
            getPriceRevenueHT: function(priceHT) {
                priceHT = priceHT || this.getPriceHT();
                return (priceHT * (settings.diagCommissionRate && (100 - settings.diagCommissionRate) || 1) / 100).toFixed(2);
            },
            getPriceRevenueTTC: function(revenueHT) {
                revenueHT = revenueHT || this.getPriceRevenueHT();
                return (parseFloat(revenueHT) * (1 + (this.getRatioModifierFor('vat') / 100))).toFixed(2);
            },

            recalculateRevenues: function(priceHT, vatRate, diagAccountCommission) {
                vatRate = (1 + parseFloat(vatRate || 20) / 100); //1.20
                var revenueRate = (100 - (diagAccountCommission || 1)) / 100; //0.5 0.7 etc
                var revenueHT = priceHT * revenueRate;
                var revenueTTC = revenueHT * vatRate;
                var revenueDiagHT = (Math.round(priceHT * vatRate)) - revenueTTC;
                return {
                    diagRemunerationHT: revenueDiagHT.toFixed(2),
                    revenueHT: revenueHT.toFixed(2)
                };
            },
            //Helper function to assign prices in an existing order.
            assignPrices: function(object) {

                /*
                $log.debug('prices settings',settings);
                $log.debug('getSelectedDiagsPrice',this.getSelectedDiagsPrice());
                $log.debug('getPriceBase',this.getPriceBase());
                $log.debug('getPriceWithDay',this.getPriceWithDay());
                $log.debug('getPriceWithSize',this.getPriceWithSize());
                $log.debug('getPriceWithDiscount',this.getPriceWithDiscount());
                $log.debug('getPriceWithDepartment',this.getPriceWithDepartment());
                $log.debug('getPriceWithCommercial',this.getPriceWithCommercial());
                $log.debug('getPriceTTC',this.getPriceTTC());
                $log.debug('getPriceHT',this.getPriceHT());
                $log.debug('getVATPrice',this.getVATPrice());
                $log.debug('getPriceRemunerationHT',this.getPriceRemunerationHT());
                $log.debug('getPriceRevenueHT',this.getPriceRevenueHT());
                $log.debug('getPriceRevenueTTC',this.getPriceRevenueTTC());
                */

                object.price = this.getPriceTTC();
                object.priceHT = this.getPriceHT();
                object.revenueHT = this.getPriceRevenueHT();
                object.diagRemunerationHT = this.getPriceRemunerationHT();
                object.vatRate = this.getRatioModifierFor('vat');
                object.vatPrice = this.getVATPrice();
                //$log.debug('prices are set',object);
            }
        };
        $U.exposeGlobal('op', self);
        return self;
    });
})();
