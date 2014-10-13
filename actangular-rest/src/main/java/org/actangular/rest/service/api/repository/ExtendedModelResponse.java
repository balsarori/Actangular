/**
 * 
 */
package org.actangular.rest.service.api.repository;

import org.activiti.rest.service.api.repository.ModelResponse;

/**
 * @author Bassam Al-Sarori
 *
 */
public class ExtendedModelResponse extends ModelResponse {

  protected String sourceUrl;
  protected String sourceExtraUrl;
  
  public String getSourceUrl() {
    return sourceUrl;
  }
  public void setSourceUrl(String sourceUrl) {
    this.sourceUrl = sourceUrl;
  }
  public String getSourceExtraUrl() {
    return sourceExtraUrl;
  }
  public void setSourceExtraUrl(String sourceExtraUrl) {
    this.sourceExtraUrl = sourceExtraUrl;
  }
  
  
}
