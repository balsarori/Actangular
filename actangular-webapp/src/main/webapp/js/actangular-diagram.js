(function() {'use strict';

/* agDiagram */


function $diagram($http, svgConfig){
	var svgDocuments = {};
	this.renderDefinitionDiagram = function(element, definition){
		if(svgConfig.enabled && definition.diagramResource.indexOf('svg',definition.diagramResource.length - 3)!==-1){
			getSvgElement(definition, function(svgElement){
				var svg = createSvgElement(svgElement);
				var outerDiv = angular.element('<div />');
				var svgCon = angular.element('<div class="svgCon"></div>');
				svgCon.append(svg);
				outerDiv.append(svgCon);
				setElementContent(element, 'svg', outerDiv.html());
			});
		}else{
			setElementContent(element, 'png', "<img src='"+definition.diagramResource.replace("/resources/", "/resourcedata/")+"'>");
		}
	};

	this.renderProcessInstanceDiagram = function(element, processInstance, activities){

		if(svgConfig.enabled && processInstance.definition.diagramResource.indexOf('svg',processInstance.definition.diagramResource.length - 3)!==-1){
			renderProcessInstanceSVGDiagram(element, processInstance, activities);
		}else{
			var diagramUrl = "service/runtime/process-instances/"+processInstance.id+"/diagram";
			if(activities.length>0){
				diagramUrl+="?x="+activities[0];
				for(var i=1;i<activities.length;i++)
					diagramUrl+="_"+activities[i];
			}
			setElementContent(element, 'png', "<img src='"+diagramUrl+"'>");
		}
	};
	function renderProcessInstanceSVGDiagram(element, processInstance, activities){
		var processId = "process"+processInstance.id;
		var styleElm = element.find('#style_'+processId);
		if(styleElm.length>0){
			styleElm.text(createSvgProcessInstanceCssSelectors(processId, activities)+svgConfig.style);
			return;
		}

		getSvgElement(processInstance.definition, function(svgElement){
			var svg = createSvgElement(svgElement);
			var style = '<style id="style_'+processId+'" type="text/css">'+createSvgProcessInstanceCssSelectors(processId, activities)+svgConfig.style+'</style>';
			var outerDiv = angular.element('<div>'+style+'</div>');
			var svgCon = angular.element('<div class="svgCon"></div>');
			svg.attr('id',processId);
			svgCon.append(svg);
			outerDiv.append(svgCon);
			setElementContent(element, 'svg', outerDiv.html());
		});
	};
	function setElementContent(element, type, html){
		element.html("<div><span class='"+type+"'>"+type.toUpperCase()+"</span></div>"+html);
	};
	function getSvgElement(definition, success){
		if(svgDocuments[definition.id]){
			success(svgDocuments[definition.id]);
		}else{
			$http.get(definition.diagramResource.replace("/resources/", "/resourcedata/"),{cache:true}).success(function(svgdoc){
				var parser = new DOMParser();
				var doc = parser.parseFromString(svgdoc, "text/xml");

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
		doc.documentElement.removeAttribute('id');
		doc.documentElement.removeAttribute('xmlns:xlink');
		doc.documentElement.removeAttribute('xmlns:svg');
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
		//def.remove(); doesn't work on Opera!!
		doc.documentElement.removeChild(def);
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

angular.module('agDiagram', [])
.provider('$diagram', function $DiagramProvider() {
	var svgConfig = {enabled: true, style: '{stroke: #ff0000;stroke-width: 3;}'};

	this.setSvgEnabled = function(enabled){
		svgConfig.enabled = enabled;
	};
	this.setSvgStyle = function(svgStyle){
		svgConfig.style = svgStyle;
	};
	this.$get = ['$http', function sessionFactory($http) {
		return new $diagram($http, svgConfig);
	}];
})
.directive('agProcessActivities', function($diagram, $otherwise) {
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
						var html = "<div><span>"+$otherwise.get(otherwiseKey)+"</span></div>";
						html += "<img src='"+processInstance.definition.diagramResource.replace("/resources/", "/resourcedata/")+"'>";
						element.html(html);
					}else if(otherwiseKey !== ''){
						element.html("<span>"+$otherwise.get(otherwiseKey)+"</span>");
					}
				}
			}
		});
	}};
})
.directive('agDefinitionDiagram', function($otherwise, $diagram) {
	return {link: function(scope, element, attrs) {
		var otherwiseKey = element.attr('otherwiseKey') || '';
		scope.$watch(attrs.agDefinitionDiagram, function (definition) {
			if(definition){
				if(definition.diagramResource){
					$diagram.renderDefinitionDiagram(element, definition);
				}else{
					if(otherwiseKey !== '')
						element.html("<span>"+$otherwise.get(otherwiseKey)+"</span>");
				}
			}
		});
	}};
});

})();