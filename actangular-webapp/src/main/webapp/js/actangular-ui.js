(function() {'use strict';

//Workaround to bootstrap ui issue mentioned here
//https://github.com/angular-ui/bootstrap/issues/2155
angular.module('ui.bootstrap.tabs').controller('TabsetController', ['$scope', function TabsetCtrl($scope) {
  var ctrl = this,
      tabs = ctrl.tabs = $scope.tabs = [];

  ctrl.select = function(selectedTab) {
    angular.forEach(tabs, function(tab) {
      if (tab.active && tab !== selectedTab) {
        tab.active = false;
        tab.onDeselect();
      }
    });
    selectedTab.active = true;
    selectedTab.onSelect();
  };

  ctrl.addTab = function addTab(tab) {
    tabs.push(tab);
    // we can't run the select function on the first tab
    // since that would select it twice
    if (tabs.length === 1) {
      tab.active = true;
    } else if (tab.active) {
      ctrl.select(tab);
    }
  };

  ctrl.removeTab = function removeTab(tab) {
    var index = tabs.indexOf(tab);
    //The following was commented out to avoid tab selection on destroy
    //issue here
    //https://github.com/angular-ui/bootstrap/issues/2155
    
    //Select a new tab if the tab to be removed is selected
    /*if (tab.active && tabs.length > 1) {
      //If this is the last tab, select the previous tab. else, the next tab.
      var newActiveIndex = index == tabs.length - 1 ? index - 1 : index + 1;
      ctrl.select(tabs[newActiveIndex]);
    }*/
    
    tabs.splice(index, 1);
  };
}]);

function $otherwise(handler){
	
	this.get = function(key, params){
		return handler.get(key, params);
	};
};

/* agUI */
angular.module('agUI', 
		['ui.bootstrap','selectionModel', 'angularFileUpload'])
.provider('$otherwise', function $OtherwiseProvider() {

	var handler = null;
	this.setHandler = function (otherwiseHandler){
		handler = otherwiseHandler;
	};
	
	this.$get = ['$injector', function sessionFactory($injector) {
		if(handler){
			return new $otherwise($injector.get(handler));
		}else{
			return new $otherwise({get: function(key){return key;}});
		}
		
	}];
})
.constant('attachmentIcons', 
		{'image': 'fa fa-file-image-o', 'compressed': 'fa fa-file-archive-o',
	'application/pdf': 'fa fa-file-pdf-o','application/msword': 'fa fa-file-word-o'})
	
.config(['$tooltipProvider', 'datepickerConfig','datepickerPopupConfig',
              function($tooltipProvider,datepickerConfig) {
	$tooltipProvider.options({appendToBody: true});
}])
.factory('connectionInterceptor', function($q) {
	var listenerHandler = {
		  	  listeners: {},
		  	  addListener: function(listener){
		  		  this.listeners[listener.id] = listener;
		  	  },
		  	  removeListener: function(listenerId){
				  delete this.listeners[listenerId];
			  },
			  onRequest: function(config){
				  this.notifyListeners('onRequest', config);
			  },
			  onResponse: function(response){
				  this.notifyListeners('onResponse', response);
			  },
			  onRequestError: function(rejection){
				  this.notifyListeners('onRequestError', rejection);
			  },
			  onResponseError: function(rejection){
				  this.notifyListeners('onResponseError', rejection);
			  },			  
			  notifyListeners: function(eventId, param) {
				  for(var listenerId in this.listeners)
					  if(this.listeners[listenerId][eventId])
						  this.listeners[listenerId][eventId](param);
			  }
	};
	return {
  	  addListener: function(listener){
  		listenerHandler.addListener(listener);
  	  },
  	  removeListener: function(listenerId){
  		listenerHandler.removeListener(listenerId);
	  },
  	  request: function(config) {
  		listenerHandler.onRequest(config);
  		
  		if(config && config.cancelRequest){
  			/* request cancellation was requested */
  			return $q.reject(config);
  		}
            return config || $q.when(config);
        },
        requestError: function(rejection) {
        	listenerHandler.onRequestError(rejection);
      	  return $q.reject(rejection);
        },
        response: function(response) {
        	listenerHandler.onResponse(response);
            return response || $q.when(response);
        },
      responseError: function(rejection) {
    	  listenerHandler.onResponseError(rejection);
          return $q.reject(rejection);
      }
    };
  
})
.config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push('connectionInterceptor');
  }])
