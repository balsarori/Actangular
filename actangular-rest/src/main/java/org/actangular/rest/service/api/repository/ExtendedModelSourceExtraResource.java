/**
 * 
 */
package org.actangular.rest.service.api.repository;

import java.io.ByteArrayInputStream;

import org.activiti.engine.ActivitiObjectNotFoundException;
import org.activiti.engine.repository.Model;
import org.activiti.rest.common.api.ActivitiUtil;
import org.activiti.rest.service.api.repository.ModelSourceExtraResource;
import org.restlet.data.MediaType;
import org.restlet.representation.InputRepresentation;

/**
 * @author Bassam Al-Sarori
 *
 */
public class ExtendedModelSourceExtraResource extends ModelSourceExtraResource {

  @Override
  protected InputRepresentation getModelStream(Model model) {
    byte[] editorSource = ActivitiUtil.getRepositoryService().getModelEditorSourceExtra(model.getId());
    if(editorSource == null) {
      throw new ActivitiObjectNotFoundException("Model with id '" + model.getId() + "' does not have extra source available.", String.class);
    }
    return new InputRepresentation(new ByteArrayInputStream(editorSource), MediaType.IMAGE_SVG);
  }
}
