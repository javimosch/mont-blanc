var app = angular.module('app', ['service','calendar','root','fullpage','ui.bootstrap']);

app.config(function($httpProvider) {
	$httpProvider.defaults.useXDomain = true;
	delete $httpProvider.defaults.headers.common['X-Requested-With'];
});
app.config(function($sceDelegateProvider) {
	$sceDelegateProvider.resourceUrlWhitelist([
		// Allow same origin resource loads.
		'self',
		'*',
		// Allow loading from outer templates domain.
		'http://cdn.somewebsite.com/templates/**'
	]);
});
app.controller('main', ['$scope', '$timeout','server','$rootScope', function($scope, $timeout,server,r) {
	console.info('main');

	var calendarRanges = server.getAvailableRanges();

	var s = $scope;

	s.states = {
		QUESTIONS: 'QUESTIONS',
		CHECKS: "CHECKS",
		CALENDAR: "CALENDAR"
	};
	s.state = s.states.QUESTIONS;
	s.question = 1;
	s.questionUnlocked = 1;
	s.questions = 6;

	s.model = {
		sell: false,
		diags: {}
	};



	function test() {
		var modelDummy = {
			"sell": false,
			"house": false,
			"apartamentType": "T3",
			"constructionPermissionDate": "après le 01/07/1997",
			"address": "ddddddd, 4020 Liège, Belgium",
			"gasInstallation": "Oui, Moins de 15 ans"
		};
		s.model = Object.assign(s.model, modelDummy);
		s.question = s.questions+1;
		s.questionUnlocked = s.questions;
		s.state = s.states.CALENDAR;
	}
	test();

	s.continue = function() {
		s.checkQuestion(s.question);
		if (s.state === s.states.QUESTIONS) {
			if (s.question < s.questions) {
				if (s.question > s.questionUnlocked) {
					s.questionUnlocked++;
				}
				s.question++;
				return;
			} else {
				s.question = s.questions + 1;
				s.questionUnlocked = s.questions;
				s.state = s.states.CHECKS;
				return;
			}
		}
		if(s.state === s.states.CHECKS){
			s.state = s.states.CALENDAR;
			r.onCalendarInit && r.onCalendarInit();
		}
		if(s.state === s.states.CALENDAR){
			r.$emit('CALENDAR.CONTINUE');
		}
	};

	s.checkQuestion = function(questionNro) {
		s.menuList.forEach(function(item, key) {
			if (item.params.question && item.params.question == questionNro) {
				item.passed = true;
			}
		});
	};

	var DIAGS = "CHECKS";
	var QUESTIONS = "QUESTIONS";
	var CALENDAR = "CALENDAR";

	r.isState=function(states){
		if(states.length){
			return _.includes(states,s.state);
		}
		return s.state == states;
	};

	s.menuItemShow = function(item) {

		if(r.isState([QUESTIONS,DIAGS]) && s.questionUnlocked >= s.questions){
			return true;
		}

		if (item.params.question) {
			return item.params.question <= s.question;
		}

		if(item.params.state == s.states.CHECKS){
			if(s.questionUnlocked !== s.questions){
				return false;
			}
		}else{
			//console.warn(item.params.state,s.states.CHECKS)
		}
		return true;
	};
	s.menuItemPassed = function(item) {
		var linkState = item.params.state;

		if(r.isState([QUESTIONS,DIAGS]) && s.questionUnlocked >= s.questions){
			if(linkState == QUESTIONS){
				return true;	
			}
			if(linkState == DIAGS){
				return true;	
			}
			if(linkState == CALENDAR){
				return false;	
			}		
		}

		if (item.params.question) {
			if (item.params.question == s.question) return false;
			return item.params.question < s.question;
		}
		if(item.params.state == s.states.CHECKS){
			if(s.state == s.states.CALENDAR){
				return true;
			}
			return false;
		}
		if(item.params.state == s.states.CALENDAR && s.state == s.states.CALENDAR){
			return false;
		}
		return true;
	};

	s.menuList = [{
		label: 'You sell or rent',
		params: {
			question: 1,
			state: s.states.QUESTIONS
		}
	}, {
		label: 'House or Apartment',
		params: {
			question: 2,
			state: s.states.QUESTIONS
		}
	}, {
		label: 'Square meters',
		params: {
			question: 3,
			state: s.states.QUESTIONS
		}
	}, {
		label: 'Date permis de construire',
		params: {
			question: 4,
			state: s.states.QUESTIONS
		}
	}, {
		label: 'Address',
		params: {
			question: 5,
			state: s.states.QUESTIONS
		}
	}, {
		label: 'Gas Installation',
		params: {
			question: 6,
			state: s.states.QUESTIONS
		}
	},
	{
		label:'Diagnostics list',
		params:{
			state:s.states.CHECKS
		}
	},
	{
		label:'Calendar',
		params:{
			state:s.states.CALENDAR
		}
	}
	];

	s.menu = function(params) {
		s.state = params.state || s.state;
		s.question = params.question || s.question;
	};

	s.squareMeters = {
		"-40m2": "-40m2",
		"-40 à 80": "40 à 80",
		"80 à 120": "80 à 120",
		"120 à 160": "120 à 160",
		"160 à 200": "160 à 200",
		"200 à 250": "200 à 250",
		"250 à 300": "250 à 300",
		"Plus de 300": "Plus de 300"
	};

	s.apartamentType = {
		"1 pièce": "1 pièce",
		"Studio T1": "Studio T1",
		"T2": "T2",
		"T3": "T3",
		"T4": "T4",
		"T5": "T5",
		"T5": "T5",
		"T6": "T6",
		"T7": "T7",
		"T8": "T8",
		"T9": "T9",
		"T10": "T10",
	};

	s.constructionPermissionDate = {
		"avant le 01/01/1949": "avant le 01/01/1949",
		"entre 1949 et le 01/07/1997": "entre 1949 et le 01/07/1997",
		"après le 01/07/1997": "après le 01/07/1997"
	};

	s.gasInstallation = {
		"Non": "Non",
		"Oui, Moins de 15 ans": "Oui, Moins de 15 ans",
		"Oui, Plus de 15 ans": "Oui, Plus de 15 ans"
	};

	s.diags = [{
		label: "DPE - Diagnostic Performance Energétique",
		name: 'dpe',
		mandatory: true,
		comments: 'Mandatory',
		time:20,
		price:15
	}, {
		label: "Diagnostic amiante avant vente",
		name: 'dta',
		comments: 'Before 01/07/1997',
		time:30,
		price:25
	}, {
		label: "Diagnostic Plomb",
		name: 'crep',
		comments: 'Before 01/01/1949',
		time:60,
		price:40
	}, {
		label: 'Diagnostic loi Carrez',
		name: 'loiCarrez',
		mandatory: true,
		comments: 'Mandatory',
		time:30,
		price:25
	}, {
		label: 'Diagnostic ERNT - ERNMT',
		name: 'ernt',
		mandatory: true,
		comments: 'Mandatory',
		time:15,
		price:30
	}, {
		label: 'Diagnostic Termites',
		name: 'termites',
		mandatory: false,
		comments: 'depends on postcode 2 first figures : http://www.developpement-durable.gouv.fr/IMG/pdf/Dpts_termites_2015.pdf',
		time:25,
		price:75
	}, {
		label: 'Diagnostic Gaz',
		name: 'gaz',
		mandatory: false,
		comments: 'IF Oui, plus de 15 ans',
		time:30,
		price:50
	}, {
		label: 'Diagnostic Electricité',
		name: 'electricity',
		mandatory: false,
		comments: 'IF Oui, plus de 15 ans',
		time:10,
		price:30
	}, {
		label: 'Diagnostic Etat Parasitaire',
		name: 'parasitaire',
		mandatory: false,
		comments: 'Always optional',
		time:45,
		price:60
	}];



	

	s.continueIsEnabled = function() {
		if (s.question == 1) return typeof s.model.sell !== 'undefined';
		if (s.question == 2) return typeof s.model.house !== 'undefined';
		if (s.question == 3 && s.model.house == false) return typeof s.model.apartamentType !== 'undefined';
		if (s.question == 3 && s.model.house == true) return typeof s.model.squareMeters !== 'undefined';
		if (s.question == 4) return typeof s.model.constructionPermissionDate !== 'undefined';
		if (s.question == 5) return typeof s.addressLoaded !== 'undefined' && s.addressLoaded == true;
		if (s.question == 6) return typeof s.model.gasInstallation !== 'undefined';

		return true;
	};

	r.totalPrice=function(){
		var total = 0;
		Object.keys(s.model.diags).forEach(function(mkey){
			if(!s.model.diags[mkey]) return;
			s.diags.forEach(function(dval,dkey){
				if(dval.name == mkey){
					total+=dval.price || 0;
					return false;
				}
			});
		});
		return total;
	};
	r.totalTime=function(){
		var total = 0;
		Object.keys(s.model.diags).forEach(function(mkey){
			if(!s.model.diags[mkey]) return;
			s.diags.forEach(function(dval,dkey){
				if(dval.name == mkey){
					total+=dval.time || 0;
					return false;
				}
			});
		});
		var hours = Math.floor( total / 60);          
    	var minutes = total % 60;
    	minutes = (minutes<10)?'0'+minutes:minutes;
		return hours+':'+minutes;
	};

	var INITIALIZE = function() {
		//MODEL DEFAULTS
		s.diags.forEach(function(val, key) {
			s.model.diags[val.name] = (val.mandatory)?true:false;
		});

		//ADDRESS GEOCOMPLETE
		var initAddress = setInterval(function() {
			var $address = $("#address");
			if ($address.length > 0) {
				r.dom(function() {
					$address.geocomplete().bind("geocode:result", function(event, result) {
						s.addressLoaded = true;
						s.model.address = result.formatted_address;
					});
					clearInterval(initAddress);
					console.info('addres autocompletea initialized');
				});
			} else {

			}
		}, 1000);

		r.dom(function(){
			var el =document.querySelector('[data-main]')
			el.className = el.className.replace('hidden','').trim();
		});
	}
	INITIALIZE();


}]);