.service('$ui', function($modal, $rootScope, $location){
	var opennedModals = {};

	$rootScope.$on('$locationChangeStart', function(event, currentRoute, prevRoute) {
		if(opennedModals.current){
			if(opennedModals.current.closeOption && opennedModals.current.closeOption.closeable === false) return;
			opennedModals.current.dismiss('cancel');
			delete opennedModals.current;
		}
	});
	this.register = function (uiName, handler) {
		this[uiName] = handler;
	},
	this.registerModal = function (modalName, handler) {
		this[modalName] = handler;
	},
	this.showModal = function (templateUrl, controller, resolve, onOK, onCancel, modalOptions, closeOption) {
		var options = {templateUrl: templateUrl, controller: controller, resolve: resolve};
		if(modalOptions)
			angular.extend(options, modalOptions);

		var modalInstance = $modal.open(options);
		modalInstance.result.then(function (result) {
			delete opennedModals.current;
			if(onOK)
				onOK(result);

		}, function () {
			delete opennedModals.current;
			if(onCancel)
				onCancel();
		});

		modalInstance.opened.then(function(){
			opennedModals.current = modalInstance;
			if(closeOption)
				opennedModals.current.closeOption = closeOption;
		});
	};

	this.showConfirmation = function (msg, params, onOK, onCancel){
		this.showModal('views/confirmation.html', 'ConfirmationController', {options: function () {return {msg:msg, msgParams:params};}}, onOK, onCancel);
	};

	this.showSelectIdentity = function (identityType, title, onOK, onCancel){
		var options = {options: function () {return {title: title, identityType:identityType};}};
		this.showModal('views/selectIdentity.html', 'SelectIdentityController', options, onOK, onCancel);
	};

	this.showAddIdentityLink = function (identityType, roles, title, onOK, onCancel){
		var options = {options: function () {return {title: title, roles:roles, identityType:identityType};}};
		this.showModal('views/addIdentityLink.html', 'AddIdentityController', options, onOK, onCancel);
	};  

	this.showPostComment = function (resource){
		this.showModal('views/postComment.html', 'CommentController', {resource: function(){return resource;}});
	};

	this.showAddVar = function (resource){
		this.showModal('views/addVar.html', 'AddVarController', {resource: function(){return resource;}});
	};

	this.showEditVar = function (resource, variable){
		this.showModal('views/editVar.html', 'EditVarController', {options: function(){return {resource: resource, variable: variable};}});
	};

	return this;
})
.controller('NotificationsController', function($scope, $timeout, $ui) {
	$scope.alerts = {};
	$scope.alertCount = 0;

	$scope.addAnAlert = function(notification) {
		var index = $scope.alertCount;
		$scope.alertCount++;
		var onTimeout = function (){
			$scope.closeAlert(index);
		};
		var timeout = notification.timeout || 8000;
		if(timeout>0)
			$timeout(onTimeout, timeout);
		var alert = {id: ''+index};
		$scope.alerts['alert'+index] =  angular.extend(alert, notification);
		return index;
	};

	$scope.closeAlert = function(index) {
		delete $scope.alerts['alert'+index];
	};
	
	$ui.register('showNotification',function (notification) {
		$scope.addAnAlert(notification);
	});
    
})

