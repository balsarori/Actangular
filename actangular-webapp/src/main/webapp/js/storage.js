(function() {'use strict';

/* agStorage */

angular.module('agStorage', ['ngCookies'])
.factory('$storage', function ($window, $cookieStore) {
	//from https://github.com/angular-translate/angular-translate/blob/master/src/service/storage-local.js
	var hasLocalStorageSupport = 'localStorage' in $window;
	if (hasLocalStorageSupport) {
		var testKey = 'agStorageTest';
		try {
			// this check have to be wrapped within a try/catch because on
			// a SecurityError: Dom Exception 18 on iOS
			if ($window.localStorage !== null) {
				$window.localStorage.setItem(testKey, 'foo');
				$window.localStorage.removeItem(testKey);
				hasLocalStorageSupport = true;
			} else {
				hasLocalStorageSupport = false;
			}
		} catch (e){
			hasLocalStorageSupport = false;
		}
	}

	if(hasLocalStorageSupport){
		return {
			get: function (key) {
				return $window.localStorage.getItem(key);
			},
			set: function (key, value) {
				$window.localStorage.setItem(key, value);
			},
			remove: function(key){
				$window.localStorage.removeItem(key);
			},
			isLocalStorage: true
		};
	}else{
		return{
			get: function (key) {
				return $cookieStore.get(key);
			},
			set: function (key, value) {
				$cookieStore.put(key, value);
			},
			remove: function(key){
				$cookieStore.remove(key);
			},
			isLocalStorage: false
		};
	}
});
})();