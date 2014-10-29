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

package org.actangular.rest.service.api.runtime.task;

import javax.servlet.http.HttpServletResponse;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;


/**
 * @author Bassam Al-Sarori
 */
@RestController
public class TaskAttachmentContentResource extends org.activiti.rest.service.api.runtime.task.TaskAttachmentContentResource {
  
  // Alias for getAttachmentContent() that allows specifying attachment's name in browser
  @RequestMapping(value="/runtime/tasks/{taskId}/attachments/{attachmentId}/content/{attachmentName}", method = RequestMethod.GET, produces="application/json")
  public @ResponseBody byte[] getNamedAttachmentContent(@PathVariable("taskId") String taskId, 
      @PathVariable("attachmentId") String attachmentId, HttpServletResponse response) {
    return getAttachmentContent(taskId, attachmentId, response);
  }
}
