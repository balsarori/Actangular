/**
 * 
 */
package org.actangular.rest.security;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.authentication.RememberMeServices;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

/**
 * @author Bassam Al-Sarori
 *
 */
public class CustomBasicAuthenticationFilter extends BasicAuthenticationFilter {

  public CustomBasicAuthenticationFilter(AuthenticationManager authenticationManager, AuthenticationEntryPoint authenticationEntryPoint, RememberMeServices rememberMeServices) {
    super(authenticationManager, authenticationEntryPoint);
    setRememberMeServices(rememberMeServices);
  }

  public CustomBasicAuthenticationFilter(AuthenticationManager authenticationManager, RememberMeServices rememberMeServices) {
    super(authenticationManager);
    setRememberMeServices(rememberMeServices);
  }

}
