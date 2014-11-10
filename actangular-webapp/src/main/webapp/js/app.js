(function(actangular) {'use strict';

/* App Module */

actangular = actangular || {templates:[]};
window.actangular = actangular;

angular.module('agApp', 
		['restangular','ngRoute','agPage', 'agStorage', 'agSession', 'agLocale','agIdentity','agForm', 'agProcess','agTask','agUI','agDiagram'])

//Locales config
.constant('localeKeys', {keys: ['en', 'ar'], aliases:{'en_*': 'en','ar_*': 'ar'},
	langDisplay:{'en': 'English', 'ar': 'عربي'}})
.config(function($translateProvider, localeKeys) {
	$translateProvider.registerAvailableLanguageKeys(localeKeys.keys, localeKeys.aliases);
	$translateProvider.determinePreferredLanguage();
	
	if($translateProvider.preferredLanguage() === undefined){
		$translateProvider.preferredLanguage(localeKeys.keys[0]);
	}
})
//Restangular config
.config(function(RestangularProvider) {
	RestangularProvider.setRestangularFields({
		  selfLink: 'url'
		});
	RestangularProvider.addResponseInterceptor(function(data, operation, what, url, response, deferred) {
		var extractedData;
		// extract data meta data
		if (operation === "getList" && data.data) {
			extractedData = data.data;
			extractedData.total = data.total;
			extractedData.start = data.start;
			extractedData.sort = data.sort;
			extractedData.order = data.order;
			extractedData.size = data.size;

		} else {
			extractedData = data;
		}
		return extractedData;
	});
})
//$session config
.config(['$sessionProvider', function($sessionProvider) {
	$sessionProvider.bootListeners.push(function($identity, definitionCache, bootData){
		$identity.boot(bootData);
		var definitions = bootData.processDefinitions;
		for(var i=0, l=definitions.length;i<l;i++){
			definitionCache.addProcessDefinition(definitions[i]);
		}
	});
}])
//$form config
.config(['$formProvider', function($formProvider) {
	function escapeRegExp(str) {
		  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		}
	function replaceAll(find, replace, str) {
		  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
		}
	$formProvider.addFormPropertyHandler('date', {
		viewId: 'views/form/date.html',
		initFormProperty: function(formProperty){
			
			if (formProperty.value !== null){ 
				
				if(formProperty.datePattern)
					formProperty.value = moment(formProperty.value, replaceAll('y','Y', replaceAll('d','D', formProperty.datePattern))).toDate();
				
			}
		},
		prepareForSubmit: function($filter, formProperty){
			formProperty.value = $filter('date')(formProperty.value, formProperty.datePattern);
		}
	});

	$formProvider.addFormPropertyHandler('long', {
		viewId: 'views/form/long.html',
		initFormProperty: function(formProperty){
			if (formProperty.value !== null){ 
				formProperty.value = parseInt(formProperty.value);
			}
		}
	});

	$formProvider.addFormPropertyHandler('boolean', {
		viewId: 'views/form/boolean.html'
	});

	$formProvider.addFormPropertyHandler('enum', {
		viewId: 'views/form/enum.html'
	});
	
	$formProvider.addFormPropertyHandler('user', {
		viewId: 'views/form/user.html'
	});

}])
//$routes
.config(['$routeProvider',
         function($routeProvider) {
	$routeProvider.
	when('/home', {
		title: 'HOME',
		resolve: {page: function(){return {};}}
	}).
	when('/login', {
		title: 'LOGIN'
	}).
	when('/account/profile',{
		title: 'PROFILE',
		resolve: {page: function(){return {template:'views/account/profile.html'};}}
	}).
	when('/account/preferences',{
		title: 'PREFERENCES',
		resolve: {page: function(){return {template:'views/account/preferences.html'};}}
	}).
	//Tasks
	when('/tasks/inbox/:taskId?', {
		title: 'INBOX',
		resolve: {
			page: function($taskPage, $route){
				return $taskPage.getInboxPage($route.current.params.taskId);
			}
		}
	}).
	when('/tasks/mytasks/:taskId?', {
		title: 'MYTASKS',
		resolve: {
			page: function($taskPage, $route){
				return $taskPage.getMyTasksPage($route.current.params.taskId);
			}
		}
	}).
	when('/tasks/involved/:taskId?', {
		title: 'INVOLVED',
		resolve: {
			page: function($taskPage, $route){
				return $taskPage.getInvolvedPage($route.current.params.taskId);
			}
		}
	}).
	when('/tasks/queued/:taskId?', {
		title: 'QUEUED',
		resolve: {
			page: function($taskPage, $route){
				return $taskPage.getQueuedPage($route.current.params.taskId);
			}
		}
	}).
	when('/tasks/archived/:taskId?', {
		title: 'ARCHIVED',
		resolve: {
			page: function($taskPage, $route){
				return $taskPage.getArchivedPage($route.current.params.taskId);
			}
		}
	}).
	when('/tasks/:any*', {
		redirectTo: function(params){
			return '/tasks/inbox';
		}
	}).
	//Processes
	when('/processes/definitions', {
		title: 'DEFINITIONS',
		resolve: {
			page: function($processPage, $route){
				return $processPage.getDefinition();
			}
		}
	}).
	when('/processes/myinstances/:processInstanceId?', {
		title: 'MYINSTANCES',
		resolve: {
			page: function($processPage, $route){
				return $processPage.getMyInstances($route.current.params.processInstanceId);
			}
		}
	}).
	when('/processes/participant/:processInstanceId?', {
		title: 'PARTICIPANT',
		resolve: {
			page: function($processPage, $route){
				return $processPage.getParticipant($route.current.params.processInstanceId);
			}
		}
	}).
	when('/processes/archived/:processInstanceId?', {
		title: 'ARCHIVED',
		resolve: {
			page: function($processPage, $route){
				return $processPage.getArchived($route.current.params.processInstanceId);
			}
		}
	}).
	when('/processes/models', {
		title: 'MODELS',
		resolve: {
			page: function($processPage, $route){
				return $processPage.getModel();
			}
		}
	}).
	otherwise({
		redirectTo: '/home'
	});
}])
//Restangulars factories
.factory('RuntimeRestangular', function(Restangular) {
	return Restangular.withConfig(function(RestangularConfigurer) {
		RestangularConfigurer.setBaseUrl('service/runtime/');
	});
})
.factory('RepositoryRestangular', function(Restangular) {
	return Restangular.withConfig(function(RestangularConfigurer) {
		RestangularConfigurer.setBaseUrl('service/repository/');
		/* RestangularConfigurer.setDefaultHttpFields({cache: true});*/
	});
})
/*.factory('FormRestangular', function(Restangular) {
	return Restangular.withConfig(function(RestangularConfigurer) {
		RestangularConfigurer.setBaseUrl('service/form/');
	});
})*/
.factory('HistoryRestangular', function(Restangular) {
	return Restangular.withConfig(function(RestangularConfigurer) {
		RestangularConfigurer.setBaseUrl('service/history/');
	});
})
.controller('ProfileController', function($scope, $session) {
	$scope.logout = function () {
		$session.logout();
	};
})
.controller('NewController', function($scope, $ui) {
	$scope.newTask = function () {
		$ui.showCreateTask();
	};
	$scope.startProcess = function(){
		$ui.showStartNewProcess();
	};
})
.controller('LanguageController', function ($scope, $translate, localeKeys) {
	$scope.langs = localeKeys.langDisplay;
	$scope.lang = $translate.use();
	
	$scope.setLang = function (lang) {
		$translate.use(lang).then(function(){
			$scope.lang = $translate.use();
		});
	};
})
.config(['$otherwiseProvider', function($otherwiseProvider) {
	$otherwiseProvider.setHandler('otherwiseTranslate');
}])
.factory('otherwiseTranslate', function($translate) {
	return{
		get: function(key, params){
			return $translate.instant(key, params);
		}
	};
})
.directive('agSelectUser', function($parse, $ui) {
	return function(scope, element, attr) {
		if(attr.ngReadonly){
			if(scope.$eval(attr.ngReadonly)) return;
		}
		var userModel = $parse(attr.agSelectUser);
    	element.on('click', function(){
    		$ui.showSelectIdentity('user', 'SELECT_IDENTITY_user', function (identityLink){
    			userModel.assign(scope, identityLink.user);
    		});
    	});
    };
});

})();