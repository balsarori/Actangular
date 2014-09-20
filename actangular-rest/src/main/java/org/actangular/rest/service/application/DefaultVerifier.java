/**
 * 
 */
package org.actangular.rest.service.application;

import java.net.URLDecoder;
import java.nio.charset.Charset;

import org.activiti.rest.common.api.ActivitiUtil;
import org.restlet.Request;
import org.restlet.Response;
import org.restlet.engine.util.Base64;
import org.restlet.security.User;
import org.restlet.security.Verifier;

/**
 * @author Bassam Al-Sarori
 *
 */
public class DefaultVerifier implements Verifier {

	public int verify(Request request, Response response) {
        
		  if (request.getChallengeResponse() != null){
			  String identifier = request.getChallengeResponse().getIdentifier();
			  if(ActivitiUtil.getIdentityService().checkPassword(
					  identifier, new String(request.getChallengeResponse().getSecret()))){
				  request.getClientInfo().setUser(new User(identifier));
				  return RESULT_VALID;
			  }
			  
			  return RESULT_INVALID;
		  }else{
        String authorization = request.getCookies().getValues("actKey");
  	  if(authorization != null){
  		  return validate(authorization, request, response);
  	  }
  		  return RESULT_MISSING;
		  }
	}
	
	protected int validate(String authorization, Request request, Response response){
		if(authorization.length()>6)
		try {
			authorization = URLDecoder.decode(authorization, "UTF-8");
			String base64Credentials = authorization.substring(6).trim();
	    	String credentials = new String(Base64.decode(base64Credentials), Charset.forName("UTF-8"));
	    	final String[] values = credentials.split(":",2);
	    	if(values.length == 2)				    	
	    	if(ActivitiUtil.getIdentityService().checkPassword(values[0], values[1])){
	    		request.getClientInfo().setUser(new User(values[0]));
                        //createUser(values[0], request, response));
	    		return RESULT_VALID;
	    	}
	    	
		} catch (Exception e) {
			
		}
		return RESULT_INVALID;

	}

}
