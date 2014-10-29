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

package org.actangular.rest.service.api;

import org.actangular.rest.service.api.repository.ExtendedModelResponse;
import org.activiti.engine.RepositoryService;
import org.activiti.engine.impl.persistence.entity.ModelEntity;
import org.activiti.engine.impl.persistence.entity.ProcessDefinitionEntity;
import org.activiti.engine.repository.Model;
import org.activiti.engine.repository.ProcessDefinition;
import org.activiti.rest.service.api.RestResponseFactory;
import org.activiti.rest.service.api.RestUrls;
import org.activiti.rest.service.api.repository.ProcessDefinitionResponse;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * @author Bassam Al-Sarori
 * 
 */
public class ActangularRestResponseFactory extends RestResponseFactory {
  
  @Autowired
  protected RepositoryService repositoryService;

  public ExtendedModelResponse createModelResponse(Model model, String serverRootUrl) {
    ExtendedModelResponse response = new ExtendedModelResponse();
    
    response.setCategory(model.getCategory());
    response.setCreateTime(model.getCreateTime());
    response.setId(model.getId());
    response.setKey(model.getKey());
    response.setLastUpdateTime(model.getLastUpdateTime());
    response.setMetaInfo(model.getMetaInfo());
    response.setName(model.getName());
    response.setDeploymentId(model.getDeploymentId());
    response.setVersion(model.getVersion());
    response.setTenantId(model.getTenantId());
    
    response.setUrl(formatUrl(serverRootUrl, RestUrls.URL_MODEL, model.getId()));
    if(model.getDeploymentId() != null) {
      response.setDeploymentUrl(formatUrl(serverRootUrl, RestUrls.URL_DEPLOYMENT, model.getDeploymentId()));
    }
    
    // TODO
    // submit a patch to Activiti adding isEditorSourceSet and
    // isEditorSourceExtraSet to Model
    
    // for now check from ModelEntity
    
    ModelEntity modelEntity = (ModelEntity) model;
    
    if(modelEntity.getEditorSourceValueId() != null) {
      response.setSourceUrl(formatUrl(serverRootUrl, RestUrls.URL_MODEL_SOURCE, model.getId()));
    }
    
    if(modelEntity.getEditorSourceExtraValueId() != null) {
      response.setSourceExtraUrl(formatUrl(serverRootUrl,RestUrls.URL_MODEL_SOURCE_EXTRA, model.getId()));
    }
    
    return response;
  }
  
  @Override
    public ProcessDefinitionResponse createProcessDefinitionResponse(ProcessDefinition processDefinition, boolean graphicalNotationDefined,
        String serverRootUrl) {
      return super.createProcessDefinitionResponse(processDefinition, ((ProcessDefinitionEntity)repositoryService.getProcessDefinition(processDefinition.getId())).isGraphicalNotationDefined(), serverRootUrl);
    }
}