.directive('agNotifications', function () {
  return {
    controller:'NotificationsController',
    templateUrl:'views/notifications.html'
  };
})
.controller('AgModalController', function($scope, $modalInstance, $injector, options) {
	if(options.title)
		$scope.title = options.title;
	
	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};
	
	if(options.handler){
		var handler = options.handler;
		if(angular.isString(handler)){
			handler = $injector.get(handler);
			$injector.invoke(handler.handle, handler, {scope: $scope, modal: $modalInstance, options: options});
		}else{
			$injector.invoke(handler, null, {scope: $scope, modal: $modalInstance, options: options});
		}
	}
})
.controller('ConfirmationController', function($scope, $modalInstance, options) {
	$scope.msg = options.msg;
	$scope.msgParams = options.msgParams;
	$scope.ok = function() {
		$modalInstance.close();
	};
	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};
})
.controller('CommentController', function($scope, $modalInstance, resource) {
	$scope.showErrors = false;
	$scope.submitForm = function(isValid, comment) {
		// check to make sure the form is completely valid
		if (!isValid) {$scope.showErrors = true; return;}
			
		resource.addComment(comment);
		$modalInstance.close();
	};

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

})
.controller('AddVarController', function($scope, $modalInstance, resource) {
		$scope.ok = function(isValid, variable) {
		
		// check to make sure the form is completely valid
		if (!isValid) {$scope.showErrors = true; return;}
		
		resource.addVariable(variable);
		$modalInstance.close();
	};

  $scope.checkDuplicate = function (name){
	  for(var i = 0, l = resource.variables.length; i<l ; i++){
			if(name === resource.variables[i].name){
				return true;
			}
		}
		return false; 
  };
  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

})
.controller('EditVarController', function($scope, $modalInstance, options) {
	
	var theVariable = {name:options.variable.name, type: options.variable.type, dateValue: '', stringValue: '', numberValue:0};
	
	if(options.variable.type){
		if(options.variable.type === 'string') theVariable.stringValue = options.variable.value;
		else if(options.variable.type === 'long') theVariable.numberValue = options.variable.value;
		else if(options.variable.type === 'date') theVariable.dateValue = new Date(options.variable.value);
	}else{
		theVariable.type = 'string';
	}
	
	$scope.variable = theVariable;
	
	$scope.ok = function(isValid, variable) {
		
		// check to make sure the form is completely valid
		if (!isValid) {$scope.showErrors = true; return;}
		
		var updatedVariable = {name:variable.name, type: variable.type};
		
			if(variable.type === 'string') updatedVariable.value = variable.stringValue;
			else if(variable.type === 'long') updatedVariable.value = variable.numberValue;
			else if(variable.type === 'date') updatedVariable.value = variable.dateValue;
		
	    options.resource.editVariable(options.variable, updatedVariable);
	    		  
		$modalInstance.close();
	};

	$scope.deleteVar = function (variable) {
		options.resource.deleteVariable(options.variable);
		$modalInstance.close();
	  };
	  
  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

})
.directive('agNav', function($location) {
	  return function(scope, element, attrs) {
		  
		     var matchSub = attrs.navSub || true;
		     
		     function updateSelection(next, current) {
		    	 
		    	 var activeElement = element.find('.active');
		    	 
		    	 var selectedElement = element.find('li > a[href|="#'+$location.path()+'"]').parent();
		    	 
		    	 if(selectedElement.length<=0 && matchSub === true){
		    		 var path = $location.path();
		    		 var slashIndex = path.lastIndexOf("/");
		    		 while(slashIndex>0 && selectedElement.length<=0){
		    			 path = path.substring(0, slashIndex);
		    			 selectedElement = element.find('li > a[href|="#'+path+'"]').parent();
		    			 slashIndex = path.lastIndexOf("/");
		    		 }
		    	 }
		    	 activeElement.removeClass('active');
		    	 
		    	selectedElement.addClass('active');
		    	 
		     };
		     
		     scope.$on('$routeChangeSuccess', updateSelection);
		     
		     updateSelection();
		  };
		})
