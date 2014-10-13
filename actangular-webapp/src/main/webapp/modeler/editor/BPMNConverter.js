/*
 Copyright 2014 Bassam Al-Sarori

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

'use strict';

var BPMNConverter = BPMNConverter || {VERSION: '0.1'};

BPMNConverter.JsonToBPM = function (config) {
	var stencilHandlers = {};
	this.config = config || BPMNConverter.config;
	var defaultHandler = new BPMNConverter.JsonToBPMBase(this);
	
	function setStencilId(stencil, conversionInfo, config){
		if(stencil.properties.overrideid){
			conversionInfo.overrideids[stencil.resourceId] = stencil.properties.overrideid;
		}else{
		var idPrefix = stencil.stencil.id;
		if(config.stencilHandlers[idPrefix] && config.stencilHandlers[idPrefix].elementName)
			idPrefix = config.stencilHandlers[idPrefix].elementName;
			
		if(!conversionInfo.idCount[idPrefix])
			conversionInfo.idCount[idPrefix] = 0;

		conversionInfo.idCount[idPrefix] = conversionInfo.idCount[idPrefix] + 1;
		conversionInfo.overrideids[stencil.resourceId] = idPrefix + conversionInfo.idCount[idPrefix];
		}
	}
	function mapStencils(childShapes, conversionInfo, config){
		for(var i=0;i<childShapes.length;i++){
			setStencilId(childShapes[i], conversionInfo, config);
			if(childShapes[i].stencil.id === "SequenceFlow"){
				// TODO add validation to other stencils as well
				if(childShapes[i].target === undefined) 
					throw "SequenceFlow '"+childShapes[i].resourceId+"' has no target";
				
				conversionInfo.flows[childShapes[i].resourceId] = childShapes[i];
				continue;
			}

			if(!conversionInfo.stencilTypes[childShapes[i].stencil.id]){
				conversionInfo.stencilTypes[childShapes[i].stencil.id] = [];
			}
			conversionInfo.stencilTypes[childShapes[i].stencil.id].push(childShapes[i]);
			conversionInfo.stencils[childShapes[i].resourceId] = childShapes[i];
			if(childShapes[i].outgoing && childShapes[i].outgoing.length > 0){
				for(var j=0;j<childShapes[i].outgoing.length;j++){
					if (conversionInfo.srcs[childShapes[i].outgoing[j].resourceId])
						conversionInfo.srcs[childShapes[i].outgoing[j].resourceId].push(childShapes[i].resourceId);
					else
						conversionInfo.srcs[childShapes[i].outgoing[j].resourceId] = [childShapes[i].resourceId];
				}
			}
			if(childShapes[i].childShapes && childShapes[i].childShapes.length > 0)
				mapStencils(childShapes[i].childShapes, conversionInfo, config);
		}
	}

	this.handleStencil = function (stencil, jsonProcess, process, conversionInfo){
		var stencilHandler = stencilHandlers[stencil.stencil.id];
		if(stencilHandler === undefined){
			if(this.config.stencilHandlers[stencil.stencil.id]){
				stencilHandlers[stencil.stencil.id] = new BPMNConverter.JsonToBPMBase(this, this.config.stencilHandlers[stencil.stencil.id]);
				stencilHandler = stencilHandlers[stencil.stencil.id];
			}else{
				console.log('No handler for '+stencil.stencil.id);
				stencilHandler = defaultHandler;
			}
		}
		if(stencilHandler){
			stencilHandler.convertDiagram(stencil, jsonProcess, conversionInfo);
			stencilHandler.convertToBpmn(stencil, process, conversionInfo);
		}
	};

	this.handleChildStencils = function (jsonModel, process, conversionInfo){
		for(var i=0;i<jsonModel.childShapes.length;i++){
			if(jsonModel.childShapes[i].stencil.id === 'SequenceFlow'){
				continue;
			}
			this.handleStencil(jsonModel.childShapes[i], jsonModel, process, conversionInfo);
			this.convertOutgoingFlowStencilsToBpmn(jsonModel.childShapes[i],jsonModel, process, conversionInfo);
		}
	};

	 this.convertOutgoingFlowStencilsToBpmn = function ( stencil, jsonProcess, process, conversionInfo) {
		for(var i=0;i<stencil.outgoing.length;i++){
			var flow = conversionInfo.flows[stencil.outgoing[i].resourceId];
			if(flow){
				this.handleStencil(flow,jsonProcess, process, conversionInfo);
			}
		}
	};

	this.convertToBpmn = function (jsonModel){
		var conversionInfo = {stencils:{},stencilTypes:{}, srcs:{},flows:{},bounds:{}, outerElements:{}, overrideids:{}, idCount:{}};
		mapStencils(jsonModel.childShapes, conversionInfo, this.config);

		var stencilHandler = new BPMNConverter.JsonToBPMBase(this, this.config.stencilHandlers[jsonModel.stencil.id]);
		var bpmnDoc = stencilHandler.convertToBpmn(jsonModel, this.config.namespaces, conversionInfo);
		bpmnDoc.conversionInfo = conversionInfo;
		return bpmnDoc;
	};
	
};

BPMNConverter.JsonToBPMBase = function (converter, extendConf) {this.init(converter, extendConf);};
BPMNConverter.JsonToBPMBase.prototype = {
	init : function(converter, extendConf){
			this.converter = converter;
			this.extendedHandlers = [];
			extendConf = extendConf || {};
			this.mainHandler = BPMNConverter.handlers[extendConf.mainHandler] || this.mainHandler;
			this.diagramType = extendConf.diagramType || 'shape';
			this.elementName = extendConf.elementName;
			for (var property in  BPMNConverter.helpers) {
				this[property] = BPMNConverter.helpers[property];
			}
			if(extendConf.extendedHandlers)
			for (var i = 0; i < extendConf.extendedHandlers.length; i++ ) {
				this.extendedHandlers.push(extendConf.extendedHandlers[i]);
				this[extendConf.extendedHandlers[i]] = BPMNConverter.handlers[extendConf.extendedHandlers[i]];
			}
	},
	booleanValueConverter : function (value){
		if(typeof value === 'boolean') return value;
		//if(typeof value === 'string')
		return "YES" === value.toUpperCase();
	},
	convertDiagram : function ( stencil, process, conversionInfo) {
		if(this.diagramType === 'edge')
			this.convertDiagramEdge( stencil, process, conversionInfo);
		else
			this.convertDiagramShape( stencil, process, conversionInfo);
	},
	convertDiagramShape : function ( stencil, process, conversionInfo) {
		var bpmnShapeId = conversionInfo.overrideids[stencil.resourceId];
		var x = stencil.bounds.upperLeft.x;
		var y = stencil.bounds.upperLeft.y;
		
		if(conversionInfo.bounds[conversionInfo.overrideids[process.resourceId]]){
			x += conversionInfo.bounds[conversionInfo.overrideids[process.resourceId]].x;
			y += conversionInfo.bounds[conversionInfo.overrideids[process.resourceId]].y;
		}
		var bpmnShape = this.createDiagramShapeElement(bpmnShapeId,x,y,
							(stencil.bounds.lowerRight.x - stencil.bounds.upperLeft.x), (stencil.bounds.lowerRight.y - stencil.bounds.upperLeft.y) );
		conversionInfo.bpmnPlane.appendElement(bpmnShape);
		//save for later
		conversionInfo.bounds[bpmnShapeId] = {x: x, y: y};
		
	},
	convertDiagramEdge : function ( stencil, process, conversionInfo) {
		var bpmnEdgeId = conversionInfo.overrideids[stencil.resourceId];
		var bpmnEdge = this.createDiagramEdgeElement(bpmnEdgeId);

		this.createDiagramWayPointElement(bpmnEdge, stencil.bounds.upperLeft.x, stencil.bounds.upperLeft.y);

		if(stencil.dockers.length > 2){
			for(var i = 1; i < stencil.dockers.length -1 ; i++)
				this.createDiagramWayPointElement(bpmnEdge, stencil.dockers[i].x, stencil.dockers[i].y);
		}
		this.createDiagramWayPointElement(bpmnEdge, stencil.bounds.lowerRight.x, stencil.bounds.lowerRight.y);

		conversionInfo.bpmnPlane.appendElement(bpmnEdge);
	},
	convertToBpmn : function (stencil, process, conversionInfo){
		return this.mainHandler(stencil, process, conversionInfo);
	},
	invokeExtendedHandlers : function (stencil, bpmnElement, conversionInfo){
		for (var i = 0; i < this.extendedHandlers.length; i++ ) {
			this[this.extendedHandlers[i]](stencil, bpmnElement, conversionInfo);
		}
	},
	createDiagramShapeElement: function(bpmnShapeId, x,y,w,h){
		var shapeElement = new BPMNElement('BPMNShape', 'bpmndi');
		shapeElement.writeAttributes({id: "BPMNShape_"+bpmnShapeId, bpmnElement:bpmnShapeId});
		var boundsElement = new BPMNElement('Bounds', 'omgdc');
		boundsElement.writeAttributes({x: x, y:y, width: w, height:h});
		shapeElement.appendElement(boundsElement);
		return shapeElement;
	},
	createDiagramEdgeElement: function(bpmnEdgeId){
		var edgeElement = new BPMNElement('BPMNEdge', 'bpmndi');
		edgeElement.writeAttributes({id: "BPMNEdge_"+bpmnEdgeId, bpmnElement:bpmnEdgeId});
		return edgeElement;
	},
	createDiagramWayPointElement: function(edgeElement, x, y){
		var wayElement = new BPMNElement('waypoint', 'omgdi');
		wayElement.writeAttributes({x : x, y : y});
		edgeElement.appendElement(wayElement);
		return edgeElement;
	},
	createBpmnElement: function(stencil, conversionInfo){
		var bpmnElement = new BPMNElement(this.elementName);
		bpmnElement.writeAttributes({'id': conversionInfo.overrideids[stencil.resourceId], name: stencil.properties.name});
		
		if(stencil.properties.documentation){
			bpmnElement.documentation(stencil.properties.documentation);
		}
		return bpmnElement;
	},
	createProcessElement: function(stencil, conversionInfo){
		var processElement = new BPMNElement('process');
		processElement.writeAttributes({'id': stencil.properties.process_id, name: stencil.properties.name});
		if(stencil.properties.process_executable)
			processElement.writeBooleanAttribute('isExecutable', stencil.properties.process_executable);
		
		if(stencil.properties.documentation){
			processElement.elementText('documentation', stencil.properties.documentation);
		}
		return processElement;
	},
	parseJSON: function (data){
			if(data && typeof data === 'string' && data.length > 0 && data.trim().substr(0,1) === '{')
				return window.JSON.parse( data.trim() );
		return data;		
	},
	mainHandler : function (stencil, parentElement, conversionInfo){
		var bpmnElement = this.createBpmnElement(stencil, conversionInfo);
		this.converter.handleChildStencils(stencil, bpmnElement, conversionInfo);
		parentElement.appendElement(bpmnElement);
		this.invokeExtendedHandlers(stencil, bpmnElement, conversionInfo);
		return bpmnElement;
	}
};

BPMNConverter.handlers = {
	sequenceflow: function (stencil, bpmnElement, conversionInfo) {
		bpmnElement.writeAttributes({sourceRef: conversionInfo.overrideids[conversionInfo.srcs[stencil.resourceId][0]],
									targetRef: conversionInfo.overrideids[stencil.target.resourceId]});
		if(stencil.properties.conditionsequenceflow){
			var conditionalExpElement = new BPMNElement('conditionExpression');
			conditionalExpElement.writeAttribute('xsi:type',"tFormalExpression");
			conditionalExpElement.writeCDATA(stencil.properties.conditionsequenceflow);
			bpmnElement.appendElement(conditionalExpElement);
		}
	},
	defaultFlow: function (stencil, bpmnElement, conversionInfo) {
		for(var i=0;i<stencil.outgoing.length;i++){
			var flow = conversionInfo.flows[stencil.outgoing[i].resourceId];
			if(flow.properties.defaultflow && flow.properties.defaultflow === 'Default'){
				bpmnElement.writeAttribute('default', conversionInfo.overrideids[flow.resourceId]);
				return;
			}
		}
	},
	timerEventDefinition: function (stencil, bpmnElement, conversionInfo) {
		if(stencil.properties.timerdurationdefinition)
			bpmnElement.appendElement(new BPMNElement('timerEventDefinition').elementText('timeDuration', stencil.properties.timerdurationdefinition));
		else if(stencil.properties.timerdatedefinition)
			bpmnElement.appendElement(new BPMNElement('timerEventDefinition').elementText('timeDate', stencil.properties.timerdatedefinition));
		else if(stencil.properties.timercycledefinition)
			bpmnElement.appendElement(new BPMNElement('timeCycle').elementText('timeDate', stencil.properties.timercycledefinition));
	},
	activity: function (stencil, bpmnElement, conversionInfo) {
		if(stencil.properties.isforcompensation && this.booleanValueConverter(stencil.properties.isforcompensation) === true)
			bpmnElement.writeBooleanAttribute('isForCompensation', true);

		if(stencil.properties.asynchronousdefinition && this.booleanValueConverter(stencil.properties.asynchronousdefinition) === true)
			bpmnElement.writeBooleanAttribute('async', true, 'activiti');

		if(stencil.properties.exclusivedefinition && this.booleanValueConverter(stencil.properties.exclusivedefinition) === false)
			bpmnElement.writeBooleanAttribute('exclusive', false, 'activiti');
		

		var looptype = stencil.properties.looptype || 'None';
		if(stencil.properties.multiinstance_collection || stencil.properties.multiinstance_cardinality
				|| stencil.properties.multiinstance_condition || looptype !== 'None'){
			var sequential = (looptype !== 'Parallel');
			if(stencil.properties.multiinstance_sequential){
				sequential = this.booleanValueConverter(stencil.properties.multiinstance_sequential) && sequential;
			}
			var multiInstanceElement = new BPMNElement('multiInstanceLoopCharacteristics');
			multiInstanceElement.writeBooleanAttribute('isSequential', sequential);
			multiInstanceElement.writeAttributes({collection: stencil.properties.multiinstance_collection,
				elementVariable: stencil.properties.multiinstance_variable}, 'activiti');
			
			if(stencil.properties.multiinstance_cardinality)
				multiInstanceElement.elementText('loopCardinality', stencil.properties.multiinstance_cardinality);
			
			if(stencil.properties.multiinstance_condition)
				multiInstanceElement.elementText('completionCondition', stencil.properties.multiinstance_condition);
			
			bpmnElement.appendElement(multiInstanceElement);
		}
	},
	boundary : function (stencil, bpmnElement, conversionInfo) {
		bpmnElement.writeAttribute('attachedToRef', conversionInfo.overrideids[conversionInfo.srcs[stencil.resourceId][0]]);
		if(stencil.properties.cancelactivity)
			bpmnElement.writeBooleanAttribute('cancelActivity', stencil.properties.cancelactivity);
	},
	messageref : function (stencil, bpmnElement, conversionInfo) {
		if(stencil.properties.messageref){
			this.refHandler('message', stencil.properties.messageref, bpmnElement, conversionInfo);
		}
	},
	signalref : function (stencil, bpmnElement, conversionInfo) {
		if(stencil.properties.signalref){
			this.refHandler('signal', stencil.properties.signalref, bpmnElement, conversionInfo);
		}
	},
	errorref : function (stencil, bpmnElement, conversionInfo) {
		if(stencil.properties.errorref){
			this.refHandler('error', stencil.properties.errorref, bpmnElement, conversionInfo);
		}
	},
	scriptTask: function (stencil, bpmnElement, conversionInfo) {
		if(stencil.properties.scriptformat)
			bpmnElement.writeAttribute('scriptFormat',stencil.properties.scriptformat);

		if(stencil.properties.scripttext){
			bpmnElement.elementCDATA('script', stencil.properties.scripttext);
		}
	},

	businessRuleTask: function (stencil, bpmnElement, conversionInfo) {
		if(stencil.properties.ruletask_exclude) 
			bpmnElement.writeBooleanAttribute('exclude', stencil.properties.ruletask_exclude, 'activiti');
		bpmnElement.writeAttributes({
		'class': stencil.properties.ruletask_class, ruleVariablesInput: stencil.properties.ruletask_variables_input,
		rules: stencil.properties.ruletask_rules, resultVariable: stencil.properties.ruletask_result
		}, 'activiti');
	},

	callActivity: function (stencil, bpmnElement, conversionInfo) {
		if(stencil.properties.callactivitycalledelement)
			bpmnElement.writeAttribute('calledElement', stencil.properties.callactivitycalledelement);
		var jsonInParam = stencil.properties.callactivityinparameters;
		if(jsonInParam && jsonInParam.items && jsonInParam.items.length > 0){
			for(var i = 0; i < jsonInParam.items.length; i++){
				var inParamElement = new BPMNElement('in', 'activiti');
				inParamElement.writeAttributes({'source': jsonInParam.items[i].ioparameter_source, 
					'sourceExpression': jsonInParam.items[i].ioparameter_sourceexpression, 'target': jsonInParam.items[i].ioparameter_target});
				bpmnElement.appendExtension(inParamElement);
			}
		}

		var jsonOutParam = stencil.properties.callactivityoutparameters;
		if(jsonOutParam && jsonOutParam.items && jsonOutParam.items.length > 0){
			for(var i = 0; i < jsonOutParam.items.length; i++){
				var outParamElement = new BPMNElement('out', 'activiti');
				outParamElement.writeAttributes({'source': jsonOutParam.items[i].ioparameter_source, 
					'sourceExpression': jsonOutParam.items[i].ioparameter_sourceexpression, 'target': jsonOutParam.items[i].ioparameter_target});
				bpmnElement.appendExtension(outParamElement);
			}
		}
	},
	eventSubProcess: function (stencil, bpmnElement, conversionInfo) {
		bpmnElement.writeAttribute("triggeredByEvent", "true");
	},
	
	poolHandler: function (stencil, bpmnDoc, conversionInfo){
		var participant = new BPMNElement('participant');
		participant.writeAttributes({id: conversionInfo.overrideids[stencil.resourceId], name: stencil.properties.name, processRef: stencil.properties.process_id});
		
		var poolElement = this.createProcessElement(stencil, conversionInfo);
		bpmnDoc.addParticipant(participant);
		this.converter.handleChildStencils(stencil, poolElement, conversionInfo);
		bpmnDoc.appendElement(poolElement);
		this.invokeExtendedHandlers(stencil, poolElement, conversionInfo);
		return poolElement;
	},

	laneHandler: function (stencil, process, conversionInfo){
		var lane = this.createBpmnElement(stencil, conversionInfo);
		if(process.laneSet === undefined){
			process.laneSet = new BPMNElement('laneSet'); 
			process.laneSet.writeAttribute('id', "laneSet_"+process.getId());
			process.appendElement(process.laneSet);
		}
		process.laneSet.appendElement(lane);
		for(var i=0;i<stencil.childShapes.length;i++){
			lane.elementText('flowNodeRef', conversionInfo.overrideids[stencil.childShapes[i].resourceId]);
		}
		this.converter.handleChildStencils(stencil, process, conversionInfo);
		this.invokeExtendedHandlers(stencil, process, conversionInfo);
		return lane;
	},

	bpmnHandler:  function (stencil, namespaces, conversionInfo){
		var bpmnDoc = new BPMNDocument(namespaces);
		var diagramElement = new BPMNElement('BPMNDiagram', 'bpmndi');
		var bpmnPlane = new BPMNElement('BPMNPlane', 'bpmndi');
		diagramElement.appendElement(bpmnPlane);
		conversionInfo.bpmnDoc = bpmnDoc;
		conversionInfo.bpmnPlane = bpmnPlane;

		if(conversionInfo.stencilTypes.Pool){
			diagramElement.writeAttribute('id', "BPMNDiagram_Collaboration");
			bpmnPlane.writeAttributes({'id':"BPMNPlane_Collaboration", bpmnElement:'Collaboration' });
			this.converter.handleChildStencils(stencil, bpmnDoc, conversionInfo);
		}else{
			var processElement = this.createProcessElement(stencil, conversionInfo);
			processElement.writeAttribute('id', stencil.properties.process_id);
			diagramElement.writeAttribute('id', "BPMNDiagram_"+processElement.getId());
			bpmnPlane.writeAttributes({'id':"BPMNPlane_"+processElement.getId(), bpmnElement:processElement.getId() });
			this.converter.handleChildStencils(stencil, processElement, conversionInfo);
			bpmnDoc.appendElement(processElement);
			this.invokeExtendedHandlers(stencil, processElement, conversionInfo);
		}
		
		bpmnDoc.appendElement(diagramElement);
		if(stencil.properties.process_namespace)
			bpmnDoc.addAttribute('targetNamespace', stencil.properties.process_namespace);

		return bpmnDoc;
	},

	initiator : function (stencil, bpmnElement, conversionInfo) {
		if(stencil.properties.initiator) bpmnElement.writeAttribute('initiator', stencil.properties.initiator, 'activiti');
	},
	formproperties : function (stencil, bpmnElement, conversionInfo) {
		var formkeydefinition = stencil.properties.formkeydefinition;
		if(formkeydefinition) bpmnElement.writeAttribute('activiti:formKey', stencil.properties.formkeydefinition);
		var stencilFormProperties = this.parseJSON(stencil.properties.formproperties);
		if(stencilFormProperties === undefined || stencilFormProperties.items === undefined || stencilFormProperties.items.length === 0) return;
		for(var i=0; i < stencilFormProperties.items.length;i++){
			var formProperty = new BPMNElement('activiti:formProperty');
			formProperty.writeAttributes({id: stencilFormProperties.items[i].formproperty_id, name: stencilFormProperties.items[i].formproperty_name,
			type: stencilFormProperties.items[i].formproperty_type, variable: stencilFormProperties.items[i].formproperty_variable,
			expression: stencilFormProperties.items[i].formproperty_expression
			});
			formProperty.writeBooleanAttributes({required: stencilFormProperties.items[i].formproperty_required, 
			readable: stencilFormProperties.items[i].formproperty_readable, writeable: stencilFormProperties.items[i].formproperty_writeable
			});
			var formPropertyValues = this.parseJSON(stencilFormProperties.items[i].formproperty_formvalues);
			if(formPropertyValues && formPropertyValues.items && formPropertyValues.items.length>0) {
				for(var j=0; j < formPropertyValues.items.length;j++){
					var formPropertyValue = new BPMNElement('activiti:value');
					formPropertyValue.writeAttributes({id: formPropertyValues.items[j].formproperty_formvalue_id, 
														name: formPropertyValues.items[j].formproperty_formvalue_name});
					formProperty.appendElement(formPropertyValue);
				}
			}
			bpmnElement.appendExtension(formProperty);
		}
	},

	userTask : function (stencil, bpmnElement, conversionInfo) {
	
		bpmnElement.writeAttributes({dueDate: stencil.properties.duedatedefinition, priority: stencil.properties.prioritydefinition,
			category: stencil.properties.categorydefinition}, 'activiti');
		
		this.handleListeners(this.parseJSON(stencil.properties.tasklisteners), 'task', stencil, bpmnElement, conversionInfo);
		var userTaskAssignement = stencil.properties.usertaskassignment;

		if(userTaskAssignement && userTaskAssignement.items && userTaskAssignement.items.length > 0){
			for(var i=0; i < userTaskAssignement.items.length;i++){
				if ("assignee" === userTaskAssignement.items[i].assignment_type)
					bpmnElement.writeAttribute('assignee', userTaskAssignement.items[i].resourceassignmentexpr, 'activiti');
				else if ("owner" === userTaskAssignement.items[i].assignment_type)
					bpmnElement.writeAttribute('owner', userTaskAssignement.items[i].resourceassignmentexpr, 'activiti');
				else if ("candidateUsers" === userTaskAssignement.items[i].assignment_type)
					bpmnElement.writeAttribute('candidateUsers', userTaskAssignement.items[i].resourceassignmentexpr, 'activiti');
				else if ("candidateGroups" === userTaskAssignement.items[i].assignment_type)
					bpmnElement.writeAttribute('candidateGroups', userTaskAssignement.items[i].resourceassignmentexpr, 'activiti');
			}
		}
		var customidentitylinks = stencil.properties.customidentitylinks;
		if(customidentitylinks === undefined || customidentitylinks.items === undefined || customidentitylinks.items.length === 0) return;
		
		var identityLinkTypes = {};
		for(var i=0; i < customidentitylinks.items.length;i++){
			if(!identityLinkTypes[customidentitylinks.items[i].identity_link_type])
				identityLinkTypes[customidentitylinks.items[i].identity_link_type] = [];//{user:[], group:[]};
			if(customidentitylinks.items[i].identity_type && customidentitylinks.items[i].identitylinkexpr){
				var identities = customidentitylinks.items[i].identitylinkexpr.split(',');
				for(var j=0;j<identities.length;j++)
					identityLinkTypes[customidentitylinks.items[i].identity_link_type]
				.push(customidentitylinks.items[i].identity_type+'('+identities[j].trim()+')');
			}
		}
		
		for(var identityLinkType in identityLinkTypes){
			var customResource = new BPMNElement('activiti:customResource');
			customResource.writeAttribute("name", identityLinkType, 'activiti');
			var resourceAssignmentExpression = new BPMNElement('resourceAssignmentExpression');
			customResource.appendElement(resourceAssignmentExpression);
			resourceAssignmentExpression.elementText('formalExpression', identityLinkTypes[identityLinkType].toString());
			bpmnElement.appendExtension(customResource);
		}
	},
	serviceTask: function (stencil, bpmnElement, conversionInfo) {
		bpmnElement.writeAttributes({'class': stencil.properties.servicetaskclass, 'expression': stencil.properties.servicetaskexpression,
								'delegateExpression': stencil.properties.servicetaskdelegateexpression,
								'resultVariable': stencil.properties.servicetaskresultvariable
								}, 'activiti');
		this.handleFields(stencil.properties.servicetaskfields, 'servicetask', bpmnElement, true);
	},
	mailTask: function (stencil, bpmnElement, conversionInfo) {
		bpmnElement.writeAttribute('type', 'mail', 'activiti');
		if(stencil.properties.mailtaskfrom)
			bpmnElement.appendExtension(new BPMNElement('field', 'activiti').writeAttributes({name: 'from', expression: stencil.properties.mailtaskfrom}));
		if(stencil.properties.mailtaskto)
			bpmnElement.appendExtension(new BPMNElement('field', 'activiti').writeAttributes({name: 'to', expression:stencil.properties.mailtaskto}));
		if(stencil.properties.mailtasksubject)
			bpmnElement.appendExtension(new BPMNElement('field', 'activiti').writeAttributes({name: 'subject', expression:stencil.properties.mailtasksubject}));
		if(stencil.properties.mailtaskcc)
			bpmnElement.appendExtension(new BPMNElement('field', 'activiti').writeAttributes({name: 'cc', expression:stencil.properties.mailtaskcc}));
		if(stencil.properties.mailtaskbcc)
			bpmnElement.appendExtension(new BPMNElement('field', 'activiti').writeAttributes({name: 'bcc', expression:stencil.properties.mailtaskbcc}));
		if(stencil.properties.mailtasktext)
			bpmnElement.appendExtension(new BPMNElement('field', 'activiti').writeAttributes({name: 'text', expression:stencil.properties.mailtasktext}));
		if(stencil.properties.mailtaskcharset)
			bpmnElement.appendExtension(new BPMNElement('field', 'activiti').writeAttributes({name: 'charset', stringValue:stencil.properties.mailtaskcharset}));
		if(stencil.properties.mailtaskhtml){
			var htmlMailElementExp = new BPMNElement('field', 'activiti');
			htmlMailElementExp.writeAttribute('name', 'html');
			htmlMailElementExp.writeCDATA(stencil.properties.mailtaskhtml);
			bpmnElement.appendExtension(htmlMailElementExp);
		}
	},
	executionListener : function (stencil, bpmnElement, conversionInfo) {
		this.handleListeners(this.parseJSON(stencil.properties.executionlisteners), 'execution', stencil, bpmnElement, conversionInfo);
	},

	eventListeners : function (stencil, bpmnElement, conversionInfo) {
		var eventlisteners = stencil.properties.eventlisteners;
		if(eventlisteners === undefined || eventlisteners.items === undefined || eventlisteners.items.length === 0) return;
		for(var i=0; i < eventlisteners.items.length;i++){
			var listenerProperty = new BPMNElement('eventListener','activiti');
			listenerProperty.writeAttributes({
				events: eventlisteners.items[i].event_listener_events, 'class' : eventlisteners.items[i].event_listener_class,
				entityType: eventlisteners.items[i].event_listener_entity_type, delegateExpression: eventlisteners.items[i].event_listener_delegate_expression,
				throwEvent: eventlisteners.items[i].event_listener_throw_event
			});

			if(eventlisteners.items[i].event_listener_throw_event){
				if(eventlisteners.items[i].event_listener_throw_event_ref){
					if(eventlisteners.items[i].event_listener_throw_event === 'signal' || eventlisteners.items[i].event_listener_throw_event === 'globalSignal')
						listenerProperty.writeAttribute('signalName', eventlisteners.items[i].event_listener_throw_event_ref);
					else if(eventlisteners.items[i].event_listener_throw_event === 'message')
						listenerProperty.writeAttribute('messageName', eventlisteners.items[i].event_listener_throw_event_ref);
					else if(eventlisteners.items[i].event_listener_throw_event === 'error')
						listenerProperty.writeAttribute('errorCode', eventlisteners.items[i].event_listener_throw_event_ref);
				}
			}
			bpmnElement.appendExtension(listenerProperty);
		}
	},
	association: function (stencil, bpmnElement, conversionInfo) {
		bpmnElement.writeAttributes({sourceRef: conversionInfo.overrideids[conversionInfo.srcs[stencil.resourceId][0]],
									targetRef: conversionInfo.overrideids[stencil.target.resourceId]});
	},
	textAnnotation: function (stencil, bpmnElement, conversionInfo) {
		if(stencil.properties.text)
			bpmnElement.elementText('text', stencil.properties.text);
	}
};

BPMNConverter.helpers = {

	refHandler : function (refName, refValue, bpmnElement, conversionInfo) {
		var eventDefinitionElement = new BPMNElement(refName+'EventDefinition');
		eventDefinitionElement.writeAttribute(refName+'Ref', refValue);
		bpmnElement.appendElement(eventDefinitionElement);
		conversionInfo.bpmnDoc.addRef(refValue, refName, refValue);
	},
	handleListeners : function (listenersProperty, listenerName, stencil, bpmnElement, conversionInfo) {
		if(listenersProperty === undefined || listenersProperty.items === undefined || listenersProperty.items.length === 0) return;
		for(var i=0; i < listenersProperty.items.length;i++){
			var listenerProperty = new BPMNElement(listenerName+'Listener', 'activiti');
			listenerProperty.writeAttributes({
			event:listenersProperty.items[i][listenerName+'_listener_event_type'], 'class': listenersProperty.items[i][listenerName+'_listener_class'],
			expression: listenersProperty.items[i][listenerName+'_listener_expression'],
			delegateExpression: listenersProperty.items[i][listenerName+'_listener_delegate_expression']	
			});
			this.handleFields(listenersProperty.items[i][listenerName+'_listener_fields'], listenerName+'_listener', listenerProperty, false);
			bpmnElement.appendExtension(listenerProperty);
		}
	},

	handleFields : function (fieldsProperty, prefix, bpmnElement, isExtension) {
		if(fieldsProperty === undefined || fieldsProperty.items === undefined || fieldsProperty.items.length === 0) return;

		for(var j=0; j < fieldsProperty.items.length;j++){
			var fieldElement = new BPMNElement('field', 'activiti');
			fieldElement.writeAttributes({name: fieldsProperty.items[j][prefix+'_field_name'],
			stringValue: fieldsProperty.items[j][prefix+'_field_value'], 
			expression: fieldsProperty.items[j][prefix+'_field_expression']});
			if(isExtension === true)
				bpmnElement.appendExtension(fieldElement);
			else
				bpmnElement.appendElement(fieldElement);
		}
	}
};


BPMNConverter.config = {
		stencilHandlers:{
			StartNoneEvent: {elementName: 'startEvent', extendedHandlers: ['initiator','formproperties', 'executionListener']},
			StartTimerEvent: {elementName: 'startEvent', extendedHandlers: ['timerEventDefinition']},
			StartMessageEvent: {elementName: 'startEvent', extendedHandlers: ['messageref']},
			StartErrorEvent: {elementName: 'startEvent', extendedHandlers: ['errorref']},

			EndNoneEvent: {elementName: 'endEvent'},
			EndErrorEvent: {elementName: 'endEvent', extendedHandlers: ['errorref']},

			ServiceTask: {elementName: 'serviceTask', extendedHandlers: ['activity', 'serviceTask']},
			ScriptTask: {elementName: 'scriptTask', extendedHandlers: ['activity', 'scriptTask']},
			ReceiveTask: {elementName: 'receiveTask', extendedHandlers: ['activity']},
			ManualTask: {elementName: 'manualTask', extendedHandlers: ['activity']},
			MailTask: {elementName: 'serviceTask', extendedHandlers: ['activity','mailTask']},
			BusinessRule: {elementName: 'businessRuleTask', 
				extendedHandlers: ['activity','businessRuleTask']},
			UserTask: {
				elementName: 'userTask',
			 	extendedHandlers: ['activity','userTask','executionListener','formproperties']
			},

			SubProcess: {elementName: 'subProcess'},
			EventSubProcess: {elementName: 'subProcess', extendedHandlers: ['eventSubProcess'] },

			CallActivity: {elementName: 'callActivity', extendedHandlers: ['activity','callActivity']},

			ExclusiveGateway: {elementName: 'exclusiveGateway', extendedHandlers: ['defaultFlow']},
			ParallelGateway: {elementName: 'parallelGateway'},
			InclusiveGateway: {elementName: 'inclusiveGateway'},
			EventGateway: {elementName: 'eventBasedGateway'},

			BoundaryErrorEvent: {elementName: 'boundaryEvent', extendedHandlers: ['errorref', 'boundary']},
			BoundaryTimerEvent: {elementName: 'boundaryEvent', extendedHandlers: ['timerEventDefinition','boundary']},
			BoundarySignalEvent: {elementName: 'boundaryEvent', extendedHandlers: ['signalref', 'boundary']},
			BoundaryMessageEvent: {elementName: 'boundaryEvent', extendedHandlers: ['messageref', 'boundary']},

			CatchTimerEvent: {elementName: 'intermediateCatchEvent', extendedHandlers: ['timerEventDefinition']},
			CatchSignalEvent: {elementName: 'intermediateCatchEvent', extendedHandlers: ['signalref']},
			CatchMessageEvent: {elementName: 'intermediateCatchEvent', extendedHandlers: ['messageref']},
			ThrowNoneEvent: {elementName: 'intermediateThrowEvent'},
			ThrowSignalEvent: {elementName: 'intermediateThrowEvent', extendedHandlers: ['signalref']},

			Association: {elementName: 'association', diagramType: 'edge', extendedHandlers: ['association']},
			TextAnnotation: {elementName: 'textAnnotation', extendedHandlers: ['textAnnotation']},

			SequenceFlow: {
				elementName: 'sequenceFlow', diagramType: 'edge',
			 	extendedHandlers: ['sequenceflow']
			},

			Pool: {elementName: 'process', mainHandler: 'poolHandler'},
			Lane: {elementName: 'lane', mainHandler: 'laneHandler' },
			BPMNDiagram: {elementName: 'definitions', mainHandler: 'bpmnHandler', extendedHandlers: ['eventListeners', 'executionListener']}
		},
		extendedHandlers: [],
		namespaces:{
			'xmlns' : 'http://www.omg.org/spec/BPMN/20100524/MODEL', 
			'xmlns:xsi':'http://www.w3.org/2001/XMLSchema-instance', 
			'typeLanguage':'http://www.w3.org/2001/XMLSchema', 
			'expressionLanguage':'http://www.w3.org/1999/XPath',
			'xmlns:bpmndi': 'http://www.omg.org/spec/BPMN/20100524/DI', 
			'xmlns:omgdc': 'http://www.omg.org/spec/DD/20100524/DC',
			'xmlns:omgdi': 'http://www.omg.org/spec/DD/20100524/DI',
			'xmlns:activiti': 'http://activiti.org/bpmn'
		}
};

/**
 * http://flesler.blogspot.com/2008/03/xmlwriter-for-javascript.html
 */
