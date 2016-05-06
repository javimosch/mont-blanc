/*global angular*/
/*global $U*/
(function(){
    var app = angular.module('diags_ctrl_settings', []);
     app.controller('diags_ctrl_settings', ['server', '$scope', '$rootScope',
        function(db, s, r) {
            $U.expose('s', s);
            r.toggleNavbar(true);
            r.secureSection(s);
            if (r.userIs(['diag', 'client'])) {
                return r.handleSecurityRouteViolation();
            }
            $U.expose('s',s);
            
            s.menuItems = {
                'Texts':'texts',
                'Notifications':'notifications',
                'Logs':'logs',
                "Tools":'tools',
                "Price Modifiers":"price-modifiers",
                "Documentation":"documentation"
            };
            
            s.priceModifiers = {
                "Today Monday to Friday (+%)":"todayMondayToFriday",
                "Today Saturday (+%)":"todaySaturday",
                "Today Sunday (+%)":"todaySunday",
                "Tomorrow Monday to Friday (+%)":"tomorrowMondayToFriday",
                "Tomorrow Saturday (+%)":"tomorrowSaturday",
                "Tomorrow Sunday (+%)":"tomorrowSunday",
                "Monday to Friday (+%)":"mondayToFriday",
                "Saturday (+%)":"saturday",
                "Sunday (+%)":"sunday"
            };
            
            s.item = {
                pricePercentageIncrease: {
                    //today: 0, //deprecated for today[DAY]
                    todayMondayToFriday: 30,
                    todaySaturday: 50,
                    todaySunday: 130,

                    //tomorrow: 0, //deprecated for tomorrow[DAY]
                    tomorrowMondayToFriday: 10,
                    tomorrowSaturday: 40,
                    tomorrowSunday: 110,

                    mondayToFriday: 0,
                    saturday: 30,
                    sunday: 100,
                }
            };
            function validNumber(input) {
                var rta = !input;
                if (rta) return false;
                rta = isNaN(input);
                if (rta) return false;
                if (!$U.numberBetween(input, 0, 500)) return false;
                return true;
            }

            s.validate = () => {
                var rules = [];
                for (var x in s.item.pricePercentageIncrease) {
                    rules.push([
                        validNumber(s.item.pricePercentageIncrease[x]), '==', false, 
                        x+ " valid value in  0 .. 500"
                    ]);
                }
                $U.ifThenMessage(rules, r.warningMessage, s.save);
            };
            s.save = () => {
                db.ctrl('Settings', 'save', s.item).then(d => {
                    if (d.ok) {
                        r.infoMessage('Changes saved');
                    }
                });
            };
            s.read = () => {
                db.ctrl('Settings', 'getAll', {}).then(r => {
                    if (r.ok && r.result.length > 0) s.item = r.result[0];
                    else {
                        s.save();
                    }
                });
            };
            s.read();
        }
    ]);
})();