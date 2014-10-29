/**
 * 
 */
package org.actangular.rest.service.api.repository;

import javax.servlet.http.HttpServletResponse;

import org.activiti.engine.ActivitiObjectNotFoundException;
import org.activiti.rest.service.api.repository.BaseModelSourceResource;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Bassam Al-Sarori
 */
@RestController
public class ExtendedModelSourceExtraResource extends BaseModelSourceResource {

  @RequestMapping(value="/repository/models/{modelId}/source-extra.svg", method = RequestMethod.GET)
  protected @ResponseBody byte[] getModelSvg(@PathVariable String modelId, HttpServletResponse response) {
    byte[] editorSource = repositoryService.getModelEditorSourceExtra(modelId);
    if (editorSource == null) {
      throw new ActivitiObjectNotFoundException("Model with id '" + modelId + "' does not have extra source available.", String.class);
    }
    response.setContentType("image/svg+xml");
    return editorSource;
  }
}
