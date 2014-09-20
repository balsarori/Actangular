(function(actangular) {'use strict';

/* App Module */

actangular = actangular || {templates:[]};
window.actangular = actangular;

angular.module('agApp', 
		['restangular','ngRoute','agStorage', 'agSession', 'agLocale','agIdentity','agForm', 'agProcess','agTask','agUI'])
.constant('localeKeys', {keys: ['en', 'ar'], aliases:{'en_*': 'en','ar_*': 'ar'}})
.config(function($translateProvider, localeKeys) {
	$translateProvider.registerAvailableLanguageKeys(localeKeys.keys, localeKeys.aliases);
	$translateProvider.determinePreferredLanguage();
	
	if($translateProvider.preferredLanguage() === undefined){
		$translateProvider.preferredLanguage(localeKeys.keys[0]);
	}
})
.config(function(RestangularProvider) {
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
.factory('FormRestangular', function(Restangular) {
	return Restangular.withConfig(function(RestangularConfigurer) {
		RestangularConfigurer.setBaseUrl('service/form/');
	});
})
.factory('HistoryRestangular', function(Restangular) {
	return Restangular.withConfig(function(RestangularConfigurer) {
		RestangularConfigurer.setBaseUrl('service/history/');
	});
})
.factory('PageList', function ($q, $location){
	return {
		from: 0,
		to: 0,
		total: 0,
		hasPrevious: false,
		hasNext: false,
		previous : function (options){
			if(this.hasPrevious === true){
				this.requestParam.start = this.requestParam.start - this.listSize;
				if(this.requestParam.start < 0)
					this.requestParam.start = 0;
				this.refresh(true);
			}
		},
		next : function (options){
			if(this.hasNext === true){
				this.requestParam.start = this.requestParam.start + this.listSize;
				this.refresh(true);
			}
		},			
		refresh : function (navigated, success, fail){
			var me = this;
			this.queryList(this.requestParam, 
					function (data){
						//if no items in current page navigate back
						if(data.total > 0 && data.size === 0){
							var newStart = (data.total - (data.total % me.listSize));
							if(newStart === data.total)
								newStart = data.total - me.listSize;
							me.requestParam.start = newStart;
							me.refresh(navigated, success, fail);
							return;
						}
						me.list = data;
						me.total = data.total;
						me.from = me.requestParam.start + 1;
						me.to = me.requestParam.start + me.listSize;
						me.hasPrevious = me.requestParam.start > 0;
						me.hasNext = ((me.requestParam.start + me.listSize) < me.total);
						
						if(me.sortKeys)
							me.sortKey = me.sortKeys[me.requestParam.sort] || me.requestParam.sort;
						if(success)
							success(data);
						if(navigated)
							me.scollList();
					},
					function (response){
						if(fail)
							fail(response);
					}
			);
		},
		sortBy : function (paramId){
			this.requestParam.sort = paramId;
			
			this.requestParam.start = 0;
			this.refresh(true);
		},	
		toggleOrder : function (){
			if(this.requestParam.order === 'asc') this.requestParam.order = 'desc';
			else this.requestParam.order = 'asc';
			this.requestParam.start = 0;
			this.refresh(true);
		},
		scollList: function (){
			var listElm = document.getElementById('list');
			if(listElm)
				listElm.scrollTop = 0;
		},
		show: function(itemId){
			if(itemId){
				return this.showItem(itemId);
			}else{
				return this.showList();
			}
		},
		showItem: function(itemId){
			var item = this.cache.get(itemId);
			if(item) {
				this[this.itemName] = item;
				this.controlsTemplate = this.itemControlsTemplate;
				this.showingItem = true;
				return this;
			}
			var deferred = $q.defer();
			var me = this;
			
			this.queryOne(itemId, function(item){
				me[me.itemName] = item;
				me.controlsTemplate = me.itemControlsTemplate;
				me.showingItem = true;
				deferred.resolve(me);
			}, function(response){
				deferred.reject();
			});
			return deferred.promise;
		},
		queryOne: function(itemId, success, fail){
			return this.queryResource.one(itemId).get().then(success, fail);
		},
		queryList: function(requestParam, success, fail){
			return this.queryResource.getList(requestParam).then(success, fail);
		},
		showList: function(){
			if(this.list) {
				this.controlsTemplate = this.listControlsTemplate;
				this.showingItem = false;
				this.refresh();
				return this;
			}
			var deferred = $q.defer();
			var me = this;
			this.refresh(false, function(){
				me.controlsTemplate = me.listControlsTemplate;
				me.showingItem = false;
				deferred.resolve(me);
			});
			return deferred.promise;
		},
		back: function(replace){
			var path = $location.path();
			$location.path(path.substring(0, path.lastIndexOf("/")));
			if(replace)
				$location.replace();
		},
		onPageShow: function(){
		}
	};
})
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
	when('/preference',{
		//title: 'PROFILE',
		resolve: {page: function(){return {};}}
	}).
	otherwise({
		redirectTo: '/home'
	});
}])

.controller('PageController', function($scope, $route) {
	$scope.$on('$routeChangeSuccess', function (event, currentRoute){
		$scope.setPage(currentRoute.locals.page || {});
	});

	$scope.setPage = function(page){
		var previousPage = $scope.page, eventType = "pageChange";
		if(previousPage === page){
			eventType = "pageUpdate";
		}
		$scope.$broadcast(eventType+'Start', page, previousPage);
		$scope.page = page;
		$scope.$broadcast(eventType+'Success', page, previousPage);
	};

})
.controller('ProfileController', function($scope, $session, $translate) {
	$scope.changeLang = function () {
		if($translate.use() === "ar"){
			$translate.use('en');
		}else{
			$translate.use('ar');
		}
	};
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
.run(function($rootScope){
	$rootScope.stopEvent = function (event) {
		event.preventDefault();event.stopPropagation();
	};
});

})();