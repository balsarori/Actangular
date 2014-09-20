/**
 * 
 */
package org.actangular.rest.service.api.identity;

import org.activiti.rest.service.api.identity.UserResponse;

/**
 * @author Bassam Al-Sarori
 *
 */

public class ExtendedUserResponse extends UserResponse {

	protected String pictureUrl;

	public String getPictureUrl() {
		return pictureUrl;
	}

	public void setPictureUrl(String pictureUrl) {
		this.pictureUrl = pictureUrl;
	}
	
	
}
