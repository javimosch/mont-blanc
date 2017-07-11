/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
    var app = angular.module('app').service('appText', function($rootScope, $log) {
        var TEXT = {
            PAYMENT_FRAMEWORK_TEXT: "Paiement simplifié et sécurisé avec Lemon Way accrédité ACPR",
            WELCOME_MAIN_TEXT: "Accédez aux calendriers en live des diagnostiqueurs immobiliers certifiés, disponibles, au bon prix*",
            WELCOME_PHONE_LEFT_TEXT: "Nous joindre au",

            BOOKING_VALIDATE_BUILDING_SIZE: "Répondre Superficie",
            BOOKING_VALIDATE_GAZ: "Répondre Gaz",
            BOOKING_VALIDATE_ELECTRICITY: "Répondre Electricité",
            BOOKING_VALIDATE_OPERATION: 'Répondre Vendez / Louer',
            BOOKING_PROCEED_TO_DATE_SELECTION_FLASH_MESSAGE: 'Sélectionnez au moins un choix',
            BOOKING_VALIDATE_ADDRESS: "Veuillez re-saisir votre adresse.<br>Au moment ou Google vous la propose, merci de cliquer dessus. Cela nous permet de vous localiser, et de vous proposer le diagnostiqueur le plus proche. Meilleur prix. Moins de CO2",
            BOOKING_VALIDATE_BUILDING_TYPE: "Sélectionner votre type de bien (Appartement, Maison, Commercial).<br>Si votre demande concerne un parking, une dépendance, une cave, un garage ou un box, Merci de nous contacter au 01.79.72.82.33.",
            BOOKING_VALIDATE_CONSTRUCTION_DATE: "Sélectionner la période de votre permis de construire.<br>Vous avez un doute? Contactez le SPF de votre commune.Vous trouverez les coordonnées ici: SPF.pdf<br>Avant 1949, le diagnostic Plomb est obligatoire.<br>Avant juillet 1997, le diagnostic Amiante est obligatoire.",
            BOOKING_VALIDATE_ADDRESS_PRECISION: "Merci de saisir une adresse précise et complète : numéro de la voie suivi du nom de la voie et de la ville.<br>En cas de problème, n&#39;hésitez pas à nous joindre au 01.79.72.82.33",
            BOOKING_VALIDATE_ORDER_DATE: "Sélectionner une date",
            VALIDATE_FRENCH_ADDRESS: 'Adresse besoin d&#39;appartenir à France',

            /*ORDER*/
            VALIDATE_ORDER_KEYS_ADDRESS: 'Clés Adresse requise',
            VALIDATE_ORDER_KEYS_ADDRESS_DATE_FROM: 'Clés Temps "De" requis',
            VALIDATE_ORDER_KEYS_ADDRESS_DATE_TO: 'Clés Temps "To" requis',
            VALIDATE_DELEGATED_LANDLORD_EMAIL: "E-mail du propriétaire requis",
            VALIDATE_DELEGATED_LANDLORD_NOM: "Nom du propriétaire requis",

            ORDER_PAID_SUCCESS: "Commande confirmée",
            ORDER_DELEGATED_SUCCESS: "Commande confirmée",

            /*CLIENT*/
            VALIDATE_CLIENT_EMAIL: 'Email c&#39;est obligatoire.',
            VALIDATE_CLIENT_PASS: "Password c&#39;est obligatoire.",
            VALIDATE_CLIENT_LEGAL_STATUS: 'Autorité morale c&#39;est obligatoire.',
            VALIDATE_CLIENT_MOBILE_NUMBER: "Mobile c&#39;est obligatoire",
            VALIDATE_CLIENT_ADDRESS: "Adresse c&#39;est obligatoire",
            VALIDATE_CLIENT_SIRET: 'Siret c&#39;est obligatoire.',
            VALIDATE_CLIENT_FULLNAME: 'Nom c&#39;est obligatoire.',

            DUPLICATED_EMAIL_ADDRESS: 'This email address belongs to an existing member.',
            CLIENT_ACCOUNT_CREATED: 'Le compte a été créé . Vérifiez votre email .',


            DEPARTEMENT_COVERED_POPUP_TITLE: "Département en cours d'ouverture",
            VALIDATE_DEPARTEMENT_COVERED_SENDER_EMAIL: 'Email est nécessaire.',
            DEPARTEMENT_COVERED_EMAIL_SENDED: 'Nous avons été informés. Merci beaucoup.',
            DEPARTEMENT_COVERED_SEND_BUTTON: "Envoyer",

            /*POPUPS*/
            DELEGATION_POPUP_TITLE: "Confirmer la délégation",

            /*ERRORS*/
            ORDER_DELEGATED_EMAIL_FAIL: "Le courriel ne peut être envoyé à ce moment , d'essayer de nouveau de backoffice",
            ORDER_SAVING_ERROR: 'There was a server issue during the order saving proccess. Retrying in 10 seconds. Wait.',
            GENERIC_DB_ERROR: 'An error occured, please try again later',

            /*CONTROLS*/
            SELECT_UNSELECTED_LABEL: 'choisir',
            SELECT_LOADING_VALUES: "Loading",
        };
        $rootScope.TEXT = TEXT;
        return TEXT;
    });
})();
