/**
 * 
 */
package org.actangular.rest.service.api.identity;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.activiti.engine.identity.User;
import org.springframework.context.ApplicationEvent;

/**
 * @author Bassam Al-Sarori
 *
 */
public class PasswordChangedEvent extends ApplicationEvent {

  protected HttpServletRequest request;
  protected HttpServletResponse response;
  
  public PasswordChangedEvent(Object source, HttpServletRequest request, HttpServletResponse response) {
    super(source);
    this.request = request;
    this.response = response;
  }

  /**
   * 
   */
  private static final long serialVersionUID = 1L;
  
  public HttpServletRequest getRequest() {
    return request;
  }
  
  public HttpServletResponse getResponse() {
    return response;
  }
  
  public String getPassword(){
    return ((User) source).getPassword();
  }

}
