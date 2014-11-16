(function() {'use strict';

/* agProcess */

angular.module('agProcess', [])
.factory('definitionCache', function() {
	var definitions = {};
	function getProcessDefinitionLatestVersion(processDefinitions){
		var latestVersion = -1;
		for(var version in processDefinitions){
			if(processDefinitions[version].version > latestVersion)
				latestVersion = processDefinitions[version].version;
		}
		return processDefinitions[latestVersion];
	};
	return {
		addProcessDefinition : function(processDefinition){
			var keyVersionId = processDefinition.id.split(':');
			if(definitions[keyVersionId[0]] === undefined){
				definitions[keyVersionId[0]] = {};
			}
			definitions[keyVersionId[0]][keyVersionId[1]] = processDefinition;
		},
		getProcessDefinition : function(processDefinitionId){
			var keyVersionId = processDefinitionId.split(':');
			if(definitions[keyVersionId[0]]){
				if(definitions[keyVersionId[0]][keyVersionId[1]]) return definitions[keyVersionId[0]][keyVersionId[1]];
			}
			return null;
		},
		getProcessDefinitions : function(lastestVersionsOnly){
			var processDefinitions = [];
			for(var key in definitions){
				if(lastestVersionsOnly && lastestVersionsOnly === true){
					processDefinitions.push(getProcessDefinitionLatestVersion(definitions[key]));
				}else{
					processDefinitions.push(definitions[key]);
				}
			}
			return processDefinitions;
		}
	};
})
.factory('ProcessDefinitions', function(RepositoryRestangular, definitionCache) {
	return RepositoryRestangular.withConfig(function(RestangularConfigurer) {
		RestangularConfigurer.setResponseExtractor(function(response) {
			if (angular.isArray(response)) {
				for(var i=0, l=response.length;i<l;i++){
					definitionCache.addProcessDefinition(angular.copy(response[i]));
				}
			} else {
				definitionCache.addProcessDefinition(angular.copy(response));
			}
			return response;
		});
	}).service('process-definitions');
})
.factory('Models', function(RepositoryRestangular) {
	return RepositoryRestangular.service('models');
})
.factory('$processInsatnceCache', ['$cacheFactory', function($cacheFactory) {
	return $cacheFactory('process-instance-cache');
}])
.factory('ProcessInstances', function(RuntimeRestangular) {
	return RuntimeRestangular.service('process-instances');
})
.factory('HistoricProcessInstances', function(HistoryRestangular, $processInsatnceCache,$q, ProcessInstance, $process) {
	return HistoryRestangular.withConfig(function(RestangularConfigurer) {
		RestangularConfigurer.extendModel('historic-process-instances', function(processInstance) {
			if(processInstance.fromServer === false) return processInstance;

			var cachedProcessInstance = $processInsatnceCache.get(processInstance.id);
			if(cachedProcessInstance){
				cachedProcessInstance.updateFromServer(processInstance);
				return cachedProcessInstance;
			}

			$processInsatnceCache.put(processInstance.id, processInstance);

			$q.when($process.getProcessDefinition(processInstance.processDefinitionId))
			.then(function(definition){
				processInstance.definition = definition;
			});
			processInstance = angular.extend(processInstance, ProcessInstance);
			processInstance.updateFromServer();
			return processInstance;
		});
	}).service('historic-process-instances');
})
.factory('ProcessDefinition', function (){
	return {};
})
.factory('ProcessInstance', function (HistoryTasks){
	return {
		updateFromServer: function(update){
			if(update){
				if(update.endTime===null){
					delete update.variables;
				}
				angular.extend(this, update);
			}else{
				if(this.endTime===null)
					delete this.variables;
			}
			
		},
		refresh: function(forceRefresh){
			var me = this;
			this.getList('../../historic-process-instances', {processInstanceId: this.id, includeProcessVariables: true}).then(
					function(processInstances){
						if(processInstances.length>0){
							me.updateFromServer(processInstances[0]);
						}
						//me.updateFromServer(update);

						me.refreshIdentityLinks(forceRefresh);
						me.refreshVariables(forceRefresh);
						me.refreshTasks(forceRefresh);
						me.refreshActivityIds(forceRefresh);
					}
			);
			
		},
		deleteProcessInstance: function (success, failed){
			this.customDELETE("../../../runtime/process-instances/"+this.id).then(success, failed);
		},
		refreshTasks: function(forceRefresh){
			if(forceRefresh || !this.tasks){
			var me = this;
			HistoryTasks.getList({processInstanceId: this.id}).then(
					function (tasks){
						me.tasks = tasks;
					}
			);
			}
		},
		refreshVariables : function (forceRefresh, success, failed){
			if(forceRefresh || !this.variables){
			var me = this;
			this.getList("../../../runtime/process-instances/"+this.id+"/variables").then(function (variables){
				me.variables = variables;
			});
			}
		},
		addVariable : function (variable, success, failed){
			var me = this;
			variable.scope = 'local';
			var variableArr = [variable];
			this.customPOST(variableArr, "../../../runtime/process-instances/"+this.id+"/variables").then(function (){
				me.refreshVariables(true);
			});
		},

		editVariable : function (variable,variableUpdate, success, failed){
			var me = this;
			variable.scope = 'local';
			variable.customPUT(variableUpdate,variable.name).then(function (updatedVariable){
				me.refreshVariables(true);
			});
		},

		deleteVariable : function (variable, success, failed){
			var me = this;
			variable.customDELETE(variable.name).then(function (){
				me.refreshVariables(true);
			});
		},
		refreshIdentityLinks : function (forceRefresh, success, failed){
			if(forceRefresh || !this.identityLinks){
			var me = this;
			this.getList("identitylinks").then(function(identityLinks){
				for(var i=0; i< identityLinks.length;i++){
					if(identityLinks[i].userId)
						identityLinks[i].user = identityLinks[i].userId;
					else if(identityLinks[i].groupId)
						identityLinks[i].group = identityLinks[i].groupId;

				}
				me.identityLinks = identityLinks;
			});
			}
		},

		addIdentityLink : function (identityLink, success, failed){
			var me = this;
			this.post("../../../runtime/process-instances/"+this.id+"/identitylinks", identityLink, "identitylinks").then(function (){
				me.refreshIdentityLinks(true);
			});
		},
		
		deleteIdentityLink : function (identityLink, success, failed){
			var me = this;
			var link = 'users/'+identityLink.userId+'/'+identityLink.type;
			this.customDELETE('../../../runtime/process-instances/'+this.id+'/identitylinks/'+link).then(function (){
				me.refreshIdentityLinks(true);
			});
		},
		
		refreshActivityIds : function (forceRefresh, success, failed){
			if(forceRefresh || !this.activities){
			var me = this;
			this.getList("../../../runtime/executions/"+this.id+"/activities").then(function(activities){
				me.activities = activities;
			});
			}
		}
	};
})
.factory('ProcessDefinitionPage', function (ListPage,ProcessDefinitions, $ui, $process){
	return angular.extend({
		loaded: false,
		template: 'views/listPage.html',
		listControlsTemplate: 'definition/listControls.html', 
		listTemplate: 'definition/list.html',
		section: '',
		requestParam : {start:0, order: 'desc', sort: 'id'},
		listSize : 10,
		queryResource: ProcessDefinitions,
		start : function(definition){
			$process.startProcess(definition, function(processInstance){
				if(processInstance){
					$ui.showNotification({type: 'success', translateKey: 'NOT_PROCESS_STARTED', translateValues :{id:processInstance.id, name: definition.name}});
				}
			});
		}
	}, ListPage);
})
.factory('ProcessInstancesPage', function (ListPage,HistoricProcessInstances, $processInsatnceCache, $ui, $process){
	
	var processInstancesPage = angular.extend({}, ListPage);
	return angular.extend(processInstancesPage, {
		requestParam : {start:0, order: 'desc', sort: 'processInstanceId',  finished: false},
		template: 'views/listPage.html',
		listControlsTemplate: 'process/listControls.html', 
		listTemplate: 'process/list.html',
		itemControlsTemplate: 'process/itemControls.html', 
		itemTemplate: 'process/item.html',
		itemName: 'processInstance',
		sortKeys: {processInstanceId: 'id', startTime: 'startTime'},
		listSize : 10,
		queryResource: HistoricProcessInstances,
		cache: $processInsatnceCache,
		queryList : function(requestParam, success, fail){
			if(!this.list || requestParam.processInstanceId)
				return this.queryResource.getList(requestParam).then(success, fail);
			
			return this.queryResource.getList(requestParam).then(function(list){
				// force cached process instances to refresh activityIds
				for(var i=0; i<list.length;i++){
					if(list[i].definition && list[i].definition.graphicalNotationDefined && list[i].activities)
						list[i].refreshActivityIds(true);
				}
				success(list);
			}, fail);
		},
		queryOne : function(processInstanceId, success, fail){
			var requestParams = {processInstanceId: processInstanceId};
			angular.extend(requestParams, this.requestParam);
			requestParams.start = 0;
			return this.queryList(requestParams,function(processInstances){
				if(processInstances.length===0){
					fail();
				}else{
					success(processInstances[0]);
				}
			},fail);
		},
		refreshProcessInstance : function(processInstance){
			var me = this;
			this.queryOne(processInstance.id, function(updatedProcessInstance){
				
				updatedProcessInstance.refreshIdentityLinks(true);
				updatedProcessInstance.refreshVariables(true);
				updatedProcessInstance.refreshTasks(true);
				updatedProcessInstance.refreshActivityIds(true);
			}, function(){
				me.back(true);
			});
		},
		deleteProcessInstance : function (processInstance) {
			var me = this;
			var name = processInstance.name || processInstance.definition.name;
			$ui.showConfirmation('CONFIRM_DELETE_PROCESS', {id:processInstance.id, name:name}, function(){
				processInstance.deleteProcessInstance(
						function(){
							me.back(true);
							me.cache.remove(processInstance.id);
							$ui.showNotification({type: 'info', translateKey: 'NOT_PROCESS_DELETE_OK', translateValues :{id: processInstance.id, name: name}});
						},
						function (response){
							//TODO handle error response
							me.back(true);
							me.cache.remove(processInstance.id);
							$ui.showNotification({type: 'danger', translateKey: 'NOT_PROCESS_DELETE_FAIL', translateValues :{id: processInstance.id, name: name}});
						}
				);
			}
			);

		},
		showEditVar : function(processInstance, variable){
			$ui.showEditVar(processInstance, variable);
		},
		showAddVar : function(processInstance){
			$ui.showAddVar(processInstance);
		},
		addIdentityLink : function (processInstance) {
			$ui.showAddIdentityLink('user', ['participant', 'candidate'], 'INVOLVE_TO_PROCESS', function(identityLink){
				processInstance.addIdentityLink(identityLink);
			});
		},
		deleteIdentityLink: function (processInstance, identityLink) {
			$ui.showConfirmation('CONFIRM_DeleteUserLink', {user: identityLink.userId, type: identityLink.type}, function(){
				processInstance.deleteIdentityLink(identityLink);
			}
			);
		}
	});
})
.factory('HistoricProcessInstancesPage', function (ListPage,HistoricProcessInstances,$processInsatnceCache){
	
	var archivedProcessInstancesPage = angular.extend({}, ListPage);
	return angular.extend(archivedProcessInstancesPage, {
		requestParam : {start:0, order: 'desc', sort: 'processInstanceId',  finished: true, includeProcessVariables: true},
		template: 'views/listPage.html',
		listControlsTemplate: 'archivedProcess/listControls.html', 
		listTemplate: 'archivedProcess/list.html',
		itemControlsTemplate: 'archivedProcess/itemControls.html', 
		itemTemplate: 'archivedProcess/item.html',
		itemName: 'processInstance',
		sortKeys: {processInstanceId: 'id', startTime: 'startTime', endTime : 'endTime'},
		listSize : 10,
		queryResource: HistoricProcessInstances,
		cache: $processInsatnceCache,
		getItem : function(processInstanceId){
			var processInstance = this.cache.get(processInstanceId);
			if(processInstance){
				if(processInstance.endTime !== null)
					return processInstance;
				this.cache.remove(processInstanceId);
			}
		}
	});
})
.factory('ModelPage', function (ListPage,Models, $ui){
	return angular.extend({
		template: 'views/listPage.html',
		listControlsTemplate: 'model/listControls.html', 
		listTemplate: 'model/list.html',
		section: '',
		requestParam : {start:0, order: 'desc', sort: 'id'},
		listSize : 10,
		queryResource: Models,
		newModel: function(){
			$ui.showNewModel(function(model){
				Models.post(model);
				this.refresh();
			}.bind(this));
		},
		editModel: function(model){
			$ui.showEditModel(model, function(modifiedModel){
				model.customPUT(modifiedModel).then(function(updatedModel){
					angular.extend(model, updatedModel);
				});
				
			}.bind(this));
		},
		deleteModel : function (model) {
			var me = this;
			$ui.showConfirmation('CONFIRM_DELETE_MODEL', {id:model.id, name:model.name}, function(){
				model.remove().then(
						function(){
							me.refresh();
						}
				);
			}
			);

		}
	}, ListPage);
})
.service('$processPage', function($session, ProcessDefinitionPage,ProcessInstancesPage, HistoricProcessInstancesPage, ModelPage){
	var definitionListPage = angular.extend({}, ProcessDefinitionPage),
	myInstancesListPage = createProcessInstanceListPage('myinstances', 'startedBy'),
	participantListPage = createProcessInstanceListPage('participant', 'involvedUser'),
	archivedListPage = createArchivedProcessInstanceListPage('archived', 'involvedUser'),
	modelListPage = angular.extend({}, ModelPage);

	function createProcessInstanceListPage(section, param){
		var listPage = angular.extend({section: section}, ProcessInstancesPage);
		listPage.requestParam = angular.extend({}, ProcessInstancesPage.requestParam);
		listPage.requestParam[param] = $session.getUserId();
		return listPage;
	};
	
	function createArchivedProcessInstanceListPage(section, param){
		var listPage = angular.extend({section: section}, HistoricProcessInstancesPage);
		listPage.requestParam = angular.extend({}, HistoricProcessInstancesPage.requestParam);
		listPage.requestParam[param] = $session.getUserId();
		return listPage;
	};
	
	this.getDefinition = function(definitionId){
		return definitionListPage.show(definitionId);
	};
	this.getMyInstances = function(processInstanceId){
		return myInstancesListPage.show(processInstanceId);
	};
	this.getParticipant = function(processInstanceId){
		return participantListPage.show(processInstanceId);
	};
	this.getArchived = function(processInstanceId){
		return archivedListPage.show(processInstanceId);
	};
	
	this.getModel = function(modelId){
		return modelListPage.show(modelId);
	};

})
.service('$process', function(definitionCache, $ui, ProcessInstances, ProcessDefinitions){

	function fetchProcessDefinition(processDefinitionId){
		return ProcessDefinitions.one(processDefinitionId).withHttpConfig({cache: true}).get();
	}

	this.getProcessDefinition = function(processDefinitionId){
		var processDefinition = definitionCache.getProcessDefinition(processDefinitionId);
		if(processDefinition !== null) return processDefinition;
		return fetchProcessDefinition(processDefinitionId);
	};

	this.startProcess = function (definition, success, failure){
		$ui.showStartForm(definition,{}, function(processInstance){
			//No start form
			startProcess(definition, null, success,failure);

		}, success, failure);
	};

	function startProcess(definition, variables, success, failure){
		var data  = {processDefinitionId:definition.id};
		if(variables && variables.length>0)
			data.variables = variables;
		ProcessInstances.post(data).then(success, failure);
	};
})
.filter('definitionName', function(definitionCache) {
	return function(processDefinitionId) {
		if(processDefinitionId){
			var processDefinition = definitionCache.getProcessDefinition(processDefinitionId);
			if(processDefinition !== null) return processDefinition.name;
		}
		return processDefinitionId;
	};
})
.controller('StartProcessModalInstanceCtrl', function ($scope, $modalInstance, definitionCache) {
	var itemList = definitionCache.getProcessDefinitions(true);

	$scope.itemList = itemList;
	$scope.selectedItems = [];
	$scope.filteredList = angular.copy(itemList);

	$scope.ok = function(selectedDefinitions) {
		if(selectedDefinitions.length <= 0) {$scope.showErrors = true; return;}
		$modalInstance.close(selectedDefinitions[0]);
		//$process.startProcess(selectedDefinitions[0]);
	};

	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};

})
.controller('CreateEditModelCtrl', function ($scope, $modalInstance, options) {
	var model = {};
	if(options.model){
		model.name = options.model.name;
		model.metaInfo = options.model.metaInfo;
		model.category = options.model.category;
		$scope.title = 'EDIT_MODEL';
	}else{
		$scope.title = 'NEW_MODEL';
	}

	$scope.showErrors = false;
	$scope.model = model;

	$scope.submitForm = function(isValid) {
		// check to make sure the form is completely valid
		if (isValid) {
			$modalInstance.close($scope.model);
		}else{
			$scope.showErrors = true;
		}
	};

	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};

})
.run(function($process, $ui){
	$ui.registerModal('showStartNewProcess', function (onOK, onCancel){
		this.showModal('views/startProcess.html', 'StartProcessModalInstanceCtrl', {}, function (definition){
			$process.startProcess(definition, function(processInstance){
				if(processInstance){
					$ui.showNotification({type: 'success', translateKey: 'NOT_PROCESS_STARTED', translateValues :{id:processInstance.id, name: definition.name}});
				}
			});
		}, onCancel);
	});
	$ui.registerModal('showNewModel', function (onOK, onCancel){
		this.showModal('views/editModel.html', 'CreateEditModelCtrl', {options: function(){return {};}}, onOK, onCancel);
	});
	
	$ui.registerModal('showEditModel', function (model, onOK, onCancel){
		this.showModal('views/editModel.html', 'CreateEditModelCtrl', {options: function(){return {model: model};}}, onOK, onCancel);
	});
});

})();
