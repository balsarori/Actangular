/**
 * 
 */
package org.actangular.rest.security;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * @author Bassam Al-Sarori
 *
 */
public class DefaultAuthenticationEntryPoint implements AuthenticationEntryPoint {

  @Autowired
  protected ObjectMapper objectMapper;
  
  @Override
  public void commence(HttpServletRequest request, HttpServletResponse response,
      AuthenticationException authException) throws IOException, ServletException {
    response.setContentType("application/json");
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.getWriter().print("{\"error\": "+objectMapper.writeValueAsString(authException.getMessage())+"}");
  }

}