function BPMNDocument(nameSpaces){
	this.root = new BPMNElement('definitions');
	if(nameSpaces)
		this.root.writeAttributes (nameSpaces);
};
(function(){
	
BPMNDocument.prototype = {
	formatting: 'indented', //how to format the output (indented/none)  ?
	indentChar:'  ', //char to use for indent
	indentation: 1, //how many indentChar to add per level
	newLine: '\n', //character to separate nodes when formatting

	appendElement:function( bpmnElement ){
		this.root.appendElement(bpmnElement);
	},
	addAttribute:function( name, value ){
		this.root.writeAttribute(name, value);
	},
	addParticipant:function(bpmnElement){
		if(!this.collaboration){
			var collaboration = new BPMNElement('collaboration');
			collaboration.writeAttribute('id', "Collaboration");
			this.collaboration = collaboration;
			this.appendElement(this.collaboration);
		}
		this.collaboration.appendElement(bpmnElement);
	},
	addRef:function(id, type, name){
		if(!this.refs){
			this.refs = {};
		}
		if(this.refs[id]) return;
		
		this.refs[id] = id;
		var refElement = new BPMNElement(type);
		refElement.writeAttributes({id: id, name:name});
		this.appendElement(refElement);
	},

	//generate the xml string, you can skip closing the last nodes
	flush:function(){		
		
		var chr = '', indent = '', num = this.indentation,
			formatting = this.formatting.toLowerCase() == 'indented',
			buffer = '<?xml version="1.0" encoding="UTF-8" ?>';
		
		buffer = [buffer];
		
		if( formatting ){
			while( num-- )
				chr += this.indentChar;
		}
		
		if( this.root )//skip if no element was added
			format( this.root.node, indent, chr, buffer );
		
		return buffer.join( formatting ? this.newLine : '' );
	},

	getDocument: window.ActiveXObject 
		? function(){ //MSIE
			var doc = new ActiveXObject('Microsoft.XMLDOM');
			doc.async = false;
			doc.loadXML(this.flush());
			return doc;
		}
		: function(){// Mozilla, Firefox, Opera, etc.
			return (new DOMParser()).parseFromString(this.flush(),'text/xml');
	}
};

//utility, you don't need it
function clean( node ){
	var l = node.c.length;
	while( l-- ){
		if( typeof node.c[l] == 'object' )
			clean( node.c[l] );
	}
	node.n = node.a = node.c = null;	
};

//utility, you don't need it
function format( node, indent, chr, buffer ){
	var 
		xml = indent + '<' + node.n,
		nc = node.c.length,
		attr, child, i = 0;
		
	for( attr in node.a )
		xml += ' ' + attr + '="' + node.a[attr] + '"';
	
	xml += nc ? '>' : ' />';

	buffer.push( xml );
		
	if( nc ){
		do{
			child = node.c[i++];
			if( typeof child == 'string' ){
				if( nc == 1 && child.substr(0,9) !== "<![CDATA[")//single text node
					return buffer.push( buffer.pop() + child + '</'+node.n+'>' );					
				else{ //regular text node
						buffer.push( indent+chr+child );
				}
			}else if( typeof child == 'object' ) //element node
				format(child, indent+chr, chr, buffer);
		}while( i < nc );
		buffer.push( indent + '</'+node.n+'>' );
	}
};

})();