.directive('agContent', function($otherwise) {
    return {link: function(scope, element, attrs) {
    	 var otherwiseKey = element.attr('otherwiseKey') || '';
		 scope.$watch(attrs.agContent, function (content) {
			 if(content){
				 element.html(content);
			  }else if(otherwiseKey !== ''){
				  element.html($otherwise.get(otherwiseKey));
			  }
       });
		  }};
})
.directive('agClick', function($parse) {
      return {
        compile: function($element, attr) {
          var fn = $parse(attr.agClick);
          return function(scope, element, attr) {
            element.on('click', function(event) {
              scope.$apply(function() {
                fn(scope, {$event:event});
                event.preventDefault();
                event.stopPropagation();
              });
            });
          };
        }
      };
})
.directive('agDate', function($otherwise, $filter) {
    return {link: function(scope, element, attrs) {
    	 var otherwiseKey = element.attr('otherwiseKey') || '';
		 scope.$watch(attrs.agDate, function (value) {
			 if(value){
				 element.html($filter('date')(value, 'd MMMM yyyy h:mm a'));
			  }else if(otherwiseKey !== ''){
				  element.html($otherwise.get(otherwiseKey));
			  }
       });
		  }};
})
.directive('agKeynav', function() {
    return function(scope, element, attr) {
    	var pageSize = attr.agPagesize || 5;
    element.on('keydown', navigate);
      function navigate($event){
    	var list = scope.$eval(attr.agKeynav);
  		var eventInfo = {steps:0, first: false, last:false};
  		if($event.keyCode === 33){
  			eventInfo.steps = - pageSize;
  		}else if($event.keyCode === 34){
  			eventInfo.steps =  pageSize;
  		}else if($event.keyCode === 35){
  			eventInfo.last = true;
  		}else if($event.keyCode === 36){
  			eventInfo.first = true;
  		}else if($event.keyCode === 40){
  			eventInfo.steps =  1;
  		}else if($event.keyCode === 38){
  			eventInfo.steps =  -1;
  		}else{
  			return;
  		}
  		if(list.length <= 0) return;
  		
  		$event.preventDefault();
  	    $event.stopPropagation();
  	    
  	    var elem = element.find(".select-list");
  	    var activeIndex  = elem.find(".active").index();
  	    var targetIndex = -1;
  	    if(activeIndex === -1){
  	    	targetIndex = 0;
  	    }else{
  	    	if(eventInfo.first)
  	    	targetIndex = 0;
  	    	else if(eventInfo.last)
  	    		targetIndex = list.length -1;
  	    	else{
  	    		targetIndex = activeIndex + eventInfo.steps;
  	    	}
  	    	
  	    	if(targetIndex <= 0) targetIndex = 0;
  	    	else if(targetIndex >= list.length) targetIndex = list.length -1;
  	    }
  	    
  	    if(activeIndex === targetIndex) return;
  	    var targetElement = elem.children().eq(targetIndex).children().eq(0);
  	    
  	    if(targetIndex === 0){
  	    	elem.scrollTop(0);
  	    }else if (targetIndex === list.length -1){
  	    	elem.scrollTop(elem[0].scrollHeight);
  	    }else{
  	    	
  	    	var elementTop = targetElement.offset().top;
  	    	var minTop = elem.offset().top;
  	    	var maxTop = minTop + elem.height() - targetElement.height() ;
  	    	if(!(elementTop > minTop && elementTop < maxTop))
  	    		targetElement[0].scrollIntoView();
  	    }
  	    scope.$apply(function(){
  	    	list[targetIndex].selected = true;
  	    });
  	};
    };
  })
.directive('agFocus', function($timeout) {
	  return {link: function(scope, element, attrs) {
		  $timeout(function(){
			  element.focus();
		  }, 500);
		  }};
		})
