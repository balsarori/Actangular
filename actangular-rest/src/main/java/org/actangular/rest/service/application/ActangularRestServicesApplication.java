/**
 * 
 */
package org.actangular.rest.service.application;

import org.actangular.rest.service.api.ActangularRestResponseFactory;
import org.actangular.rest.service.api.boot.BootResource;
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
		router.attach("/runtime/tasks/{taskId}/attachments/{attachmentId}/content", ExtendedTaskAttachmentContentResource.class);
	}
	
	public RestResponseFactory getRestResponseFactory() {
	    if(restResponseFactory == null) {
	      restResponseFactory = new ActangularRestResponseFactory();
	    }
	    return restResponseFactory;
	  }
}
