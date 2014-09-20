(function() {'use strict';

/* agProcess */


function $diagram($http, svgStyle){
	var svgDocuments = {};
	this.renderDefinitionDiagram = function(element, definition){
		if(definition.diagramResource.indexOf('svg',definition.diagramResource.length - 3)!==-1){
			getSvgElement(definition, function(svgElement){
				var svg = createSvgElement(svgElement);
				var outerDiv = angular.element('<div />');
				var svgCon = angular.element('<div class="svgCon"></div>');
				svgCon.append(svg);
				outerDiv.append(svgCon);
				var html = "<div><span class='svg'>SVG</span></div>"+outerDiv.html();
				element.html(html);
			});
		}else{
			var html = "<div><span class='png'>PNG</span></div><img src='"+definition.diagramResource.replace("/resources/", "/resourcedata/")+"'>";
			element.html(html);
		}
	};
	
	this.renderProcessInstanceDiagram = function(element, processInstance, activities){
		
		if(processInstance.definition.diagramResource.indexOf('svg',processInstance.definition.diagramResource.length - 3)!==-1){
			renderProcessInstanceSVGDiagram(element, processInstance, activities);
		}else{
			var diagramUrl = "service/runtime/process-instances/"+processInstance.id+"/diagram";
			if(activities.length>0){
				diagramUrl+="?x="+activities[0];
				for(var i=1;i<activities.length;i++)
					diagramUrl+="_"+activities[i];
			}
			var html = "<div><span class='png'>PNG</span></div><img src='"+diagramUrl+"'>";
			element.html(html);
		}
	};
	function renderProcessInstanceSVGDiagram(element, processInstance, activities){
		var processId = "process"+processInstance.id;
		var styleElm = element.find('#style_'+processId);
		if(styleElm.length>0){
			styleElm.text(createSvgProcessInstanceCssSelectors(processId, activities)+svgStyle);
			return;
		}
		
		getSvgElement(processInstance.definition, function(svgElement){
			var svg = createSvgElement(svgElement);
			var style = '<style id="style_'+processId+'" type="text/css">'+createSvgProcessInstanceCssSelectors(processId, activities)+svgStyle+'</style>';
			var outerDiv = angular.element('<div>'+style+'</div>');
			var svgCon = angular.element('<div class="svgCon"></div>');
			svg.attr('id',processId);
			svgCon.append(svg);
			outerDiv.append(svgCon);
			var html = "<div><span class='svg'>SVG</span></div>"+outerDiv.html();
			element.html(html);
		});
	};
	function getSvgElement(definition, success){
		if(svgDocuments[definition.id]){
			success(svgDocuments[definition.id]);
		}else{
			$http.get(definition.diagramResource.replace("/resources/", "/resourcedata/"),{cache:true}).success(function(svgdoc){
				var parser = new DOMParser();
				var doc = parser.parseFromString(svgdoc, "image/svg+xml");
				
				processSvgElement(doc);
				svgDocuments[definition.id] = doc.documentElement;
				success(doc.documentElement);
			});
		}
	}
	function createSvgElement(svgElement){
			var parentSvg = angular.element('<svg preserveAspectRatio="xMinYMin"></svg>');
			parentSvg.attr('viewBox',"0 0 "+svgElement.getAttribute('width')+" "+svgElement.getAttribute('height'));
			parentSvg.append(svgElement);
			return parentSvg;
	};
	
	function processSvgElement(doc){
		var def = doc.documentElement.querySelector('svg > defs');
		if(def === undefined || def === null) return;
		
		var markersMap = {}, markers= def.childNodes || [];
		
		for(var i = 0; i < markers.length; i++){
			if(markers[i].tagName === 'marker'){
				markersMap[markers[i].getAttribute('id')] = markers[i];
			}
		}
		
		//var paths = doc.documentElement.querySelectorAll('[marker-end]');
		var paths = doc.documentElement.querySelectorAll('svg > g > g > g:last-child [marker-end]');
		for(var i=0; i<paths.length;i++){
			var path = paths.item(i), markStartUrl = path.getAttribute('marker-start'), markEndUrl = path.getAttribute('marker-end');
			if(markStartUrl){
				markStartUrl = markStartUrl.substring(5, markStartUrl.length-1);
				var markStartSID = markStartUrl.substring(0, markStartUrl.length-5);
				var markStart = markersMap[markStartUrl];
				if(markStart){
					var markerPaths = markStart.childNodes || [], isDefault = false, isConditional = false, type = '';
					for(var j = 0; j < markerPaths.length; j++){
						if(markerPaths[j].tagName === 'path'){
							if(markerPaths[j].getAttribute('display') !== 'none'){
								if(markerPaths[j].getAttribute('id') === (markStartSID+'default')){
									isDefault = true;
								}else if(markerPaths[j].getAttribute('id') === (markStartSID+'conditional')){
									isConditional = true;
								}
							}
						}
					}
					if(isConditional === true){
						type+='_conditional';
					}
					
					if(isDefault === true){
						type+='_default';
					}
					
					if(type === ''){
						path.removeAttribute('marker-start');
					}else{
						path.setAttribute('marker-start','url(#_start_marker'+type+')');
						//Chrome doesn't support external linking
						//path.setAttribute('marker-start','url(img/defs.svg#_start_marker'+type+')');
					}
				}
			}
			
			if(markEndUrl){
				markEndUrl = markEndUrl.substring(5, markEndUrl.length-1);
				var markEnd = markersMap[markEndUrl];
				if(markEnd){
					path.setAttribute('marker-end','url(#_end_marker)');
					//Chrome doesn't support external linking
					//path.setAttribute('marker-end','url(img/defs.svg#_end_marker)');
				}
			}
		}
		def.remove();
	}
	
	function createSvgProcessInstanceCssSelectors(processId, activities){
		var activeSelectors = "";
		if(activities.length>0){
			activeSelectors+="#"+processId+" #"+activities[0]+" > .stencils > .me > g > rect, #"+processId+" #"+activities[0]+" > .stencils > .me > g > circle";
			for(var i=1;i<activities.length;i++)
				activeSelectors+=", #"+processId+" #"+activities[i]+" > .stencils > .me > g > rect, #"+processId+" #"+activities[i]+" > .stencils > .me > g > circle";
		}
		return activeSelectors;
	}
};


angular.module('agProcess', [])
.provider('$diagram', function $DiagramProvider() {
	var svgCss = '{stroke: #ff0000;stroke-width: 3;}';

	this.setSvgStyle = function(svgStyle){
		svgCss = svgStyle;
	};
	this.$get = ['$http', function sessionFactory($http) {
		return new $diagram($http, svgCss);
	}];
})
.config(['$sessionProvider', function($sessionProvider) {
	$sessionProvider.bootListeners.push(function(definitionCache, bootData){
		var definitions = bootData.processDefinitions;
		for(var i=0, l=definitions.length;i<l;i++){
			definitionCache.addProcessDefinition(definitions[i]);
		}
	});
}])
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
				angular.extend(cachedProcessInstance, processInstance);
				return cachedProcessInstance;
			}

			$processInsatnceCache.put(processInstance.id, processInstance);

			$q.when($process.getProcessDefinition(processInstance.processDefinitionId))
			.then(function(definition){
				processInstance.definition = definition;
			});

			return angular.extend(processInstance, ProcessInstance);
		});
	}).service('historic-process-instances');
})
.factory('ProcessDefinition', function (){
	return {};
})
.factory('ProcessInstance', function (HistoryTasks){
	return {
		refresh: function(forceRefresh){
			this.refreshIdentityLinks(forceRefresh);
			this.refreshTasks(forceRefresh);
			this.refreshVariables(forceRefresh);
			this.refreshActivityIds(forceRefresh);
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
			this.getList("../../../runtime/process-instances/"+this.id+"/variables",{scope:'local'}).then(function (variables){
				me.variables = variables;
			});
			}
		},
		addVariable : function (variable, success, failed){
			var me = this;
			variable.scope = 'local';
			var variableArr = [variable];
			this.customPOST(variableArr, "variables").then(function (variables){
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
.factory('ProcessDefinitionPage', function (PageList,ProcessDefinitions, $ui, $process){
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
	}, PageList);
})
.factory('ProcessInstancesPage', function (PageList,HistoricProcessInstances, $ui, $process){
	return angular.extend({
		loaded: false,
		template: 'views/listPage.html',
		listControlsTemplate: 'process/listControls.html', 
		listTemplate: 'process/list.html',
		itemControlsTemplate: 'process/itemControls.html', 
		itemTemplate: 'process/item.html',
		itemName: 'processInstance',
		sortKeys: {processInstanceId: 'id', startTime: 'startTime'},
		listSize : 10,
		queryResource: HistoricProcessInstances,
		showEditVar : function(processInstance, variable){
			$ui.showEditVar(processInstance, variable);
		}
	}, PageList);
})
.config(['$routeProvider',
         function($routeProvider) {
	$routeProvider.
	when('/processes/definitions', {
		title: 'DEFINITIONS',
		resolve: {
			page: function($processPage, $route){
				return $processPage.getDefinition();
			}
		}
	})
	.when('/processes/myinstances/:processInstanceId?', {
		title: 'MYINSTANCES',
		resolve: {
			page: function($processPage, $route){
				return $processPage.getMyInstances($route.current.params.processInstanceId);
			}
		}
	})
	.when('/processes/participant/:processInstanceId?', {
		title: 'PARTICIPANT',
		resolve: {
			page: function($processPage, $route){
				return $processPage.getParticipant($route.current.params.processInstanceId);
			}
		}
	})
	.when('/processes/archived/:processInstanceId?', {
		title: 'ARCHIVED',
		resolve: {
			page: function($processPage, $route){
				return $processPage.getArchived($route.current.params.processInstanceId);
			}
		}
	});
}])
.service('$processPage', function($session, ProcessDefinitionPage, $processInsatnceCache,ProcessInstancesPage,HistoricProcessInstances){
	var definitionListPage = angular.extend({}, ProcessDefinitionPage),
	myInstancesListPage = createProcessInstanceListPage('myinstances', 'startedBy'),
	participantListPage = createProcessInstanceListPage('participant', 'involvedUser'),
	archivedListPage = createArchivedProcessInstanceListPage('archived', 'involvedUser');

	function createProcessInstanceListPage(section, param){
		var listPage = {section: section, cache: $processInsatnceCache};
		listPage = angular.extend(listPage, ProcessInstancesPage);
		listPage.section = section;
		listPage.requestParam = {start:0, order: 'desc', sort: 'processInstanceId',  finished: false, includeProcessVariables: true};
		listPage.requestParam[param] = $session.getUserId();
		listPage.queryOne = function(processInstanceId, success, fail){
			var requestParams = {processInstanceId: processInstanceId};
			angular.extend(requestParams, this.requestParam);
			return this.queryList(requestParams,function(processInstances){
				if(processInstances.length===0){
					fail();
				}else{
					success(processInstances[0]);
				}
			},fail);
		};
		return listPage;
	};
	
	function createArchivedProcessInstanceListPage(section, param){
		var listPage = {section: section, cache: $processInsatnceCache};
		listPage = angular.extend(listPage, ProcessInstancesPage);
		listPage.section = section;
		listPage.requestParam = {start:0, order: 'desc', sort: 'processInstanceId',  finished: true, includeProcessVariables: true};
		listPage.requestParam[param] = $session.getUserId();
		listPage.listControlsTemplate = 'archivedProcess/listControls.html';
		listPage.listTemplate = 'archivedProcess/list.html';
		listPage.itemControlsTemplate = 'archivedProcess/itemControls.html';
		listPage.itemTemplate = 'archivedProcess/item.html';
		listPage.sortKeys = angular.extend({endTime : 'endTime'}, listPage.sortKeys);
		listPage.queryOne = function(processInstanceId, success, fail){
			var requestParams = {processInstanceId: processInstanceId};
			angular.extend(requestParams, this.requestParam);
			return this.queryList(requestParams,function(processInstances){
				if(processInstances.length===0){
					fail();
				}else{
					success(processInstances[0]);
				}
			},fail);
		};
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
.filter('diagram', function() {
	return function(diagramResource) {
		if(diagramResource)
			return diagramResource.replace("/resources/", "/resourcedata/");
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
.directive('agProcessActivities', function($translate, $diagram) {
	return {link: function(scope, element, attrs) {
		var otherwiseKey = element.attr('otherwiseKey') || '';

		scope.$watch(attrs.agProcessActivities, function (activities) {
			var processInstance = scope.$eval(attrs.agProcessDiagram);
			if(processInstance){
				if(processInstance.definition){
					if(processInstance.definition.graphicalNotationDefined && processInstance.endTime === null){
						if(activities === undefined){
							processInstance.refreshActivityIds();
							return;
						}
						$diagram.renderProcessInstanceDiagram(element, processInstance, activities);
						
					}else if(processInstance.definition.diagramResource){
						var html = "<div><span>"+$translate.instant(otherwiseKey)+"</span></div>";
						html += "<img src='"+processInstance.definition.diagramResource.replace("/resources/", "/resourcedata/")+"'>";
						element.html(html);
					}else if(otherwiseKey !== ''){
						element.html("<span>"+$translate.instant(otherwiseKey)+"</span>");
					}
				}
			}
		});
	}};
})
.directive('agDefinitionDiagram', function($translate, $diagram) {
	return {link: function(scope, element, attrs) {
		var otherwiseKey = element.attr('otherwiseKey') || '';
		scope.$watch(attrs.agDefinitionDiagram, function (definition) {
			if(definition){
				if(definition.diagramResource){
					$diagram.renderDefinitionDiagram(element, definition);
				}else{
					if(otherwiseKey !== '')
						element.html("<span>"+$translate.instant(otherwiseKey)+"</span>");
				}
			}
		});
	}};
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
.run(function($process, $ui){
	$ui.registarModal('showStartNewProcess', function (onOK, onCancel){
		this.showModal('views/startProcess.html', 'StartProcessModalInstanceCtrl', {}, function (definition){
			$process.startProcess(definition, function(processInstance){
				if(processInstance){
					$ui.showNotification({type: 'success', translateKey: 'NOT_PROCESS_STARTED', translateValues :{id:processInstance.id, name: definition.name}});
				}
			});
		}, onCancel);
	});
});
})();