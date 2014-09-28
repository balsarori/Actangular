(function() {'use strict';

/* agForm */

function $form(FormData, $injector, formConfig){

	this.getFormData = function (param, success, fail){
		FormData.one().get(param).then(
				function(formData){
					if(success)
						success(formData);
				},
				function(response){
					if(fail)
						fail(response);
				}
		);
	};

	this.handleStartForm = function (processDefinitionId, options, noForm, success, fail){
		var param = {processDefinitionId: processDefinitionId};
		this.getFormData(param, function(formData){
			handleForm(formData, options, noForm, success, fail);
		}, fail);
	};

	this.handleTaskForm = function (taskId, options, noForm, success, fail){
		var param = {taskId: taskId};
		this.getFormData(param, function(formData){
			handleForm(formData, options, noForm, success, fail);
		}, fail);
	};

	this.submitStartForm = function (processDefinitionId, formProperties, success, failure) {
		submitFormData({processDefinitionId: processDefinitionId}, formProperties, success, failure);
	};
	this.submitTaskForm = function (taskId, formProperties, success, failure) {
		submitFormData({taskId: taskId}, formProperties, success, failure);
	};

	this.getFormViewProperties = function (formProperties){
		var formViewProperties = angular.copy(formProperties);
		for(var i=0;i<formViewProperties.length;i++){
			var formPropertyHandler = formConfig.formPropertyHandlers[formViewProperties[i].type] || formConfig.formPropertyHandlers['string'];
			if(formPropertyHandler){
				if(formPropertyHandler.viewId)
					formViewProperties[i].view = formPropertyHandler.viewId;
				if(formPropertyHandler.initFormProperty)
					$injector.invoke(formPropertyHandler.initFormProperty, formPropertyHandler, {formProperty: formViewProperties[i]});
			}
		}
		return formViewProperties;
	};

	function handleForm (formData, options, noForm, success, fail){
		var formHandler = formConfig.formHandlers[formData.formKey];

		if(formHandler)
			$injector.get(formHandler).handleForm(formData, options, noForm, success, fail);

	};

	function submitFormData (formData, formProperties, success, failure) {
		formData.properties = [];
		for(var i = 0; i<formProperties.length;i++){
			if(formProperties[i].writable === false) continue;
			var formPropertyHandler = formConfig.formPropertyHandlers[formProperties[i].type];
			if(formPropertyHandler){
				if(formPropertyHandler.prepareForSubmit)
					$injector.invoke(formPropertyHandler.prepareForSubmit, formPropertyHandler, {formProperty: formProperties[i]});
			}
			formData.properties.push({id: formProperties[i].id, value: formProperties[i].value});
		}
		FormData.post(formData).then(function(resource){
			if(success) success(resource);
		}, failure);
	};
};

angular.module('agForm', [])
.factory('FormData', function(Restangular) {
	return Restangular.withConfig(function(RestangularConfigurer) {
		RestangularConfigurer.setBaseUrl('service/form/');
	}).service('form-data');
})
.provider('$form', function $FormProvider() {

	var formConfig = {formHandlers: {}, formPropertyHandlers: {}};

	this.addFormPropertyHandler = function(formPropertyType, formPropertyHandler){
		formConfig.formPropertyHandlers[formPropertyType] = formPropertyHandler;
	};

	this.addFormHandler = function (formKey, formHandler){
		formConfig.formHandlers[formKey] = formHandler;
	};

	this.$get = ['FormData','$injector', function formFactory(FormData, $injector) {
		if(angular.isUndefined(formConfig.formHandlers[null])){
			formConfig.formHandlers[null] = 'DefaultFormHandler';
		}
		if(angular.isUndefined(formConfig.formPropertyHandlers['string'])){
			formConfig.formPropertyHandlers['string'] = {viewId: 'views/form/string.html'};
		}
		return new $form(FormData, $injector, formConfig);
	}];
})
.factory('DefaultFormHandler', function ($ui, $form){
	return {
		handleForm : function(formData, options, noForm, success, fail){
			if(formData.formProperties.length > 0){
				var formProperties = $form.getFormViewProperties(formData.formProperties);
				$ui.showModal('views/form/form.html', 'FormPropertiesController', 
						{formInfo: function () {return {formProperties: formProperties, options: options};}}, function(formProperties){
							if(formData.taskId !== null)
								$form.submitTaskForm(formData.taskId, formProperties, success, fail);
							else if(formData.processDefinitionId !== null)
								$form.submitStartForm(formData.processDefinitionId, formProperties, success, fail);
						});
			}else{
				if(noForm) noForm();
			}
		}
	};
})
.controller('FormPropertiesController', function ($scope, $modalInstance, formInfo) {
	$scope.readOnly = formInfo.options.isReadOnly || false;
	$scope.title = formInfo.options.title || '_FORM';

	$scope.formProperties = formInfo.formProperties;
	$scope.showErrors = false;

	$scope.submitForm = function(isValid) {
		// check to make sure the form is completely valid
		if (isValid) {
			$modalInstance.close($scope.formProperties);
		}else{
			$scope.showErrors = true;
		}
	};

	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};

})
.directive('agName', function($compile) {
//	http://stackoverflow.com/questions/14378401/dynamic-validation-and-name-in-a-form-with-angularjs
	return{
		restrict: 'A',
		terminal: true,
		priority: 100000,
		link: function(scope, element, attrs) {
			var name = scope.$eval(attrs.agName);
			element.removeAttr('ag-name');
			element.attr('name', name);
			$compile(element)(scope);
		}};
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