/**
 * 
 */
package org.actangular.rest.service.api.repository;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import org.activiti.engine.ActivitiException;
import org.activiti.engine.ActivitiIllegalArgumentException;
import org.activiti.engine.repository.Model;
import org.activiti.rest.common.api.ActivitiUtil;
import org.activiti.rest.service.api.repository.BaseModelResource;
import org.activiti.rest.service.api.repository.ModelResponse;
import org.activiti.rest.service.application.ActivitiRestServicesApplication;
import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.FileUploadException;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.io.IOUtils;
import org.restlet.data.MediaType;
import org.restlet.data.Status;
import org.restlet.ext.fileupload.RestletFileUpload;
import org.restlet.representation.Representation;
import org.restlet.resource.Put;
import org.restlet.resource.ResourceException;

/**
 * @author Bassam Al-Sarori
 *
 */
public class ModelSourcesResource extends BaseModelResource {

  @Put
  public ModelResponse setModelSources(Representation representation) {
    if (authenticate() == false)
      return null;
    
    Model model = getModelFromRequest();
    
    if(!MediaType.MULTIPART_FORM_DATA.isCompatible(representation.getMediaType())) {
      throw new ResourceException(Status.CLIENT_ERROR_UNSUPPORTED_MEDIA_TYPE.getCode(), "The request should be of type 'multipart/form-data'.", null, null);
    }
    
    RestletFileUpload upload = new RestletFileUpload(new DiskFileItemFactory());
    try {
      FileItem jsonUploadItem = null;
      FileItem svgUploadItem = null;
      List<FileItem> items = upload.parseRepresentation(representation);
      for (FileItem fileItem : items) {
        if("json".equalsIgnoreCase(fileItem.getFieldName()))
          jsonUploadItem = fileItem;
        else if("svg".equalsIgnoreCase(fileItem.getFieldName()))
          svgUploadItem = fileItem;
      }
      if(jsonUploadItem == null && svgUploadItem == null) {
        throw new ActivitiIllegalArgumentException("No file content was found in request body.");
      }
      
      if(jsonUploadItem!=null){
        ActivitiUtil.getRepositoryService().addModelEditorSource(model.getId(), getBytes(jsonUploadItem));
      }
      if(svgUploadItem!=null){
        ActivitiUtil.getRepositoryService().addModelEditorSourceExtra(model.getId(), getBytes(svgUploadItem));
      }
      return getApplication(ActivitiRestServicesApplication.class).getRestResponseFactory()
          .createModelResponse(this, model);
     
    } catch (FileUploadException e) {
      throw new ActivitiException("Error with uploaded file: " + e.getMessage(), e);
    } catch (IOException e) {
      throw new ActivitiException("Error while reading uploaded file: " + e.getMessage(), e);
    }
  }
  
  protected byte[] getBytes(FileItem uploadItem) throws IOException{
    int size = ((Long) uploadItem.getSize()).intValue();
    
    // Copy file-body in a bytearray as the engine requires this
    ByteArrayOutputStream bytesOutput = new ByteArrayOutputStream(size);
    IOUtils.copy(uploadItem.getInputStream(), bytesOutput);
   
    return bytesOutput.toByteArray();
  }

}
