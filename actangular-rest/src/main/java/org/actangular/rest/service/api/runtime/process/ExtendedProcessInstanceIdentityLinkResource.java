/**
 * 
 */
package org.actangular.rest.service.api.runtime.process;

import org.activiti.engine.runtime.ProcessInstance;
import org.activiti.rest.common.api.ActivitiUtil;
import org.activiti.rest.service.api.runtime.process.ProcessInstanceIdentityLinkResource;
import org.restlet.data.Status;
import org.restlet.resource.Delete;

/**
 * @author Bassam Al-Sarori
 * 
 */
public class ExtendedProcessInstanceIdentityLinkResource extends ProcessInstanceIdentityLinkResource {

  @Delete
  public void deleteIdentityLink() {
    if (!authenticate())
      return;

    ProcessInstance processInstance = getProcessInstanceFromRequest();

    // Extract and validate identity link from URL
    String identityId = getAttribute("identityId");
    String type = getAttribute("type");
    validateIdentityLinkArguments(identityId, type);

    getIdentityLink(identityId, type, processInstance.getId());

    ActivitiUtil.getRuntimeService().deleteUserIdentityLink(processInstance.getId(), identityId, type);

    setStatus(Status.SUCCESS_NO_CONTENT);
  }
}
