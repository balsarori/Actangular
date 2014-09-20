(function() {'use strict';

/* agForm */

function $form(FormData, $injector, formConfig){

	this.getForm = function (param, success, fail){
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

	this.handleStartForm = function (processDefinitionId, options, noForm, onSuccess, onError){
		var param = {processDefinitionId: processDefinitionId};
		this.getForm(param, function(formData){
			handleForm(formData, options, noForm, onSuccess, onError);
		}, onError);
	};

	this.handleTaskForm = function (taskId, options, noForm, onSuccess, onError){
		var param = {taskId: taskId};
		this.getForm(param, function(formData){
			handleForm(formData, options, noForm, onSuccess, onError);
		}, onError);
	};

	this.submitStartFormData = function (processDefinitionId, formProperties, success, failure) {
		submitFormData({processDefinitionId: processDefinitionId}, formProperties, success, failure);
	};
	this.submitTaskFormData = function (taskId, formProperties, success, failure) {
		submitFormData({taskId: taskId}, formProperties, success, failure);
	};

	this.getFormProperties = function (formProperties){
		var formViewProperties = angular.copy(formProperties);
		for(var i=0;i<formViewProperties.length;i++){
			var formPropertyHandler = formConfig.formPropertyHandlers[formViewProperties[i].type];
			if(formPropertyHandler){
				if(formPropertyHandler.viewId)
					formViewProperties[i].view = formPropertyHandler.viewId;
				if(formPropertyHandler.initFormProperty)
					$injector.invoke(formPropertyHandler.initFormProperty, formPropertyHandler, {formProperty: formViewProperties[i]});
			}else{
				formViewProperties[i].view = 'views/form/string.html';
			}
		}
		return formViewProperties;
	};

	function handleForm (formData, options, noForm, onSuccess, onError){
		var formHandler = formConfig.formHandlers[formData.formKey];

		if(formHandler)
			$injector.get(formHandler).handleForm(formData, options, noForm, onSuccess, onError);

	};

	function submitFormData (formData, formProperties, success, failure) {
		formData.properties = [];
		for(var i = 0; i<formProperties.length;i++){
			var formPropertyHandler = formConfig.formPropertyHandlers[formProperties[i].type];
			if(formPropertyHandler){
				if(formPropertyHandler.prepareForSubmit)
					$injector.invoke(formPropertyHandler.prepareForSubmit, formPropertyHandler, {formProperty: formProperties[i]});
			}else{
				formProperties[i].value = formProperties[i].value+'';
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

	this.addFormPropertyHandler = function(formPropertyId, formPropertyHandler){
		formConfig.formPropertyHandlers[formPropertyId] = formPropertyHandler;
	};

	this.addFormHandler = function (formKey, formHandler){
		formConfig.formHandlers[formKey] = formHandler;
	};

	this.$get = ['FormData','$injector', function formFactory(FormData, $injector) {
		return new $form(FormData, $injector, formConfig);
	}];
})
.config(['$formProvider', function($formProvider) {
	$formProvider.addFormHandler(null, 'DefaultFormHandler');

	$formProvider.addFormPropertyHandler('string', {
		viewId: 'views/form/string.html'
	});
	$formProvider.addFormPropertyHandler('date', {
		viewId: 'views/form/date.html',
		initFormProperty: function(formProperty){
			/*if (formProperty.value !== null){ 
				var datePattern = formProperty.datePattern;
				datePattern = datePattern.replace("yy", "YY").replace("yy", "YY").replace("dd", "DD");
				var momentDate = moment(formProperty.value, datePattern);
				if(momentDate.isValid())
					formProperty.value = momentDate.toDate();
			}*/

			if (formProperty.value !== null){ 
				formProperty.value = new Date(formProperty.value);
			}
		},
		prepareForSubmit: function($filter, formProperty){
			formProperty.value = $filter('date')(formProperty.value, formProperty.datePattern);
		}
	});

	$formProvider.addFormPropertyHandler('long', {
		viewId: 'views/form/long.html',
		initFormProperty: function(formProperty){
			if (formProperty.value !== null){ 
				formProperty.value = parseInt(formProperty.value);
			}
		}
	});

	$formProvider.addFormPropertyHandler('boolean', {
		viewId: 'views/form/boolean.html'
	});

	$formProvider.addFormPropertyHandler('enum', {
		viewId: 'views/form/enum.html'
	});

}])
.service('DefaultFormHandler', function ($ui, $form){
	this.handleForm = function(formData, options, noForm, onSuccess, onError){
		if(formData.formProperties.length > 0){
			var formProperties = $form.getFormProperties(formData.formProperties);
			$ui.showModal('views/form/form.html', 'FormPropertiesCtrl', 
					{formInfo: function () {return {formProperties: formProperties, options: options};}}, function(formProperties){
						if(formData.taskId !== null)
							$form.submitTaskFormData(formData.taskId, formProperties, onSuccess, onError);
						else if(formData.processDefinitionId !== null)
							$form.submitStartFormData(formData.processDefinitionId, formProperties, onSuccess, onError);
					});
		}else{
			if(noForm) noForm();
		}
	};
})
.controller('FormPropertiesCtrl', function ($scope, $modalInstance, formInfo) {
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
	$ui.registarModal('showStartForm', function(processDefinition, options, onNoForm, onSuccess, onError){
		$form.handleStartForm(processDefinition.id, options, onNoForm, onSuccess, onError);
	});
	$ui.registarModal('showTaskForm', function(task, options, onNoForm, onSuccess, onError){
		$form.handleTaskForm(task.id, options, onNoForm, onSuccess, onError);
	});

});
})();