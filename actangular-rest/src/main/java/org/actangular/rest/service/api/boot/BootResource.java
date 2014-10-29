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

package org.actangular.rest.service.api.boot;

import java.util.ArrayList;
import java.util.List;

import javax.servlet.http.HttpServletRequest;

import org.activiti.engine.IdentityService;
import org.activiti.engine.RepositoryService;
import org.activiti.engine.identity.Group;
import org.activiti.engine.identity.User;
import org.activiti.engine.impl.persistence.entity.ProcessDefinitionEntity;
import org.activiti.engine.repository.ProcessDefinition;
import org.activiti.rest.service.api.RestResponseFactory;
import org.activiti.rest.service.api.identity.GroupResponse;
import org.activiti.rest.service.api.identity.UserResponse;
import org.activiti.rest.service.api.repository.ProcessDefinitionResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Bassam Al-Sarori
 * 
 */
@RestController
public class BootResource {

  @Autowired
  protected RestResponseFactory restResponseFactory;
  
  @Autowired
  protected IdentityService identityService;
  
  @Autowired
  protected RepositoryService repositoryService;
  
  @RequestMapping(value="/boot", method = RequestMethod.POST, produces="application/json")
  public BootResponse getData(HttpServletRequest request) {

    String serverRootUrl = request.getRequestURL().toString();
    serverRootUrl = serverRootUrl.substring(0, serverRootUrl.indexOf("/boot"));
    BootResponse bootResponse = new BootResponse();

    initUsersData(bootResponse, serverRootUrl);
    initGroupsData(bootResponse, serverRootUrl);
    initMemberOfData(bootResponse, request.getRemoteUser());
    initProcessDefinitionData(bootResponse, serverRootUrl);

    return bootResponse;
  }

  protected void initUsersData(BootResponse bootResponse, String serverRootUrl) {
    List<UserResponse> users = new ArrayList<UserResponse>();
    List<User> usersList = identityService.createUserQuery().list();
    for (User user : usersList) {
      users.add(restResponseFactory.createUserResponse(user, false, serverRootUrl));
    }

    bootResponse.setUsers(users);
  }

  protected void initGroupsData(BootResponse bootResponse, String serverRootUrl) {
    List<GroupResponse> groups = new ArrayList<GroupResponse>();
    List<Group> groupsList = identityService.createGroupQuery().list();

    for (Group group : groupsList) {
      groups.add(restResponseFactory.createGroupResponse(group, serverRootUrl));
    }

    bootResponse.setGroups(groups);
  }

  protected void initMemberOfData(BootResponse bootResponse, String loggedInUser) {
    bootResponse.setUserId(loggedInUser);
    List<String> groups = new ArrayList<String>();
    List<Group> groupsList = identityService.createGroupQuery().groupMember(loggedInUser).list();

    for (Group group : groupsList) {
      groups.add(group.getId());
    }

    bootResponse.setMemberOf(groups);
  }

  protected void initProcessDefinitionData(BootResponse bootResponse, String serverRootUrl) {
    List<ProcessDefinition> list = repositoryService.createProcessDefinitionQuery().list();
    List<ProcessDefinitionResponse> responseList = new ArrayList<ProcessDefinitionResponse>();
    for (ProcessDefinition processDefinition : list) {
      responseList.add(restResponseFactory.createProcessDefinitionResponse(processDefinition,((ProcessDefinitionEntity) processDefinition).isGraphicalNotationDefined(), serverRootUrl));
    }
    bootResponse.setProcessDefinitions(responseList);
  }

}
