(function() {'use strict';

/* agTask */

angular.module('agTask', [])
.factory('$taskCache', ['$cacheFactory', function($cacheFactory) {
	return $cacheFactory('task-cache');
}])
.factory('$historicTaskCache', ['$cacheFactory', function($cacheFactory) {
	return $cacheFactory('historic-task-cache');
}])
.factory('Tasks', function(RuntimeRestangular, $taskCache, Task) {
	return RuntimeRestangular.withConfig(function(RestangularConfigurer) {
		RestangularConfigurer.extendModel('tasks', function(task) {
			var cachedTask = $taskCache.get(task.id);
			if(cachedTask){
				angular.extend(cachedTask, task);
				//cachedTask.update(task);
				return cachedTask;
			}

			$taskCache.put(task.id, task);

			return angular.extend(task, Task);
		});
	}).service('tasks');
})
.factory('HistoryTasks', function(HistoryRestangular, $historicTaskCache, HistoricTask) {
	//return HistoryRestangular.service('historic-task-instances');
	return HistoryRestangular.withConfig(function(RestangularConfigurer) {
			RestangularConfigurer.extendModel('historic-task-instances', function(historicTask) {
				var cachedHistoricTask = $historicTaskCache.get(historicTask.id);
				if(cachedHistoricTask){
					angular.extend(cachedHistoricTask, historicTask);
					//cachedTask.update(task);
					return cachedHistoricTask;
				}

				$historicTaskCache.put(historicTask.id, historicTask);

			    return angular.extend(historicTask, HistoricTask);
			  });
		}).service('historic-task-instances');
})
.factory('TaskPage', function($ui){
	function completeTask (task, data, success, fail) {
		task.complete(data, success, fail);
	};
	function showTaskNotification(task, type, key){
		$ui.showNotification({type: type, translateKey: key, translateValues :{taskId: task.id, name: task.name}});
	}
	function removeTask (page, taskId) {
		page.back(true);
		page.cache.remove(taskId);
	};
	return {
		editTask : function (task) {
			$ui.showEditTask(task,
					function (taskUpdate){
				task.update(taskUpdate);
			});
		},

		deleteTask : function (task) {
			var me = this;
			$ui.showConfirmation('CONFIRM_DELETE_TASK', {id:task.id, name:task.name}, function(){
				task.remove().then(
						function(){
							/*me.back(true);
							me.cache.remove(task.id);*/
							removeTask (me, task.id);
							showTaskNotification(task, 'info', 'NOT_TASK_DELETE_OK');
						},
						function (response){
							//TODO handle error response
							me.back(true);
							showTaskNotification(task, 'danger', 'NOT_TASK_DELETE_FAIL');
						}
				);
			}
			);

		},
		postComment : function (task) {
			$ui.showPostComment(task);
		},

		complete : function (task) {
			var me = this;
			if(task.taskDefinitionKey){
				$ui.showTaskForm(task,{}, function(){
					completeTask(task, undefined, function(result){
						removeTask (me, task.id);
						showTaskNotification(task, 'info', 'NOT_TASK_COMPLETE_OK');
					});
				}, function(result){
					removeTask (me, task.id);
					showTaskNotification(task, 'info', 'NOT_TASK_COMPLETE_OK');
				});
			}else{
				completeTask(task, undefined, function(){
					removeTask (me, task.id);
					showTaskNotification(task, 'info', 'NOT_TASK_COMPLETE_OK');
				});
				
			}
		},

		claim : function (task) {
			var me = this;
			task.claim(
					function (){
						me.back(true);
						showTaskNotification(task, 'info', 'NOT_TASK_CLAIM_OK');
					},
					function (response){
						me.back(true);
						showTaskNotification(task, 'danger', 'NOT_TASK_CLAIM_OK');
					}
			);
		},
		showAddVar : function(task){
			$ui.showAddVar(task);
		},

		showEditVar : function(task, variable){
			$ui.showEditVar(task, variable);
		}

	};

})
.config(['$routeProvider',
         function($routeProvider) {
	$routeProvider.
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
	});
}])
.service('$taskService', function(Tasks, $session){
	this.createTask = function(task){
		task.owner = $session.getUserId();
		return Tasks.post(task);
	};
	this.createSubTask = function(parentTask, subtask, success, failed){
		subtask.owner = $session.getUserId();
		return parentTask.createSubTask(subtask, success, failed);
	};
})
.service('$taskPage', function($session, PageList, Tasks, $taskCache, TaskPage, $historicTaskCache, HistoryTasks){
	var inboxPage = createTaskListPage('inbox', 'assignee'), myTasksPage = createTaskListPage('mytasks', 'owner'),
	involvedPage = createTaskListPage('involved', 'involvedUser'), queuedPage = createTaskListPage('queued', 'candidateUser'),
	archivedPage = createHistoricTaskListPage('archived', 'taskInvolvedUser');

	function createTaskListPage(section, param){
		var listPage = {
				template: 'views/listPage.html',
				listControlsTemplate: 'task/listControls.html',
				listTemplate: 'task/list.html',
				itemControlsTemplate: 'task/itemControls.html',
				itemTemplate: 'task/item.html',
				section: section,
				itemName: 'task',
				sortKeys: {id: 'id', priority: 'priority', dueDate: 'dueDate', createTime: 'createTime'},
				requestParam : {start:0, order: 'desc', sort: 'id'},
				listSize : 10,
				queryResource: Tasks,
				cache: $taskCache
		};
		listPage.requestParam[param] = $session.getUserId();
		listPage = angular.extend(listPage,PageList);
		/*listPage.queryOne = function(taskId, success, fail){
			var requestParams = angular.extend({taskId: taskId}, this.requestParams);
			return this.queryList(requestParams,function(tasks){
				if(tasks.length===0){
					fail();
				}else{
					success(tasks[0]);
				}
			},fail);
		};*/
		return angular.extend(listPage,TaskPage);

	};
	
	function createHistoricTaskListPage(section, param){
		var listPage = {
				template: 'views/listPage.html',
				listControlsTemplate: 'hisroticTask/listControls.html',
				listTemplate: 'hisroticTask/list.html',
				itemControlsTemplate: 'hisroticTask/itemControls.html',
				itemTemplate: 'hisroticTask/item.html',
				section: section,
				itemName: 'task',
				sortKeys: {taskInstanceId: 'id', priority: 'priority', dueDate: 'dueDate', startTime: 'startTime', endTime: 'endTime'},
				//sortKey: 'id',
				requestParam : {start:0, order: 'desc', sort: 'taskInstanceId', finished: true, includeTaskLocalVariables: true},
				listSize : 10,
				queryResource: HistoryTasks,
				cache: $historicTaskCache
		};
		listPage.requestParam[param] = $session.getUserId();
		listPage = angular.extend(listPage,PageList);
		listPage.queryOne = function(taskId, success, fail){
		var requestParams = angular.extend({taskId: taskId}, this.requestParam);
		return this.queryList(requestParams,function(tasks){
			if(tasks.length===0){
				fail();
			}else{
				success(tasks[0]);
			}
		},fail);
		};
		return listPage;//angular.extend(listPage,TaskPage);

	};

	this.getInboxPage = function(taskId){
		return inboxPage.show(taskId);
	};

	this.getMyTasksPage = function(taskId){
		return myTasksPage.show(taskId);
	};

	this.getInvolvedPage = function(taskId){
		return involvedPage.show(taskId);
	};

	this.getQueuedPage = function(taskId){
		return queuedPage.show(taskId);
	};
	
	this.getArchivedPage = function(taskId){
		return archivedPage.show(taskId);
	};

})
.controller('CreateEditTaskModalInstanceCtrl', function ($scope, $modalInstance, options) {
	var task = {};
	if(options.op === 'NEW'){
		task.priority = 50;
		if(options.parentTask){
			task.parentTaskId = options.parentTask.id;
			$scope.title = 'NEW_SUB_TASK';
		}else{
			$scope.title = 'NEW_TASK';
		}
	}else{
		task.name = options.task.name;
		task.description = options.task.description;
		task.priority = options.task.priority;
		task.dueDate = options.task.dueDate;
		task.category = options.task.category;
		$scope.title = 'EDIT_TASK';
	}

	$scope.showErrors = false;
	$scope.task = task;

	$scope.submitForm = function(isValid,assignee) {
		// check to make sure the form is completely valid
		if (isValid) {
			$modalInstance.close($scope.task);
		}else{
			$scope.showErrors = true;
		}
	};

	$scope.cancel = function ($event) {
		$modalInstance.dismiss('cancel');
	};

})
.controller('TaskAttachmentController', function($scope, $upload, $modalInstance, options) {
	$scope.attachmentType = 'URL';
	$scope.title = options.title;
	$scope.showErrors = false;
	$scope.data = {externalUrl:'',name: '', description: ''};
	$scope.submitForm = function(attachmentType, isValid) {
		// check to make sure the form is completely valid
		if (!isValid) {$scope.showErrors = true; return;}

		if(attachmentType === 'File'){
			if($scope.selectedFile){
				$scope.data.type = $scope.selectedFile.type; // set content type
				$scope.uploadFile($scope.selectedFile, $scope.data);
				$scope.uploadProgress = 0;
				$scope.uploading = true;
			}else{
				$scope.showErrors = true; return;
			}
		}else if(attachmentType === 'URL'){
			options.task.post('attachments', $scope.data);
			$modalInstance.close();
		}
	};

	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};

	$scope.onFileSelect = function($file) {
		$scope.selectedFile = $file[0];
		$scope.data.name = $file[0].name;
	};
	$scope.uploadFile = function(file, data) {
		$scope.upload = $upload.upload({
			url: options.url,
			data: data,
			file: file
		}).progress(function(evt) {
			$scope.uploadProgress = parseInt(100.0 * evt.loaded / evt.total);
		}).success(function(data, status, headers, config) {
			$modalInstance.close();
		});
	};
})
.run(function($taskService, $session, $ui){
	$ui.registarModal('showCreateTask', function (onOK, onCancel){
		this.showModal('views/createTask.html', 'CreateEditTaskModalInstanceCtrl', {options: function(){return {op:'NEW'};}}, function (task){
			$taskService.createTask(task).then(
					function(newTask){
						$ui.showNotification({type: 'info', translateKey: 'NOT_TASK_CREATE_OK', translateValues :{taskId: newTask.id, name: newTask.name}});
					},
					function(){
						$ui.showNotification({type: 'danger', translateKey: 'NOT_TASK_CREATE_FAIL'});
					});

		}, onCancel);
	});
	$ui.registarModal('showEditTask', function (task, onOK, onCancel){
		this.showModal('views/createTask.html', 'CreateEditTaskModalInstanceCtrl', {options: function(){return {task: task, op:'EDIT'};}}, function (update){
			task.update(update);
		}, onCancel);
	});

	$ui.registarModal('showCreateSubTask', function (parentTask, onOK, onCancel){
		this.showModal('views/createTask.html', 'CreateEditTaskModalInstanceCtrl', {options: function(){return {op:'NEW', parentTask: parentTask};}}, function (task){
			$taskService.createSubTask(parentTask,task,
					function(newTask){
				$ui.showNotification({type: 'info', translateKey: 'NOT_TASK_CREATE_OK', translateValues :{taskId: newTask.id, name: newTask.name}});
			},
			function(){
				$ui.showNotification({type: 'danger', translateKey: 'NOT_TASK_CREATE_FAIL'});
			});

		}, onCancel);
	});

	$ui.registarModal('showAddTaskAttachment', function (task, onOK, onCancel){
		this.showModal('views/task/addAttachment.html', 'TaskAttachmentController', {options: function () {
			return {url:task.url+'/attachments', task:task, title: '_ADD_ATTACHMENT'};
		}}, onOK, onCancel);
	});
})
.controller('TaskTabsCtrl', function($scope, $ui) {

	$scope.deleteIdentityLink = function (task, identityLink){
		var canDelete = (task.owner || task.assignee || task.identityLinks.length > 1);

		if(canDelete === false){
			// Task should have at least have one identitylink
			$ui.showNotification({type: 'warning', translateKey: 'TASK_MIN_INVOLVEMENT'});
			return;
		}

		$ui.showConfirmation((identityLink.user)? 'CONFIRM_DeleteUserLink' : 'CONFIRM_DeleteGroupLink', identityLink, function(){
			task.deleteIdentityLink(identityLink);
		}
		);
	};
	$scope.editIdentityLink = function (task, type){
		var options = {title: 'EDIT_TASK_ROLE_'+type, identityType: 'user'};
		$ui.showSelectIdentity({
			options: function () {
				return options;
			}
		},
		function (identityLink){
			identityLink.type = type;
			task.addIdentityLink(identityLink);
		});

	};

	$scope.addIdentityLink = function (task) {
		$ui.showAddIdentityLink(undefined, ['involved', 'candidate'], 'INVOLVE_TO_TASK', function(identityLink){
			task.addIdentityLink(identityLink);
		});
	};

	$scope.attach = function (task) {

		$ui.showAddTaskAttachment(task,
				function (result){
			task.refreshAttachments();
			task.refreshEvents();
		});
	};

	$scope.deleteAttachment = function (task, attachment){
		$ui.showConfirmation('CONFIRM_DeleteAttachment', {name:attachment.name}, function(){
			attachment.remove();
			task.refreshAttachments();
			task.refreshEvents();
		});
	};
	$scope.newSubTask = function (task) {
		$ui.showCreateSubTask(task);
	};
})
.factory('Task', function ($session){
	return {
		refresh : function (options, success){
			var me = this;
			this.get().then(
					function(task){
						angular.extend(me, task);
						me.refreshVariables();

						if(me.identityLinks)
							me.refreshIdentityLinks();

						if(me.attachments)
							me.refreshAttachments();

						if(me.subTasks)
							me.refreshSubTasks();

						if(me.events)
							me.refreshEvents();
					}
			);
		},
		refreshIdentityLinks : function (options, success, failed){
			var me = this;
			this.getList("identitylinks").then(
					function (identityLinks){
						var filteredIdentityLinks = [], owner = null, assignee = null, isCandidate=false, isInvolved=false;
						var user = $session.getUser();
						for(var i=0, l=identityLinks.length;i<l;i++){
							if(identityLinks[i].user){
								if(identityLinks[i].type === 'owner')
									owner = identityLinks[i].user;
								else if(identityLinks[i].type === 'assignee')
									assignee = identityLinks[i].user;
								else{
									filteredIdentityLinks.push(identityLinks[i]);
									if(user.id === identityLinks[i].user){
										if(identityLinks[i].type==='candidate') isCandidate=true;
										else isInvolved=true;
									}

								}
							}else{
								filteredIdentityLinks.push(identityLinks[i]);
								if(user.groups[identityLinks[i].group] &&
										identityLinks[i].type==='candidate') isCandidate=true;
							}
						}
						me.owner = owner;
						me.assignee = assignee;
						if(me.assignee){ 
							if(user.id === me.assignee) me.isAssignee = true;
							else me.isAssignee = false;
						}else me.isAssignee = false;

						if(me.owner) {
							if(user.id === me.owner) me.isOwner = true;
							else me.isOwner = false;
						}else me.isOwner = false;

						me.isCandidate = isCandidate;
						me.isInvolved = isInvolved;

						me.identityLinks = filteredIdentityLinks;
						if(success)success();
					},
					function (response){
						if(failed)failed(response);
					}
			);
		},
		refreshAttachments : function (options, success, failed){
			var me = this;
			this.getList("attachments").then(function (attachments){
				me.attachments = attachments;
			});
		},		
		refreshEvents : function (options, success, failed){
			var me = this;
			this.getList("events").then(function (events){
				me.events = events;
			});
		},
		refreshSubTasks : function (options, success, failed){
			var me = this;
			this.getList('subtasks').then(
					function (subTasks){
						me.subTasks = subTasks;
					}
			);
		},
		update : function (update){
			var taskUpdate = {};
			var updated = false;
			for(var key in update){
				if(this[key] !== update[key]){
					taskUpdate[key] = update[key];
					updated = true;
				}
			}
			if(updated === false) return;

			var me = this;
			this.customPUT(taskUpdate).then(
					function(updatedTask){
						angular.extend(me, updatedTask);
					});
		},
		refreshVariables : function (options, success, failed){
			var me = this;
			this.getList("variables",{scope:'local'}).then(function (variables){
				me.variables = variables;
			});
		},

		addVariable : function (variable, success, failed){
			var me = this;
			variable.scope = 'local';
			var variableArr = [variable];
			this.customPOST(variableArr, "variables").then(function (variables){
				me.refreshVariables();
			});
		},

		editVariable : function (variable, variableUpdate, success, failed){
			var me = this;
			variable.scope = 'local';
			variable.customPUT(variableUpdate,variable.name).then(function (updatedVariable){
				me.refreshVariables();
			});
		},

		deleteVariable : function (variable, success, failed){
			var me = this;
			variable.customDELETE(variable.name).then(function (){
				me.refreshVariables();
			});
		},

		addIdentityLink : function (identityLink, success, failed){
			var me = this;
			this.post("identitylinks", identityLink, "identitylinks").then(function (){
				me.refreshIdentityLinks();
				if(me.events)
					me.refreshEvents();
			});
		},

		deleteIdentityLink : function (identityLink, success, failed){
			var me = this;
			var link = (identityLink.group)? 'groups/'+identityLink.group : 'users/'+identityLink.user;
			this.customDELETE('identitylinks/'+link+'/'+identityLink.type).then(function (){
				me.refreshIdentityLinks();
				if(me.events)
					me.refreshEvents();
			});
		},

		addComment : function (comment, success, failed){
			var me = this;
			this.post('comments', {message: comment}).then(
					function (){
						me.refreshEvents();
					}
			);
		},
		createSubTask : function (subTask, success, failed){
			var me = this;
			this.customPOST(subTask, '../../tasks').then(
					function (newSubtask){
						me.refreshSubTasks();
						if(success) success(newSubtask);
					}, failed
			);
		},
		claim : function (success, failed){
			var me = this;
			this.customPOST({action:'claim', assignee:$session.getUserId()}).then(function(){
				if(success) success();
				me.refreshIdentityLinks();
			}, failed);
		},
		complete: function(data, success, failed){
			var params = {action:'complete'};
			if(data){
				data.action = 'complete';
				params = data;
			}
			this.customPOST(params).then(success, failed);
		}
	};
})
.factory('HistoricTask', function (){
	return {
		refresh : function (options, success){
			var me = this;
			this.get().then(
					function(task){
						angular.extend(me, task);
						//me.refreshVariables();

						if(me.identityLinks)
							me.refreshIdentityLinks();

						if(me.attachments)
							me.refreshAttachments();

						if(me.subTasks)
							me.refreshSubTasks();

						if(me.events)
							me.refreshEvents();
					}
			);
		},
		refreshIdentityLinks : function (options, success, failed){
			var me = this;
			this.getList("identitylinks").then(
					function (identityLinks){
						var filteredIdentityLinks = [];
						for(var i=0, l=identityLinks.length;i<l;i++){
							if(identityLinks[i].type !== 'owner' && identityLinks[i].type !== 'assignee')
								filteredIdentityLinks.push(identityLinks[i]);
						}

						me.identityLinks = filteredIdentityLinks;
						if(success)success();
					},
					function (response){
						if(failed)failed(response);
					}
			);
		},
		refreshAttachments : function (options, success, failed){
			var me = this;
			this.getList("../../../runtime/tasks/"+this.id+"/attachments").then(function (attachments){
				me.attachments = attachments;
			});
		},		
		refreshEvents : function (options, success, failed){
			var me = this;
			this.getList("../../../runtime/tasks/"+this.id+"/events").then(function (events){
				me.events = events;
			});
		},
		refreshSubTasks : function (options, success, failed){
			var me = this;
			this.getList("../../historic-task-instances",{parentTaskId: this.id}).then(
					function (subTasks){
						me.subTasks = subTasks;
					}
			);
		}/*,
		refreshVariables : function (options, success, failed){
			if(this.taskVariables) return;
			var me = this;
			this.getList("..",{taskId: this.id, includeTaskLocalVariables: true}).then(function (data){
				me.taskVariables = data[0].variables;
				//me.taskVariables = variables;
			});
		}*/
	};
})
.filter('taskPriority', function() {
	return function(input) {
		input = input || 0;
		if(input < 50)
			return "LOW_PRIORITY";
		if(input > 50)
			return "HIGH_PRIORITY";
		return "NORMAL_PRIORITY";
	};
});

})();