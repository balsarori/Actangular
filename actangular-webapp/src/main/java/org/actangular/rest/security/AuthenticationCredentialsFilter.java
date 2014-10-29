/**
 * 
 */
package org.actangular.rest.security;

import java.io.IOException;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.web.filter.GenericFilterBean;

/**
 * @author Bassam Al-Sarori
 *
 */
public class AuthenticationCredentialsFilter extends GenericFilterBean {

  protected AuthenticationEntryPoint authenticationEntryPoint;
  
  public AuthenticationCredentialsFilter(AuthenticationEntryPoint authenticationEntryPoint){
    this.authenticationEntryPoint = authenticationEntryPoint;
  }
  
  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated()) {
      final HttpServletRequest request = (HttpServletRequest) req;
      final HttpServletResponse response = (HttpServletResponse) res;
      authenticationEntryPoint.commence(request, response, new AuthenticationCredentialsNotFoundException("No authentication credentials found"));
    }else{
      chain.doFilter(req, res);
    }
  }

}
