/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
    var app = angular.module('app').service('appText', function($rootScope, $log) {
        var TEXT = {
            BOOKING_PROCEED_TO_DATE_SELECTION_FLASH_MESSAGE: 'Sélectionnez au moins un choix',
            VALIDATE_ADDRESS:"Veuillez re-saisir votre adresse.<br>Au moment ou Google vous la propose, merci de cliquer dessus. Cela nous permet de vous localiser, et de vous proposer le diagnostiqueur le plus proche. Meilleur prix. Moins de CO2",
            VALIDATE_BUILDING_TYPE:"Sélectionner votre type de bien (Appartement, Maison, Commercial).<br>Si votre demande concerne un parking, une dépendance, une cave, un garage ou un box, Merci de nous contacter au 01.79.72.82.33.",
            VALIDATE_CONSTRUCTION_DATE:"Sélectionner la période de votre permis de construire.<br>Vous avez un doute? Contactez le SPF de votre commune.Vous trouverez les coordonnées ici: SPF.pdf<br>Avant 1949, le diagnostic Plomb est obligatoire.<br>Avant juillet 1997, le diagnostic Amiante est obligatoire.",
            VALIDATE_ADDRESS_PRECISION:"Merci de saisir une adresse précise et complète : numéro de la voie suivi du nom de la voie et de la ville.<br>En cas de problème, n&#39;hésitez pas à nous joindre au 01.79.72.82.33"
        };
        $rootScope.TEXT = TEXT;
        return TEXT;
    });
})();