function BPMNElement(elementName, ns){
	this.node = this.createNode(elementName, ns);
};
(function(){
BPMNElement.prototype = {
	_extendElement: function(ex){
		for (var i = 0; i < ex.length;i++) {
			for (var property in ex[i]) {
				this[property] = ex[i][property];
			}
		}
	},
	getId: function(){
		return this.node.a['id'];
	},
	appendElement:function( bpmnElement){
		this.node.c.push(bpmnElement.node);
		return this;
	},
	documentation: function( doc ){
		if(this.node.c.length > 0){ // ensure that documentation is first element otherwise parsing will fail
			if(this.node.c[0].n === 'documentation')
				this.node.c[0].n.c[0] = doc;
			else
				this.node.c.splice(0,0,this.createTextNode('documentation', doc));
		}else{
			this.node.c.push(this.createTextNode('documentation', doc));
		}
	},
	appendExtension:function( bpmnElement ){
		if(this.extElement === undefined){ 
			this.extElement = this.createNode('extensionElements');
			var insertAt = 0;
			if(this.node.c.length > 0){ // ensure that extensionElements is first element or after documentation otherwise parsing will fail
				if(this.node.c[0].n === 'documentation')
					insertAt = 1;
			}
			this.node.c.splice(insertAt,0,this.extElement);
		}
		this.extElement.c.push(bpmnElement.node);
	},
	//add an attribute to the active node
	writeAttribute:function( name, value, ns ){
		//if(!value) return;
		if( ns )//namespace
			name = ns + ':' + name;
			this.node.a[name] = value;
		return this;
	},
	writeBooleanAttribute:function( name, value, ns ){
		if(typeof value === 'string')
			this.writeAttribute( name, "YES" === value.toUpperCase(), ns );
		else
			this.writeAttribute( name, value, ns);
		return this;
	},
	//add an attribute to the active node
	writeAttributes:function( attrs, ns ){
			for(var attr in attrs)
				if(attrs[attr]) this.writeAttribute(attr, attrs[attr], ns);
		return this;
	},
	writeBooleanAttributes:function( attrs, ns ){
			for(var attr in attrs)
				if(attrs[attr]) this.writeBooleanAttribute(attr, attrs[attr], ns);
		return this;
	},
	//add a text node to the active node
	writeText:function( text ){
		this.node.c.push(text);
		return this;
	},
	//shortcut, open an element, write the text and close
	elementText:function( name, text, ns ){
		this.node.c.push(this.createTextNode(name, text, ns));
		return this;
	},
	//shortcut, open an element, write the text and close
	elementCDATA:function( name, text, ns ){
		this.node.c.push(this.createCDataNode(name, text, ns));
		return this;
	},
	//add a text node wrapped with CDATA
	writeCDATA:function( text ){
		this.writeText( this.getCData(text) );
		return this;
	},
	//add a text node wrapped in a comment
	writeComment:function( text ){
		this.writeText('<!-- ' + text + ' -->');
	},
	//if no attrs and no childs returns true
	isEmpty:function( text ){
		return (Object.keys(this.node.a).length === 0 && this.node.c.length === 0);
	},
	createNode:function ( name, ns ){
		if( ns )//namespace
			name = ns + ':' + name;
		return { n:name, a:{ }, c: [ ] };//(n)ame, (a)ttributes, (c)hildren
	},
	createTextNode:function (name, text, ns ){
		var node = this.createNode( name, ns );
		node.c.push(text);
		return node;
	},
	getCData:function (cdata){
		if(cdata){
			var trimmedVal = cdata.trim();
			if(trimmedVal.length === 0) return '';
			var prefix = (trimmedVal.substr(0,9) === '<![CDATA[')? '' :'<![CDATA[',
				 suffix = (trimmedVal.substr(trimmedVal.length-3,3) === ']]>')? '' :']]>';
			return prefix + trimmedVal + suffix;
		}
	return '';
	},
	createCDataNode:function (name, cdata, ns ){
		return this.createTextNode(name, this.getCData(cdata), ns );
	}
};

})();