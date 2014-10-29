/**
 * 
 */
package org.actangular.rest.security;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.rememberme.TokenBasedRememberMeServices;

/**
 * @author Bassam Al-Sarori
 *
 */
public class CustomTokenBasedRememberMeServices extends TokenBasedRememberMeServices {
  
  protected static final String REMEMBER_ME_FOR_SESSION = "session";
  
  public CustomTokenBasedRememberMeServices(String key, UserDetailsService userDetailsService) {
    super(key, userDetailsService);
  }

  @Override
  protected boolean rememberMeRequested(HttpServletRequest request, String parameter) {
      return super.rememberMeRequested(request, parameter) || 
          REMEMBER_ME_FOR_SESSION.equalsIgnoreCase(request.getParameter(parameter));
  }
  
  protected void setCookie(String[] tokens, int maxAge, HttpServletRequest request, HttpServletResponse response) {
    if(REMEMBER_ME_FOR_SESSION.equalsIgnoreCase(request.getParameter(getParameter())))
      super.setCookie(tokens, -1, request, response);
    else
      super.setCookie(tokens, maxAge, request, response);
    
  }
  
}
