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

if (!ORYX.Plugins) 
    ORYX.Plugins = new Object();

ORYX.Plugins.BPMNDeploy = Clazz.extend({
	
	// Defines the facade
    facade		: undefined,
	//BPMN Converter
	bpmnConverter : new BPMNConverter.JsonToBPM(),
	// Constructor 
    construct: function(facade){
    
        this.facade = facade;     
		
		// Offers the functionality of deploy                
        this.facade.offer({
			name			: 'bpmnSource',
			description		: 'View BPMN Source',
			icon			: ORYX.PATH + "images/source.png",
			functionality	: this.viewSource.bind(this),
			group			: "BPMNDeploy",
			index			: 0
		}); 

		// Offers the functionality of deploy                
        this.facade.offer({
			name			: 'bpmnDeploy',
			description		: 'Deploy Model',
			icon			: ORYX.PATH + "images/bpmn2pn_deploy.png",
			functionality	: this.doDeploy.bind(this),
			group			: "BPMNDeploy",
			index			: 1
		}); 
    	
	},
	
	
	/**
	 * shows BPMN Source
	 * 
	 */
	viewSource: function(deployment){
		var bpmnSource = '';
		if(deployment && deployment.processDef)
			bpmnSource = deployment.processDef;
		else{
			try{
				bpmnSource = this.bpmnConverter.convertToBpmn(this.facade.getJSON()).flush();
			} catch(e){
				Ext.Msg.alert('BPMN Conversion Error', e).setIcon(Ext.Msg.WARNING).getDialog().setWidth(260).center().syncSize();
				return;
			}
		}

		var grid = new Ext.form.TextArea({
	        anchor		: '100% 100%',
			value		: bpmnSource,
			listeners	: {
				focus: function(){
					this.facade.disableEvent(ORYX.CONFIG.EVENT_KEYDOWN);
				}.bind(this)
			}
		})
		// Basic Dialog
		var dialog = new Ext.Window({ 
			layout		: 'anchor',
			autoCreate	: true, 
			title		: 'BPMN Source', 
			height		: 500, 
			width		: "70%", 
			modal		: true,
			collapsible	: false,
			fixedcenter	: true, 
			shadow		: true, 
			proxyDrag	: true,
			keys:[{
				key	: 27,
				fn	: function(){
						dialog.hide()
				}.bind(this)
			}],
			items		:[grid],
			listeners	:{
				hide: function(){
					dialog.destroy();
				}.bind(this)				
			},
			buttons		: [{
                text: ORYX.I18N.PropertyWindow.ok,
                handler: function(){
				if(deployment && deployment.processDef)	 
					deployment.processDef = grid.getValue();
				dialog.hide();
                }.bind(this)
            }, {
                text: ORYX.I18N.PropertyWindow.cancel,
                handler: function(){
                	dialog.hide()
                }.bind(this)
            }]
		});		
				
		dialog.show();		
		grid.render();
		grid.focus( false, 100 );
		
	},
	/**
	 * Deploy
	 * 
	 */
	doDeploy: function(){
		var bpmnDoc;
		try{
			bpmnDoc = this.bpmnConverter.convertToBpmn(this.facade.getJSON());
		} catch(e){
			Ext.Msg.alert('BPMN Conversion Error', e).setIcon(Ext.Msg.WARNING).getDialog().setWidth(260).center().syncSize();
			return;
		}
		var svgClone = this.convertSVG(bpmnDoc);
		var content = bpmnDoc.flush();
		var deployment={processDef: content, svg: svgClone};
		var defaultData = {name:'Deployment Name', category: '', tenantId: ''};
		// Create a Template
		var dialog = new Ext.XTemplate(		
					'<form class="oryx_repository_edit_model" action="#" id="deploy_model" onsubmit="return false;">',
						'<fieldset>',
							'<p class="description">Enter Deployment details</p>',
							'<p><label for="deploy_name">Name</label><input type="text" class="text" name="name" value="{name}" id="deploy_name" onfocus="this.className = \'text activated\'" onblur="this.className = \'text\'"/></p>',
'<p><label for="deploy_category">Category</label><input type="text" class="text" name="category" value="" id="deploy_category" onfocus="this.className = \'text activated\'" onblur="this.className = \'text\'"/></p>',
'<p><label for="deploy_tenant">Tenant Id</label><input type="text" class="text" name="tenantId" value="" id="deploy_tenant" onfocus="this.className = \'text activated\'" onblur="this.className = \'text\'"/></p>',
						'</fieldset>','</form>')
		
		// Create the callback for the template
		callback = function(form){

				var deploymentName = form.elements["name"].value.strip();
				var category = form.elements["category"].value.strip();
				var tenantId = form.elements["tenantId"].value.strip();

				if(deploymentName)
					deployment.name = deploymentName;
				else
					deployment.name = defaultData.name;
	        		 
				var successFn = function(data, textStatus, transport) {
					win.close();
					delete this.saving;
						
				}.bind(this);
				
				var failure = function(transport) {
						// raise loading disable event.
		                this.facade.raiseEvent({
		                    type: ORYX.CONFIG.EVENT_LOADING_DISABLE
		                });
						
						win.close();
						
						if(transport.status && transport.status === 401) {
							Ext.Msg.alert(ORYX.I18N.Oryx.title, ORYX.I18N.Save.notAuthorized).setIcon(Ext.Msg.WARNING).getDialog().setWidth(260).center().syncSize();
						} else if(transport.status && transport.status === 403) {
							Ext.Msg.alert(ORYX.I18N.Oryx.title, ORYX.I18N.Save.noRights).setIcon(Ext.Msg.WARNING).getDialog().setWidth(260).center().syncSize();
						} else if(transport.statusText === "transaction aborted") {
							Ext.Msg.alert(ORYX.I18N.Oryx.title, ORYX.I18N.Save.transAborted).setIcon(Ext.Msg.WARNING).getDialog().setWidth(260).center().syncSize();
						} else if(transport.statusText === "communication failure") {
							Ext.Msg.alert(ORYX.I18N.Oryx.title, ORYX.I18N.Save.comFailed).setIcon(Ext.Msg.WARNING).getDialog().setWidth(260).center().syncSize();
						} else {
							Ext.Msg.alert(ORYX.I18N.Oryx.title, ORYX.I18N.Save.failed).setIcon(Ext.Msg.WARNING).getDialog().setWidth(260).center().syncSize();
						}
						
						delete this.saving;
						
					}.bind(this);
				
		var fd = new FormData();
		var bpmnBlob = new Blob([deployment.processDef], { type: "text/xml"});
		var svgBlob = new Blob([DataManager.serialize(svgClone)], { type: "image/svg+xml"});
		fd.append("definition", bpmnBlob, deployment.name+'.bpmn20.xml');
		fd.append("diagram", svgBlob, deployment.name+'.svg');

		if(category)
			fd.append("category", category);

		if(tenantId)
			fd.append("tenantId", tenantId);
		
		jQuery.ajax({
			  url: '../service/repository/deployments',
			  type: 'POST',
			  cache: false,
			  async: false,
			  timeout: 1800000,
			  data: fd,
			  processData: false,  // tell jQuery not to process the data
			  contentType: false,   // tell jQuery not to set contentType
			  success: successFn,
			  error: failure
			});

		}.bind(this);
			
		// Create a new window				
		win = new Ext.Window({
			id		: 'Propertie_Window',
	        width	: 'auto',
	        height	: 'auto',
		    title	: 'Deploy Model',
	        modal	: true,
	        resize	: false,
			bodyStyle: 'background:#FFFFFF',
	        html	: dialog.apply( defaultData ),
	        defaultButton: 0,
			buttons:[{
				text: 'Deploy',
				handler: function(){
				
					win.body.mask(ORYX.I18N.Save.pleaseWait, "x-waiting-box");
					
					window.setTimeout(function(){
						
						callback($('deploy_model'));
						
					}.bind(this), 10);			
				},
				listeners:{
					render:function(){
						this.focus();
					}
				}
			},{
            	text: 'View Source',
            	handler: function(){
	               this.viewSource(deployment);
            	}.bind(this)
			},{
            	text: ORYX.I18N.Save.close,
            	handler: function(){
	               win.close();
            	}.bind(this)
			}],
			listeners: {
				close: function(){					
                	win.destroy();
					delete this.saving;
				}.bind(this)
			}
	    });
		win.show();
	},
	convertSVG: function(bpmnDoc){
		var selection = this.facade.getSelection();
		this.facade.setSelection([]);

		// Get the serialized svg image source
		var svg = this.facade.getCanvas().getSVGRepresentation(true);
		this.facade.setSelection(selection);

		for(var overrideId in bpmnDoc.conversionInfo.overrideids){
			//svg.getElementById('svg-'+overrideId); dosen't work on Opera!!
			var elm = svg.querySelector('#svg-'+overrideId);
			elm.setAttribute('id', bpmnDoc.conversionInfo.overrideids[overrideId]);
				//if(conversionInfo.stencils[overrideId])
				//console.log(conversionInfo.stencils[overrideId].getShape());
		}

		cleanUpSVG(svg);
		return svg;
	}
});

/**
* Cleans Up SVG diagram
* removes oryx attributes, white spaces, and elements that have dispaly attribute set to none
**/
function cleanUpSVG(svgElement){
			var attrs = svgElement.attributes || [];
			var toRemoveAttrs = [];
			for(var i = 0; i < attrs.length; i++){
				if(attrs[i].name.substr(0,5) === 'oryx:')
					toRemoveAttrs.push(attrs[i].name);
			}
			for(var i = 0; i < toRemoveAttrs.length; i++){
				svgElement.removeAttribute(toRemoveAttrs[i]);
			}
			var childNodes = svgElement.childNodes || [];
			var toRemovechildNodes = [];
			for(var i = 0; i < childNodes.length; i++)
				if(childNodes[i].tagName && !(childNodes[i].hasAttribute('display') && childNodes[i].getAttribute('display')==='none')){
					cleanUpSVG(childNodes[i]);
				}else{
					if(childNodes[i].textContent.trim() === '')
						toRemovechildNodes.push(childNodes[i]);
				}
		
			for(var i = 0; i < toRemovechildNodes.length; i++){
				svgElement.removeChild(toRemovechildNodes[i]);
			}
		};
