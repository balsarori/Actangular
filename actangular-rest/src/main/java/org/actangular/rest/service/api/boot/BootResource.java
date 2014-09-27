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

import org.activiti.engine.identity.Group;
import org.activiti.engine.identity.User;
import org.activiti.engine.repository.ProcessDefinition;
import org.activiti.rest.common.api.ActivitiUtil;
import org.activiti.rest.common.api.SecuredResource;
import org.activiti.rest.service.api.RestResponseFactory;
import org.activiti.rest.service.api.identity.GroupResponse;
import org.activiti.rest.service.api.identity.UserResponse;
import org.activiti.rest.service.api.repository.ProcessDefinitionResponse;
import org.activiti.rest.service.application.ActivitiRestServicesApplication;
import org.restlet.resource.Get;

/**
 * @author Bassam Al-Sarori
 * 
 */
public class BootResource extends SecuredResource {

  @Get
  public BootResponse getData() {
    if (!authenticate())
      return null;

    BootResponse bootResponse = new BootResponse();

    initUsersData(bootResponse);
    initGroupsData(bootResponse);
    initMemberOfData(bootResponse);
    initProcessDefinitionData(bootResponse);

    return bootResponse;
  }

  protected void initUsersData(BootResponse bootResponse) {
    List<UserResponse> users = new ArrayList<UserResponse>();
    List<User> usersList = ActivitiUtil.getIdentityService().createUserQuery().list();
    for (User user : usersList) {
      users.add(getApplication(ActivitiRestServicesApplication.class).getRestResponseFactory().createUserResponse(this, user, false));
    }

    bootResponse.setUsers(users);
  }

  protected void initGroupsData(BootResponse bootResponse) {
    List<GroupResponse> groups = new ArrayList<GroupResponse>();
    List<Group> groupsList = ActivitiUtil.getIdentityService().createGroupQuery().list();

    for (Group group : groupsList) {
      groups.add(getApplication(ActivitiRestServicesApplication.class).getRestResponseFactory().createGroupResponse(this, group));
    }

    bootResponse.setGroups(groups);
  }

  protected void initMemberOfData(BootResponse bootResponse) {
    List<String> groups = new ArrayList<String>();
    List<Group> groupsList = ActivitiUtil.getIdentityService().createGroupQuery().groupMember(loggedInUser).list();

    for (Group group : groupsList) {
      groups.add(group.getId());
    }

    bootResponse.setMemberOf(groups);
  }

  protected void initProcessDefinitionData(BootResponse bootResponse) {
    List<ProcessDefinition> list = ActivitiUtil.getRepositoryService().createProcessDefinitionQuery().list();
    List<ProcessDefinitionResponse> responseList = new ArrayList<ProcessDefinitionResponse>();
    RestResponseFactory restResponseFactory = getApplication(ActivitiRestServicesApplication.class).getRestResponseFactory();
    for (ProcessDefinition processDefinition : list) {
      responseList.add(restResponseFactory.createProcessDefinitionResponse(this, processDefinition));
    }
    bootResponse.setProcessDefinitions(responseList);
  }

}