.directive('agLoading', function(connectionInterceptor/*, $http*/){
	return function(scope, element, attrs) {
		var pending = [], connectError = false;
		var connListener = {
				id: 'agLoading',
				onRequest: function(config){
					pending.push({});
					if(connectError === false)
						element.find('.loading').css('display', 'block');
				  },
				  onResponse: function(response){
					  //console.log($http.pendingRequests.length);
					  if(connectError === true){
						  connectError = false;
						  element.find('.con-error').css('display', 'none');
					  }
					  pending.pop();
					  if(pending.length === 0)
						  element.find('.loading').css('display', 'none');
				  },
				  onRequestError: function(rejection){
					  this.onError();
				  },
				  onResponseError: function(rejection){
					  this.onError();
					  if (rejection.status === 0){
						  element.find('.con-error').css('display', 'block');
						  connectError = true;
					  }
				  },
				  onError: function(rejection) {
					  pending = [];
					  element.find('.loading').css('display', 'none');
				  }
				};
		connectionInterceptor.addListener(connListener);
	};
})
//ag-attachment
.directive('agAttachment', function(attachmentIcons) {
	return function (scope, element, attr){
		scope.$watch(attr.agAttachment, function (attachment){
			if(attachment){
				var classes = '', href='';
				if(attachment.externalUrl){
					classes='glyphicon glyphicon-share-alt';
					href = attachment.externalUrl;
				}else{
					if(attachment.type){
						if(attachmentIcons[attachment.type]){
							classes = attachmentIcons[attachment.type];
						}else if(attachment.type.substr(0, 5) === 'image'){
							classes = attachmentIcons.image;
						}else if(attachment.type.indexOf('compressed')!=-1){
							classes = attachmentIcons.compressed;
						}
					}
					if(classes === undefined || classes === '')
						classes='fa fa-file';
					href = attachment.contentUrl + '/' + encodeURI(attachment.name);
				}
				element.attr('href', href);
				element.html('<i class="'+classes+'"></i> <span>'+attachment.name+'</span>');
			}
		    });
	};
})
.directive('agAgo', ['$interval', '$otherwise', '$filter',
    function($interval, $otherwise, $filter) {
      return function(scope, element, attrs) {
        var stopTime = undefined,
        otherwiseKey = element.attr('otherwiseKey') || '',
        translateKey = element.attr('translateKey') || '',
        dateValue;
        
        function updateTime() {
        	if(dateValue)
        		updateElement(moment(new Date(dateValue)).fromNow());
        }
        
        function updateElement(text) {
        	if (translateKey !== ''){
        		element.text($otherwise.get(translateKey,{ago: text}));
        	}else{
        		element.text(text);
        	}
        		 
        }

        scope.$watch(attrs.agAgo, function(value) {
        	if(value){
        		dateValue = value;
        		updateTime();
        		element.attr('title', $filter('date')(value, 'd MMMM yyyy h:mm a'));
        		
        		// start a timer if none was started
        		if(!stopTime)
        			stopTime = $interval(updateTime, 30000);

        	}else{
        		// stop the timer if one was started
        		if(stopTime)
        			$interval.cancel(stopTime);
        		
        		if (otherwiseKey !== ''){
        			var otherwiseVal = $otherwise.get(otherwiseKey);
        			element.text(otherwiseVal);
        			element.attr('title', otherwiseVal);
        		}
        	}
        });

        // stop the timer if one was started
        element.on('$destroy', function() {
        	if(stopTime)
        		$interval.cancel(stopTime);
        });
      };
    }])
.filter('variable', function($filter) {
	  return function(value, type) {
		    if(type === 'date')
		    	return $filter('date')(value, 'd MMMM yyyy h:mm a');
		    
		    return value;
		  };
		})
.run(function($templateCache, $rootScope, $translate, $route){
	var templates = actangular.templates;
	for(var i= 0, l=templates.length; i<l;i++){
		$templateCache.put(templates[i].id,templates[i].content);
	}
	// actangular.templates no longer needed
	// delete to free memory 
	delete actangular.templates;
	
	function checkLocaleCss(){
		var css = $translate.instant('CSS');
		if('CSS' !== css){
			document.getElementById("localeCss").innerHTML = css;
		}else{
			document.getElementById("localeCss").innerHTML = '';
		}
	}
	//checkLocaleCss();
	
	function updateTitle(){
		var title = '';
		if($route.current && $route.current.title)
			  title = $route.current.title;
		  else
    		  return;
  	  $translate('PAGE_TITLE',{page: 'MENU_'+title}).then(function(translation){
  		  document.title = translation;
  	  });
    };
    $rootScope.$on("$translateChangeSuccess",handleLocaleChange);
    $rootScope.$on("$routeChangeSuccess", function(event, currentRoute, previousRoute) {
    	updateTitle(currentRoute.title);
  	});
    
    function handleLocaleChange(){
    	checkLocaleCss();
    	updateTitle();
    }
})
.run(function($ui, $form){
	$ui.registerModal('showStartForm', function(processDefinition, options, noForm, success, fail){
		$form.handleStartForm(processDefinition.id, options, noForm, success, fail);
	});
	$ui.registerModal('showTaskForm', function(task, options, noForm, success, fail){
		$form.handleTaskForm(task.id, options, noForm, success, fail);
	});

});

})();