/**
 * 
 */
package org.actangular.rest.security;

import java.util.Collections;

import org.activiti.engine.IdentityService;
import org.activiti.engine.identity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

/**
 * @author Bassam Al-Sarori
 *
 */
public class BasicUserDetailsService implements UserDetailsService {

  @Autowired
  protected IdentityService identityService;
  
  @Override
  public UserDetails loadUserByUsername(String userId) throws UsernameNotFoundException {
    User user = identityService.createUserQuery().userId(userId).singleResult();
    if(user == null) throw new UsernameNotFoundException(userId + " not found");
    
    @SuppressWarnings("unchecked")
    org.springframework.security.core.userdetails.User springUser = 
        new org.springframework.security.core.userdetails.User(userId, user.getPassword(), Collections.EMPTY_LIST);
    return springUser;
  }

}
