(function() {
    /*global angular mixpanel amplitude*/
    angular.module('app')

    .service('Analytics', ['localSession', '$log', '$rootScope', 'snippets', function(localSession, $log, $rootScope, snippets) {

        const MIXPANEL_TRACK_VIEWS = false;

        function isMixpanel() {
            return typeof window.mixpanel !== 'undefined';
        }

        function isAmplitude() {
            return typeof window.amplitude !== 'undefined';
        }

        var self = {};
        snippets.exposeGlobal('an', self);
        self.trackView = (name, params) => {
            params = params || {};
            Object.assign(params, {
                name: name
            });
            name = 'page_view';
            self.trackEvent(name, params);
        };
        self.trackEvent = (name, params) => {
            if (!MIXPANEL_TRACK_VIEWS && name == 'page_view') return;
            params = params || {};
            if (isMixpanel()) mixpanel.track(name, params);
            if (isAmplitude()) amplitude.getInstance().logEvent(name, params);
        };
        self.appendToUserPropertyList = (name, value) => {
            if (isMixpanel()) mixpanel.people.append(name, value);
            if (isAmplitude()) {
                amplitude.getInstance().identify(new amplitude.Identify().append(name, value));
            }
        };
        self.incrementUserProperty = (name, q) => {
            if (isMixpanel()) mixpanel.people.increment(name, q);
            if (isAmplitude()) {
                amplitude.getInstance().identify(new amplitude.Identify().add(name, q || 1));
            }
        };
        self.unsetColdown = null;
        self.unsetUser = () => {
            if (isMixpanel()) {
                mixpanel.reset();
            }
            self.unsetColdown = Date.now();
            self.userId = null;
            $log.log('(analytics) unset user');
        };
        self.setUserId = (id, isAlias) => {
            if (isMixpanel()) {
                if (isAlias) {
                    mixpanel.alias(id);
                }
                else {
                    mixpanel.identify(id);
                }
            }
            if (isAmplitude()) {
                amplitude.setUserId(id);
            }
            self.userId = id;
        };
        self.setUserProperty = (params, once) => {
            if (once) {
                if (isMixpanel()) mixpanel.people.set_once(params);
                if (isAmplitude()) amplitude_setUserProperties(params, once);
            }
            else {
                if (isMixpanel()) mixpanel.people.set(params);
                if (isAmplitude()) amplitude_setUserProperties(params);
            }
        };

        function normalizeAmplitudeProperty(prop) {
            if(!prop) return prop;
            prop = prop.replace('$', '');
            return prop;
        }

        function cleanProperties() {
            if (isAmplitude()) {
                var props = ['$email', '$first_name', '$last_name', 'pages_visited', 'user_id'];
                var identify = new amplitude.Identify();
                for (var x in props) {
                    identify.unset(props[x]);
                }
                amplitude.getInstance().identify(identify);
            }
        }

        function amplitude_setUserProperties(params, once) {
            cleanProperties();
            var identify = new amplitude.Identify();
            for (var x in params) {
                if (once) {
                    identify.setOnce(x, normalizeAmplitudeProperty(params[x]));
                }
                else {
                    identify.set(x, normalizeAmplitudeProperty(params[x]));
                }
            }
            amplitude.getInstance().identify(identify);
        }

        self.syncUser = (user,isAlias) => {
            //isAlias means is the first time we identify the user and there is a 
            //session on the way. We want to capture the events of the current session if possible.
            if (self.unsetColdown) {
                if (Date.now() - self.unsetColdown < 1000 * 5) {
                    return $log.warn('(analytics) cannot sync user, unset coldown inside 5 sec');
                }
                else {
                    self.unsetColdown = null;
                }
            }
            self.setUserId(user._id,isAlias);
            self.setUserProperty({
                $email: user.email,
                userType:user.userType
            }, true);
            self.setUserProperty({
                $first_name: user.firstName,
                $last_name: user.lastName,
                $phone: user.cellPhone
            });
        };

        function bootstrap() {

            if (!isMixpanel()) {
                $log.warn('Analytics: mixpanel disabled');
            }
            if (!isAmplitude()) {
                $log.warn('Analytics: amplitude disabled');
            }

            $rootScope.$on('click_logout', () => self.unsetUser());


            if (localSession.isLogged()) {
                localSession.update().then(user => {
                    if (!user) return;
                    if (user.userType == 'admin') return;
                    self.syncUser(user);
                })
            }
        }
        bootstrap();



        return self;
    }]);
})();
