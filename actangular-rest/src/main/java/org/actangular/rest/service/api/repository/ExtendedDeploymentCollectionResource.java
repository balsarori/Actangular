/**
 * 
 */
package org.actangular.rest.service.api.repository;

import java.util.List;
import java.util.zip.ZipInputStream;

import org.activiti.engine.ActivitiException;
import org.activiti.engine.ActivitiIllegalArgumentException;
import org.activiti.engine.repository.Deployment;
import org.activiti.engine.repository.DeploymentBuilder;
import org.activiti.rest.common.api.ActivitiUtil;
import org.activiti.rest.service.api.repository.DeploymentCollectionResource;
import org.activiti.rest.service.api.repository.DeploymentResponse;
import org.activiti.rest.service.application.ActivitiRestServicesApplication;
import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.restlet.data.MediaType;
import org.restlet.data.Status;
import org.restlet.ext.fileupload.RestletFileUpload;
import org.restlet.representation.Representation;

/**
 * @author Bassam Al-Sarori
 *
 */
public class ExtendedDeploymentCollectionResource extends DeploymentCollectionResource {

  public DeploymentResponse uploadDeployment(Representation entity) {
    if(!authenticate()) { return null; }
    
    try {

      if(entity == null || entity.getMediaType() == null || !MediaType.MULTIPART_FORM_DATA.isCompatible(entity.getMediaType())) {
        throw new ActivitiIllegalArgumentException("The request should be of type" + MediaType.MULTIPART_FORM_DATA  +".");
      }
      
      RestletFileUpload upload = new RestletFileUpload(new DiskFileItemFactory());
      List<FileItem> items = upload.parseRepresentation(entity);
      
      String tenantId = null;
      String category = null;
      
      FileItem uploadItem = null;
      FileItem diagramUploadItem = null;
      for (FileItem fileItem : items) {
        if(fileItem.isFormField()) {
          if("tenantId".equals(fileItem.getFieldName())) {
            tenantId = fileItem.getString("UTF-8");
          }else if("category".equals(fileItem.getFieldName())) {
            category = fileItem.getString("UTF-8");
          }
        } else if(fileItem.getName() != null) {
          if("diagram".equalsIgnoreCase(fileItem.getFieldName()))
            diagramUploadItem = fileItem;
          else
            uploadItem = fileItem;
        }
      }
      
      if(uploadItem == null) {
        throw new ActivitiIllegalArgumentException("No file content was found in request body.");
      }
      
      DeploymentBuilder deploymentBuilder = ActivitiUtil.getRepositoryService().createDeployment();
      String fileName = uploadItem.getName();
      if (fileName.endsWith(".bpmn20.xml") || fileName.endsWith(".bpmn")) {
        deploymentBuilder.addInputStream(fileName, uploadItem.getInputStream());
        if(diagramUploadItem!=null)
          deploymentBuilder.addInputStream(diagramUploadItem.getName(), diagramUploadItem.getInputStream());
      } else if (fileName.toLowerCase().endsWith(".bar") || fileName.toLowerCase().endsWith(".zip")) {
        deploymentBuilder.addZipInputStream(new ZipInputStream(uploadItem.getInputStream()));
      } else {
        throw new ActivitiIllegalArgumentException("File must be of type .bpmn20.xml, .bpmn, .bar or .zip");
      }
      deploymentBuilder.name(fileName);
      
      if(tenantId != null) {
        deploymentBuilder.tenantId(tenantId);
      }
      
      if(category != null) {
        deploymentBuilder.category(category);
      }
      
      Deployment deployment = deploymentBuilder.deploy();
      
      setStatus(Status.SUCCESS_CREATED);
      
      return getApplication(ActivitiRestServicesApplication.class).getRestResponseFactory()
              .createDeploymentResponse(this, deployment);
      
    } catch (Exception e) {
      if(e instanceof ActivitiException) {
        throw (ActivitiException) e;
      }
      throw new ActivitiException(e.getMessage(), e);
    }
  }
}
