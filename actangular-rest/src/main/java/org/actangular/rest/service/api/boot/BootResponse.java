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

import java.util.List;

import org.activiti.rest.service.api.identity.GroupResponse;
import org.activiti.rest.service.api.identity.UserResponse;
import org.activiti.rest.service.api.repository.ProcessDefinitionResponse;

/**
 * @author Bassam Al-Sarori
 * 
 */
public class BootResponse {

  protected String userId;
  protected List<UserResponse> users;
  protected List<GroupResponse> groups;
  protected List<String> memberOf;
  protected List<ProcessDefinitionResponse> processDefinitions;

  public String getUserId() {
    return userId;
  }
  
  public void setUserId(String userId) {
    this.userId = userId;
  }
  
  public List<UserResponse> getUsers() {
    return users;
  }

  public void setUsers(List<UserResponse> users) {
    this.users = users;
  }

  public List<GroupResponse> getGroups() {
    return groups;
  }

  public void setGroups(List<GroupResponse> groups) {
    this.groups = groups;
  }

  public List<String> getMemberOf() {
    return memberOf;
  }

  public void setMemberOf(List<String> memberOf) {
    this.memberOf = memberOf;
  }

  public List<ProcessDefinitionResponse> getProcessDefinitions() {
    return processDefinitions;
  }

  public void setProcessDefinitions(List<ProcessDefinitionResponse> processDefinitions) {
    this.processDefinitions = processDefinitions;
  }

}
