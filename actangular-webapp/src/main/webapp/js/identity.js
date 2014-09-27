(function() {'use strict';

/* agIdentity */


var DEFAULT_USER_PIC = "img/user.png",
DEFAULT_GROUP_PIC = "img/group.png";

angular.module('agIdentity', [])
.service('$identity', function($http, $q) {
	var users = {},  groups = {}, roles = {};

	function cacheUser(user){
		user.identityType = 'user';
		user.name = user.firstName || user.id;
		if(user.lastName)
			user.name += ' '+user.lastName;

		users[user.id]= user;
	};
	function cacheGroup(group){
		if(group.type === 'security-role'){
			group.identityType = 'role';
			roles[group.id] = group;
		}else{
			group.identityType = 'group';
			groups[group.id] = group;
		}
	};
	this.getUser = function(userId, instant){
		var user = users[userId];

		var deferred = $q.defer();

		if(user){
			deferred.resolve(user);
		}else{
			$http.get('service/identity/users/'+userId)
			.success(function(user) {
				cacheUser(user);
				deferred.resolve(user);
			})
			.error(function(response){
				//create a fake user to avoid future errors
				var user = {id: userId, firstName: userId, lastName: '', pictureUrl: null};
				cacheUser(user);
				deferred.reject(user);
			});
		}
		return deferred.promise;
	};

	this.getGroup = function(groupId){
		var group = groups[groupId];

		var deferred = $q.defer();

		if(group){
			deferred.resolve(group);
		}else{
			$http.get('service/identity/groups/'+groupId)
			.success(function(group) {
				cacheGroup(group);
				deferred.resolve(group);
			})
			.error(function(response){
				//create a fake group to avoid future errors
				var group = {id: groupId, name: groupId, type: 'assignment'};
				cacheGroup(group);
				deferred.reject(group);
			});
		}
		return deferred.promise;
	};
	this.boot = function(data){
		for(var i=0, l=data.users.length; i<l;i++){
			cacheUser(data.users[i]);
		}

		for(var i=0, l=data.groups.length; i<l;i++){
			cacheGroup(data.groups[i]);
		}
	};

	this.getUsers = function(){
		var userArray = [];
		for(var userId in users){
			userArray.push(users[userId]);
		}
		return userArray;
	};

	this.getGroups = function(){
		var groupArray = [];
		for(var groupId in groups){
			groupArray.push(groups[groupId]);
		}
		return groupArray;
	};

	this.getUserName = function(userId){
		var user = users[userId];
		if(user){
			return user.name;
		}else{
			this.getUser(userId);
		}
		return userId;
	};

	this.getGroupName = function(groupId){
		var group = groups[groupId];
		if(group){
			return group.name;
		}else{
			this.getGroup(groupId);
		}
		return groupId;
	};

	this.isRole = function(roleId){
		return roles[roleId] !== undefined;
	};
})
//Controllers
.controller('AddIdentityController', function($scope, $modalInstance, $identity, options) {
	var itemList = [];

	if(options.identityType === undefined || options.identityType === 'user')
		itemList = itemList.concat($identity.getUsers());
	if(options.identityType === undefined || options.identityType === 'group')
		itemList = itemList.concat($identity.getGroups());

	for(var i=0; i<itemList.length;i++){
		if(angular.isUndefined(itemList[i].selected))
			itemList[i].selected = false;
	}
	$scope.title = options.title;
	$scope.itemList = itemList;
	$scope.selectedItems = [];
	$scope.filteredList = itemList;
	$scope.types = options.roles;

	$scope.ok = function(isValid, selectedIdentities, identityRole) {
		if (!isValid || selectedIdentities.length <= 0) {$scope.showErrors = true; return;}
		var identityLink = {type:identityRole};

		if(selectedIdentities[0].identityType === 'group')
			identityLink.group = selectedIdentities[0].id;
		else
			identityLink.user = selectedIdentities[0].id;
		$modalInstance.close(identityLink);
	};
	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};
})
.controller('SelectIdentityController', function($scope, $modalInstance,$identity, options) {
	var itemList = angular.copy($identity.getUsers());

	for(var i=0; i<itemList.length;i++){
		if(angular.isUndefined(itemList[i].selected))
			itemList[i].selected = false;
	}
	$scope.title = options.title;
	$scope.itemList = itemList;
	$scope.selectedItems = [];
	$scope.filteredList = itemList;
	$scope.types = options.types;

	if(options.removable)
		$scope.removable = true;

	$scope.ok = function(selectedIdentities) {
		if(selectedIdentities.length <= 0) {$scope.showErrors = true; return;}
		var identityLink = {};
		if(selectedIdentities[0].identityType === 'group')
			identityLink.group = selectedIdentities[0].id;
		else
			identityLink.user = selectedIdentities[0].id;
		$modalInstance.close(identityLink);
	};
	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};
})
.directive('agUser', function($identity, $otherwise) {
	return {link: function(scope, element, attrs) {
		var otherwiseKey = element.attr('otherwiseKey') || '';
		scope.$watch(attrs.agUser, function (userId) {
			if(userId){
				$identity.getUser(userId).then(function(user){
					element.text(user.name);
				}, function(){
					element.text(userId);
				});
			}else{
				if(otherwiseKey !== '')
					element.html($otherwise.get(otherwiseKey));
			}
		});
	}};
})
.directive('agGroup', function($identity) {
	return {link: function(scope, element, attrs) {
		scope.$watch(attrs.agGroup, function (groupId) {
			if(groupId){
				$identity.getGroup(groupId).then(function(group){
					element.text(group.name);
				}, 
				function(){
					element.text(groupId);
				});
			}
		});
	}};
})
.directive('agUserPic', function($identity) {
	return {link: function(scope, element, attrs) {
		scope.$watch(attrs.agUserPic, function (userId) {
			if(userId){
				$identity.getUser(userId).then(function(user){
					if(user.pictureUrl !== null)
						element.attr("src", user.pictureUrl);
					else		  
						element.attr("src", DEFAULT_USER_PIC);
				},
				function(){
					element.attr("src", DEFAULT_USER_PIC);
				});
			}else{
				element.attr("src", DEFAULT_USER_PIC);
			}
		});
	}};
})
.directive('agIdentityLinkPic', function($identity) {
	return {link: function(scope, element, attrs) {
		scope.$watch(attrs.agIdentityLinkPic, function (identityLink) {
			if(identityLink){
				var userId = identityLink.user || identityLink.userId;
				if(userId){
					$identity.getUser(userId).then(function(user){
						if(user.pictureUrl !== null)
							element.attr("src", user.pictureUrl);
						else		  
							element.attr("src", DEFAULT_USER_PIC);
					},
					function(){
						element.attr("src", DEFAULT_USER_PIC);
					});
				}else{
					element.attr("src", DEFAULT_GROUP_PIC);
				}
			}
		});
	}};
})
.directive('agIdentityLinkName', function($identity) {
	return {link: function(scope, element, attrs) {
		scope.$watch(attrs.agIdentityLinkName, function (identityLink) {
			if(identityLink){
				var userId = identityLink.user || identityLink.userId;
				if(userId){
					$identity.getUser(userId).then(function(user){
						element.text(user.name);
					}, function(){
						element.text(userId);
					});
				}else{
					var groupId = identityLink.group || identityLink.groupId;
					if(groupId){
						$identity.getGroup(groupId).then(function(group){
							element.text(group.name);
						}, 
						function(){
							element.text(groupId);
						});
					}
				}
			}
		});
	}};
})
.directive('agIdentityLinkType', function($identity, $otherwise) {
	return {link: function(scope, element, attrs) {
		scope.$watch(attrs.agIdentityLinkType, function (identityLinkType) {
			if(identityLinkType){
				var roleName = $otherwise.get('ROLE_'+identityLinkType);

				//role translate was not found set to original identityLink.type
				if(roleName === 'ROLE_'+identityLinkType) roleName = identityLinkType;

				element.html(roleName);
			}
		});
	}};
})
//filters
.filter('userName', function($identity, $timeout) {
	return function(userId) {
		return $identity.getUserName(userId);
	};
})
.filter('groupName', function($identity) {
	return function(groupId) {
		return $identity.getGroupName(groupId);
	};
})
.filter('identityName', function($filter) {
	return function(identityId, identityType) {
		if(identityType === 'group')
			return $filter('groupName')(identityId);

		return $filter('userName')(identityId);
	};
});

})();