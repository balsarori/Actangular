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

package org.actangular.rest.service.api.identity;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.activiti.engine.ActivitiIllegalArgumentException;
import org.activiti.engine.identity.User;
import org.activiti.rest.exception.ActivitiForbiddenException;
import org.activiti.rest.service.api.identity.UserRequest;
import org.activiti.rest.service.api.identity.UserResponse;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.ApplicationEventPublisherAware;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;


/**
 * @author Bassam Al-Sarori
 */
@RestController
public class UserResource extends org.activiti.rest.service.api.identity.UserResource implements ApplicationEventPublisherAware {
  
  protected ApplicationEventPublisher publisher;

  public void setApplicationEventPublisher(ApplicationEventPublisher publisher){
     this.publisher = publisher;
  }
  
  @RequestMapping(value="/identity/profile/changePassword", method = RequestMethod.PUT, produces = "application/json")
  public UserResponse changePassword(@RequestBody ChangePasswordRequest changePasswordRequest, HttpServletRequest request, HttpServletResponse response) {
    User user = getUserFromRequest(request.getRemoteUser());
    String currentPassword = changePasswordRequest.getCurrentPassword();
    String newPassword = changePasswordRequest.getNewPassword();
    if(currentPassword == null || currentPassword.isEmpty() 
        || newPassword == null || newPassword.isEmpty()){
      throw new ActivitiIllegalArgumentException("currentPassword & newPassword must be set");
    }
    if(!currentPassword.equals(user.getPassword()))
      throw new ActivitiForbiddenException("Access Denied");
      
    user.setPassword(newPassword);
    identityService.saveUser(user);
    
    if(publisher != null) // Notify interested listeners that password has changed
      this.publisher.publishEvent(new PasswordChangedEvent(user,request,response));
    
    String serverRootUrl = request.getRequestURL().toString();
    serverRootUrl = serverRootUrl.substring(0, serverRootUrl.indexOf("/identity/profile/"));
    
    return restResponseFactory.createUserResponse(user, false, serverRootUrl);
  }
  
  @RequestMapping(value="/identity/profile", method = RequestMethod.PUT, produces = "application/json")
  public UserResponse updateProfile(@RequestBody UserRequest userRequest, HttpServletRequest request) {
    User user = getUserFromRequest(request.getRemoteUser());
    if (userRequest.isEmailChanged()) {
      user.setEmail(userRequest.getEmail());
    }
    if (userRequest.isFirstNameChanged()) {
      user.setFirstName(userRequest.getFirstName());
    }
    if (userRequest.isLastNameChanged()) {
      user.setLastName(userRequest.getLastName());
    }
    
    identityService.saveUser(user);
    
    String serverRootUrl = request.getRequestURL().toString();
    serverRootUrl = serverRootUrl.substring(0, serverRootUrl.indexOf("/identity/profile"));
    
    return restResponseFactory.createUserResponse(user, false, serverRootUrl);
  }
  
}
