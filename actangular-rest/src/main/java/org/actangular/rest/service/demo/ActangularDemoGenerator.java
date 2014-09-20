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
package org.actangular.rest.service.demo;

import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Random;

import org.activiti.engine.identity.User;
import org.activiti.engine.impl.identity.Authentication;
import org.activiti.engine.repository.Deployment;
import org.activiti.engine.task.Task;
import org.activiti.rest.service.demo.DemoDataGenerator;

/**
 * @author Bassam Al-Sarori
 *
 */
public class ActangularDemoGenerator extends DemoDataGenerator {


	protected int demoTasksPerUser = 30;
	protected Random randomGenerator = new Random();
	  protected static final long MILLIS_IN_DAY = 86400000;
	  protected boolean createDemoTasks;
	  
	  
	  public int getDemoTasksPerUser() {
		return demoTasksPerUser;
	}
	public void setDemoTasksPerUser(int demoTasksPerUser) {
		this.demoTasksPerUser = demoTasksPerUser;
	}
	public boolean isCreateDemoTasks() {
		return createDemoTasks;
	}
	public void setCreateDemoTasks(boolean createDemoTasks) {
		this.createDemoTasks = createDemoTasks;
	}
	@Override
	public void init() {
		super.init();
		if(createDemoTasks){
			LOGGER.info("Initializing demo tasks");
			createDemoTasks();
		}
	}
	  protected void initDemoUsers() {
		    createUser("kermit", "Kermit", "The Frog", "kermit", "kermit@activiti.org", 
		    		"org/activiti/rest/images/kermit.jpg",
		            Arrays.asList("management", "sales", "marketing", "engineering", "user", "admin"),
		            Arrays.asList("birthDate", "10-10-1955", "jobTitle", "Muppet", "location", "Hollywoord",
		                          "phone", "+123456789", "twitterName", "alfresco", "skype", "activiti_kermit_frog"));
		    
		    createUser("gonzo", "Gonzo", "The Great", "gonzo", "gonzo@activiti.org", 
		    		"org/activiti/rest/images/gonzo.jpg",
		            Arrays.asList("management", "sales", "marketing", "user"),
		            null);
		    createUser("fozzie", "Fozzie", "Bear", "fozzie", "fozzie@activiti.org", 
		    		"org/activiti/rest/images/fozzie.jpg",
		            Arrays.asList("marketing", "engineering", "user"),
		            null);
		  }
	  
	  protected void createDemoTasks() {
			
		  
		  int userCount = (int) identityService.createUserQuery().count();
		  List<User> users = identityService.createUserQuery().list();
		  int priorities[] = new int[] {0, 50, 100};
		  String cats[] = new String[] {"Demo", "Sample", "Example", null};
		  String involvement[] = new String[] {"involved", "candidate"};
		  
		  
		  
		  //create random tasks 
		  for(User user: users){
			  
			  Authentication.setAuthenticatedUserId(user.getId());
			  
			  //assign tasks to user
			  for(int i = 0; i<demoTasksPerUser ; i++){
				  
				  Task task = createTask(user.getId() + " assigned Task "+(i+1), users.get(randomGenerator.nextInt(userCount)).getId(),
						  user.getId(), priorities[randomGenerator.nextInt(priorities.length)], cats[randomGenerator.nextInt(cats.length)]);
				  
				  taskService.addUserIdentityLink(task.getId(), users.get(randomGenerator.nextInt(userCount)).getId(),
						  involvement[randomGenerator.nextInt(involvement.length)]);
				 
				 
				  if(i%10==0){
					//create tasks for user
					  createTask(user.getId() + " owned Task "+(i+1), user.getId(), 
							  users.get(randomGenerator.nextInt(userCount)).getId(), priorities[randomGenerator.nextInt(priorities.length)],
							  cats[randomGenerator.nextInt(cats.length)]);
				  }
			  }
			  
			  //unassigned
			  for(int i = 0; i<3 ; i++){
				  Task task = createTask(user.getId() + " unassigned Task "+(i+1), 
						  users.get(randomGenerator.nextInt(userCount)).getId(), null,
						  priorities[randomGenerator.nextInt(priorities.length)], cats[randomGenerator.nextInt(cats.length)]);
				  taskService.addCandidateUser(task.getId(), users.get(randomGenerator.nextInt(userCount)).getId());
				  }
		  }
		  Authentication.setAuthenticatedUserId(null);
	  }
	  
	  protected Task createTask(String name, String owner, String assignee, int priority, String category){
		  Task task = taskService.newTask();
		  task.setName(name);
		  task.setDescription(name);
		  task.setOwner(owner);
		  task.setAssignee(assignee);
		  task.setDueDate(new Date(System.currentTimeMillis()+(MILLIS_IN_DAY*randomGenerator.nextInt(14))));
		  task.setPriority(priority);
		  task.setCategory(category);
		  taskService.saveTask(task);
		  return task;
	  }
	  
	  protected void initDemoProcessDefinitions() {
		    
		    String deploymentName = "Demo processes";
		    List<Deployment> deploymentList = repositoryService.createDeploymentQuery().deploymentName(deploymentName).list();
		    
		    if (deploymentList == null || deploymentList.size() == 0) {
		      repositoryService.createDeployment()
		        .name(deploymentName)
		        .addClasspathResource("createTimersProcess.bpmn20.xml")
		        //.addClasspathResource("oneTaskProcess.bpmn20.xml")
		        .addClasspathResource("VacationRequest.bpmn20.xml")
		        .addClasspathResource("VacationRequest.svg")
		        .addClasspathResource("SimpleProcess.bpmn20.xml")
		        .addClasspathResource("SimpleProcess.svg")
		        //.addClasspathResource("FixSystemFailureProcess.bpmn20.xml")
		       // .addClasspathResource("FixSystemFailureProcess.png")
		        .addClasspathResource("Helpdesk.bpmn20.xml")
		        .addClasspathResource("Helpdesk.png")
		        .addClasspathResource("reviewSalesLead.bpmn20.xml")
		        .deploy();
		    }
		  }
}
