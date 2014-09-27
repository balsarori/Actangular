(function() {'use strict';

/* agLocale */

angular.module('agLocale', ['pascalprecht.translate'])
.factory('localeLoader', function ($http, $q, localeTable) {
	return function (options) {
		var deferred = $q.defer();

			$http.get('locale/'+options.key+'.json').success(function (data){
				deferred.resolve(data.translations);
				localeTable.addLocale(options.key, data);
			}).error(function (data){
				deferred.reject(options.key);
			});

		return deferred.promise;
	};
})
.factory('localeTable', function ($locale) {
	var locales = {};
	function changeLocale(oldLocale, newLocale) {
		angular.forEach(oldLocale, function(value, key) {
			if (!newLocale[key]) {
				delete oldLocale[key]; // maybe old locale key shouldn't be deleted
			} else if (angular.isArray(newLocale[key])) {
				oldLocale[key].length = newLocale[key].length;
			}
		});
		angular.forEach(newLocale, function(value, key) {
			if (angular.isArray(newLocale[key]) || angular.isObject(newLocale[key])) {
				if (!oldLocale[key]) {
					oldLocale[key] = angular.isArray(newLocale[key]) ? [] : {};
				}
				changeLocale(oldLocale[key], newLocale[key]);
			} else {
				// pluralCat is a function 
				if("pluralCat" === key){
					oldLocale[key] = new Function('return ' + newLocale[key])();
				}else{
					oldLocale[key] = newLocale[key];
				}

			}
		});
	};
	
	return {
		addLocale: function(key, locale){
			locales[key] = locale;
			if(locale.relativeTime){
				moment.lang(key, {relativeTime: locale.relativeTime});
			}
		},
		getLocale: function(key){
			return locales[key];
		},
		setLocale: function(key){
			changeLocale($locale, locales[key].locale);
			moment.lang(key);
		}
	};
})
.config(function($translateProvider) {
	$translateProvider.useLoader('localeLoader');
	$translateProvider.useStorage('translateStorage');
})
.factory('translateStorage', function ($storage) {
	    var langKey;
	    return {
	      get: function (name) {
	        if(!langKey) {
	          langKey = $storage.get(name);
	        }
	        return langKey;
	      },
	      
	      set: function (name, value) {
	        langKey=value;
	        $storage.set(name, value);
	      }
	    };
})
.run(function($rootScope, $translate, localeTable){
	$rootScope.$on("$translateChangeSuccess", function(){
		localeTable.setLocale($translate.use());
	});
});

})();