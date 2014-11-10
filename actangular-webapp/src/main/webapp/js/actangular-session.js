(function() {'use strict';

function $session($rootScope, $http, $storage , $identity, $injector, bootListeners){

	this.getUser = function(){
		return this.user;
	};

	this.getUserId = function(){
		return this.user.id;
	};

	this.getUserName = function(){
		return this.user.name;
	};

	this.isLoggedIn = function(){
		if (this.user) return true;
		return false;
	};

	this.isValid = function(){
		var userId = $storage.get("currentUserId"), newLoc = '#/login';

		if(userId && userId.length > 0){
			if(this.getUserId() === userId) return true;

			//user may have logged out from another window/tab 
			//and a new user have logged in 
			//redirect to home
			newLoc = '#/home';
		}

		window.location.replace(newLoc);
		window.location.reload();
		return false;
	};

	this.invalidate = function(data){
		//$rootScope.$broadcast('event:session-invalidating', data);
		this.user = null;
		$storage.remove("currentUserId");
	};

	this.autoLogin = function (options){
		this.login(null, options);
	};

	this.credentialsLogin = function (userId, password, options){
		var btoa = userId+':'+password;
		var authToken = 'Basic '+window.btoa(btoa);

		this.login(authToken, options);

	};

	this.login = function (authToken, options){
		var me = this;
		var config = {ignoreAuth: true};
		if(authToken){
			if (angular.isDefined(options.remember) && options.remember === true) {
				config.params = {remember_me : "true"};
			}else{
				config.params = {remember_me : "session"};
			}
			config.params['authToken'] = authToken;
		}
		
		$http.post('service/boot', {}, config).success(function(bootData) {

			$storage.set("currentUserId", bootData.userId);

			for(var i = 0, l=bootListeners.length; i<l;i++){
				if(angular.isString(bootListeners[i])){
					$injector.get(bootListeners[i]).boot(bootData);
				}else{
					$injector.invoke(bootListeners[i], null, {bootData: bootData});
				}
			}

			$identity.getUser(bootData.userId).then(function(user){
				me.user = user;
				var data = {};
				me.user.groups = {};
				me.user.roles = {};
				for(var i=0, l=bootData.memberOf.length; i<l;i++){
					if($identity.isRole(bootData.memberOf[i])){
						me.user.roles[bootData.memberOf[i]] = true;
					}else{
						me.user.groups[bootData.memberOf[i]] = true;
					}
				}
				if(options) {
					if(options.data) data = options.data;
					if(options.onSuccess) options.onSuccess(me.getUser(), data);
				}
				$rootScope.$broadcast('event:session-loggedIn', bootData);
			});

		}).error(function(response){

			if(options) {
				if(options.onError) options.onError(response, options.data);
			}
		});
	};

	this.logout = function (){
		this.invalidate();
		$http.post('service/logout', {ignoreAuth: true}).success(function() {
			window.location.replace('#/login');
			window.location.reload();
		});
		
	};

	return this;
};
angular.module('agSession', [])
.provider('$session', function $SessionProvider() {
	var listeners = this.bootListeners = [];

	this.$get = ['$rootScope', '$http', '$storage', '$identity','$injector', function sessionFactory($rootScope, $http, $storage, $identity, $injector) {

		return new $session($rootScope, $http,$storage, $identity, $injector, listeners);
	}];
})
.controller('LoginController', function ($scope, $modalInstance, credentials, $session) {
	$scope.credentials = credentials;
	$scope.credentials.remember = true;
	$scope.msg = {};

	$scope.submitForm = function(isValid) {
		$scope.msg.type = 'info'; $scope.msg.msg = "LOADING";
		// As a workaround for autofill issue
		// manually assign userId and userPassword values from elements
		$scope.credentials.userId = document.getElementById('userId').value;
		$scope.credentials.userPassword = document.getElementById('userPassword').value;
		// check userId and userPassword values
		if (isValid || ($scope.credentials.userId !=="" && $scope.credentials.userPassword !== "")) {
			$session.credentialsLogin($scope.credentials.userId, $scope.credentials.userPassword, {data: credentials.data, remember: $scope.credentials.remember,
				onSuccess: function(user, data){

					if($modalInstance)
						$modalInstance.close($scope.credentials);
				},
				onError: function(response){
					$scope.msg.type = 'error'; $scope.msg.msg = "INVALID_CREDENTIALS";
					$scope.credentials.userId = "";
					$scope.credentials.userPassword = "";
				}});

		}else{
			$scope.msg.type = 'error'; $scope.msg.msg = "ENTER_CREDENTIALS";
		}

	};
})
.run(function($session, $rootScope, $location, $q, $timeout, $ui, $route, connectionInterceptor){
	var started = false;

	function autoLogin(){
		$session.autoLogin({data: $location.path(), onSuccess:function(){
			$rootScope.$broadcast('event:http-loginConfirmed');
		},
		onError: function (){

			var delay = $q.defer();
			$timeout(delay.resolve, 1000);
			delay.promise.then(function(result){
				loginRequired();
			});
		}
		});
	};
	$rootScope.$on('$locationChangeStart', function(event, currentRoute, nextRoute) {
		if($session.isLoggedIn()) return;

		if(currentRoute.indexOf("#/login") < 0){
			event.preventDefault();
		}

		if(started === false){
			started = true;
			autoLogin();
		}

	});

	$rootScope.$on('event:session-loggedIn',  function (event, data){
		if($rootScope.currentUser && $rootScope.currentUser.id !== $session.getUserId()){
			$session.invalidate();
			window.location.replace('#/home');
			window.location.reload();
		}
		$rootScope.currentUser = $session.getUser();
		if($location.path().indexOf("/login") < 0){
			$route.reload();
		}else{
			$location.path('home');
			$location.replace();
		}
	});
	$ui.registerModal('showLogin', function(data){
		this.showModal('login.html', 'LoginController',  {
			credentials: function () {
				return {userId: '', userPassword: '', data: data || {}};
			}}, null, null, {size: 'sm', backdrop: 'static', keyboard: false,}, {closeable: false}); 	 
	});

	connectionInterceptor.addListener({
		id: 'session',
		onRequest: function(config){
			if (!config.ignoreAuth && $session.isLoggedIn()){
				config.cancelRequest = !$session.isValid();
			}
		},
		onResponseError: function(rejection){
			if (rejection.status === 401 && !rejection.config.ignoreAuth){
				loginRequired();
			}
		}
	});

	function loginRequired(){
		//$session.invalidate();
		$ui.showLogin();
	};
});
})();