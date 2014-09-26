/* Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.actangular.rest.service.application;

import org.actangular.rest.service.api.ActangularRestResponseFactory;
import org.actangular.rest.service.api.boot.BootResource;
import org.actangular.rest.service.api.runtime.process.ExtendedProcessInstanceIdentityLinkResource;
import org.actangular.rest.service.api.runtime.task.ExtendedTaskAttachmentContentResource;
import org.activiti.rest.common.api.DefaultResource;
import org.activiti.rest.common.filter.JsonpFilter;
import org.activiti.rest.service.api.RestResponseFactory;
import org.activiti.rest.service.application.ActivitiRestServicesApplication;
import org.activiti.rest.service.application.RestServicesInit;
import org.restlet.Request;
import org.restlet.Response;
import org.restlet.Restlet;
import org.restlet.data.ChallengeScheme;
import org.restlet.routing.Router;
import org.restlet.security.ChallengeAuthenticator;


/**
 * @author Bassam Al-Sarori
 *
 */
public class ActangularRestServicesApplication extends
		ActivitiRestServicesApplication {

	@Override
	public void initializeAuthentication() {
		authenticator = new ChallengeAuthenticator(null, true, ChallengeScheme.CUSTOM,
		          "Actangular Realm") {
		      
		      @Override
		      protected boolean authenticate(Request request, Response response) {
		        
		        // Check if authentication is required if a custom RestAuthenticator is set
		        if(restAuthenticator != null && !restAuthenticator.requestRequiresAuthentication(request)) {
		          return true;
		        }
		        
		          boolean authenticated = super.authenticate(request, response);
		          if(authenticated && restAuthenticator != null) {
		            // Additional check to see if authenticated user is authorised. By default, when no RestAuthenticator
		            // is set, a valid user can perform any request.
		            authenticated = restAuthenticator.isRequestAuthorized(request);
		          }
		          return authenticated;
		      }
		    };
		    authenticator.setVerifier(new DefaultVerifier());
	}
	@Override
	public synchronized Restlet createInboundRoot() {
		initializeAuthentication();
	    
	    Router router = new Router(getContext());
	    router.attachDefault(DefaultResource.class);
		
	    attachExtendedResources(router);
	    
	    RestServicesInit.attachResources(router);
	    
	    JsonpFilter jsonpFilter = new JsonpFilter(getContext());
	    authenticator.setNext(jsonpFilter);
	    jsonpFilter.setNext(router);

	    return authenticator;
	}
	
	protected void attachExtendedResources(Router router) {
		router.attach("/boot", BootResource.class);
		router.attach("/runtime/process-instances/{processInstanceId}/identitylinks/users/{identityId}/{type}", ExtendedProcessInstanceIdentityLinkResource.class);
		router.attach("/runtime/tasks/{taskId}/attachments/{attachmentId}/content", ExtendedTaskAttachmentContentResource.class);
	}
	
	public RestResponseFactory getRestResponseFactory() {
	    if(restResponseFactory == null) {
	      restResponseFactory = new ActangularRestResponseFactory();
	    }
	    return restResponseFactory;
	  }
}
