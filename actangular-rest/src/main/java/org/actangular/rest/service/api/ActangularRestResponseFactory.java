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

import java.util.Date;
import java.util.Map;

import org.actangular.rest.service.api.identity.ExtendedUserResponse;
import org.activiti.engine.form.AbstractFormType;
import org.activiti.engine.form.FormData;
import org.activiti.engine.form.FormProperty;
import org.activiti.engine.form.StartFormData;
import org.activiti.engine.form.TaskFormData;
import org.activiti.engine.identity.User;
import org.activiti.engine.impl.persistence.entity.UserEntity;
import org.activiti.rest.common.api.SecuredResource;
import org.activiti.rest.service.api.RestResponseFactory;
import org.activiti.rest.service.api.RestUrls;
import org.activiti.rest.service.api.form.FormDataResponse;
import org.activiti.rest.service.api.form.RestEnumFormProperty;
import org.activiti.rest.service.api.form.RestFormProperty;
import org.activiti.rest.service.api.identity.UserResponse;

import com.fasterxml.jackson.databind.util.ISO8601DateFormat;

/**
 * @author Bassam Al-Sarori
 * 
 */
public class ActangularRestResponseFactory extends RestResponseFactory {

  public FormDataResponse createFormDataResponse(SecuredResource securedResource, FormData formData) {
    FormDataResponse result = new FormDataResponse();
    result.setDeploymentId(formData.getDeploymentId());
    result.setFormKey(formData.getFormKey());
    if (formData.getFormProperties() != null) {
      for (FormProperty formProp : formData.getFormProperties()) {
        RestFormProperty restFormProp = new RestFormProperty();
        restFormProp.setId(formProp.getId());
        restFormProp.setName(formProp.getName());
        if (formProp.getType() != null) {
          restFormProp.setType(formProp.getType().getName());
        }
        restFormProp.setValue(formProp.getValue());
        restFormProp.setReadable(formProp.isReadable());
        restFormProp.setRequired(formProp.isRequired());
        restFormProp.setWritable(formProp.isWritable());
        if ("enum".equals(restFormProp.getType())) {
          Object values = formProp.getType().getInformation("values");
          if (values != null) {
            @SuppressWarnings("unchecked")
            Map<String, String> enumValues = (Map<String, String>) values;
            for (String enumId : enumValues.keySet()) {
              RestEnumFormProperty enumProperty = new RestEnumFormProperty();
              enumProperty.setId(enumId);
              enumProperty.setName(enumValues.get(enumId));
              restFormProp.addEnumValue(enumProperty);
            }
          }
        } else if ("date".equals(restFormProp.getType())) {
          restFormProp.setDatePattern((String) formProp.getType().getInformation("datePattern"));

          // convert date to iso format
          if (formProp.getValue() != null && formProp.getType() instanceof AbstractFormType) {
            ISO8601DateFormat isoFormatter = new ISO8601DateFormat();
            Date date = (Date) ((AbstractFormType) formProp.getType()).convertFormValueToModelValue(formProp.getValue());
            restFormProp.setValue(isoFormatter.format(date));
          }

        }
        // TODO
        // may need especial handling for long and boolean

        result.addFormProperty(restFormProp);
      }
    }
    if (formData instanceof StartFormData) {
      StartFormData startFormData = (StartFormData) formData;
      if (startFormData.getProcessDefinition() != null) {
        result.setProcessDefinitionId(startFormData.getProcessDefinition().getId());
        result.setProcessDefinitionUrl(securedResource.createFullResourceUrl(RestUrls.URL_PROCESS_DEFINITION, startFormData
            .getProcessDefinition().getId()));
      }
    } else if (formData instanceof TaskFormData) {
      TaskFormData taskFormData = (TaskFormData) formData;
      if (taskFormData.getTask() != null) {
        result.setTaskId(taskFormData.getTask().getId());
        result.setTaskUrl(securedResource.createFullResourceUrl(RestUrls.URL_TASK, taskFormData.getTask().getId()));
      }
    }
    return result;
  }

  public UserResponse createUserResponse(SecuredResource securedResource, User user, boolean incudePassword) {
    ExtendedUserResponse response = new ExtendedUserResponse();
    response.setFirstName(user.getFirstName());
    response.setLastName(user.getLastName());
    response.setId(user.getId());
    response.setEmail(user.getEmail());
    response.setUrl(securedResource.createFullResourceUrl(RestUrls.URL_USER, user.getId()));

    if (incudePassword) {
      response.setPassword(user.getPassword());
    }
    // TODO
    // submit a patch to Activiti adding isPictureSet in User

    // for now check the pictureByteArrayId in persistent state
    UserEntity userEntity = (UserEntity) user;
    Map<String, Object> propertiesMap = (Map<String, Object>) userEntity.getPersistentState();
    if (propertiesMap.get("pictureByteArrayId") != null) {
      response.setPictureUrl(securedResource.createFullResourceUrl(RestUrls.URL_USER_PICTURE, user.getId()));
    }
    return response;
  }
}
