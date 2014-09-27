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
package org.actangular.rest.service.application;

import java.net.URLDecoder;

import org.activiti.rest.common.api.ActivitiUtil;
import org.restlet.Request;
import org.restlet.Response;
import org.restlet.engine.util.Base64;
import org.restlet.security.User;
import org.restlet.security.Verifier;

/**
 * @author Bassam Al-Sarori
 * 
 */
public class DefaultVerifier implements Verifier {

  protected static final String COOKIE_NAME = "actKey";

  public int verify(Request request, Response response) {
    // check whether a challenge response exists i.e an Authorization header was
    // set
    if (request.getChallengeResponse() != null) {
      String identifier = request.getChallengeResponse().getIdentifier();
      if (authenticate(identifier, new String(request.getChallengeResponse().getSecret()), request))
        return RESULT_VALID;

      return RESULT_INVALID;
    }

    // check cookie
    return validateCookie(request, response);
  }

  protected int validateCookie(Request request, Response response) {
    String authorization = request.getCookies().getValues(COOKIE_NAME);
    if (authorization == null)
      return RESULT_MISSING;

    // cookie value is something like
    // Basic%20a2VybWl0Omtlcm1pdA%3D%3D
    if (authorization.length() > 6)
      try {
        authorization = URLDecoder.decode(authorization, "UTF-8");
        String base64Credentials = authorization.substring(6).trim();
        String credentials = new String(Base64.decode(base64Credentials), "UTF-8");
        final String[] values = credentials.split(":", 2);
        if (values.length == 2 && authenticate(values[0], values[1], request))
          return RESULT_VALID;

      } catch (Exception e) {
        // ignore
      }
    return RESULT_INVALID;
  }

  protected boolean authenticate(String identifier, String secret, Request request) {
    if (ActivitiUtil.getIdentityService().checkPassword(identifier, secret)) {
      request.getClientInfo().setUser(new User(identifier));
      return true;
    }
    return false;
  }

}
