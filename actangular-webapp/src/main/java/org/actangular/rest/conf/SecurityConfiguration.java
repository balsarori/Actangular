package org.actangular.rest.conf;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.actangular.rest.security.ActangularAuthenticationFilter;
import org.actangular.rest.security.ActangularTokenBasedRememberMeServices;
import org.actangular.rest.security.BasicAuthenticationProvider;
import org.actangular.rest.security.BasicUserDetailsService;
import org.actangular.rest.security.DefaultAuthenticationEntryPoint;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.config.annotation.web.servlet.configuration.EnableWebMvcSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.authentication.RememberMeServices;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.security.web.authentication.rememberme.TokenBasedRememberMeServices;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@Configuration
@EnableWebSecurity
@EnableWebMvcSecurity
public class SecurityConfiguration extends WebSecurityConfigurerAdapter {
  
  @Autowired
  protected Environment environment;
  
  @Bean
  public AuthenticationProvider authenticationProvider() {
    return new BasicAuthenticationProvider();
  }
  
  protected ActangularAuthenticationFilter actangularAuthenticationFilter(AuthenticationManager authenticationManager,AuthenticationEntryPoint authenticationEntryPoint, RememberMeServices rememberMeServices) {
    ActangularAuthenticationFilter actangularAuthenticationFilter = new ActangularAuthenticationFilter(authenticationManager, authenticationEntryPoint, rememberMeServices);
    actangularAuthenticationFilter.setRequestMatcher(new AntPathRequestMatcher("/service/boot", "POST"));
    return actangularAuthenticationFilter;
  }
  
  @Bean
  protected AuthenticationEntryPoint defaultAuthenticationEntryPoint(){
    return new DefaultAuthenticationEntryPoint();
  }

  @Override
  protected void configure(HttpSecurity http) throws Exception {
    TokenBasedRememberMeServices rememberMeServices = rememberMeServices(userDetailsServiceBean());
    AuthenticationEntryPoint defaultAuthenticationEntryPoint = defaultAuthenticationEntryPoint();
    http
      .addFilterAfter(actangularAuthenticationFilter(authenticationManagerBean(),defaultAuthenticationEntryPoint,rememberMeServices), BasicAuthenticationFilter.class)
      .authenticationProvider(authenticationProvider())
      .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS).and()
      .csrf().disable()
      .authorizeRequests()
        .anyRequest().authenticated()
        .and()
      .httpBasic().and()
      .rememberMe().rememberMeServices(rememberMeServices).and()
      .exceptionHandling().authenticationEntryPoint(defaultAuthenticationEntryPoint).and()
      .logout().logoutUrl("/service/logout")
      .logoutSuccessHandler(logoutSuccessHandler());
  }
  
  @Override
  @Bean
  protected UserDetailsService userDetailsService() {
    return new BasicUserDetailsService();
  }
  @Bean
  protected TokenBasedRememberMeServices rememberMeServices(UserDetailsService userDetailsService){
    String key = environment.getProperty("act.rememberMe.key", "actKey");
    ActangularTokenBasedRememberMeServices tokenBasedRememberMeServices = new ActangularTokenBasedRememberMeServices(key, userDetailsService);
    tokenBasedRememberMeServices.setParameter(environment.getProperty("act.rememberMe.param", "remember_me"));
    tokenBasedRememberMeServices.setCookieName(environment.getProperty("act.rememberMe.cookieName", "actSecKey"));
    return tokenBasedRememberMeServices;
  }
  
  protected LogoutSuccessHandler logoutSuccessHandler() {
    return new LogoutSuccessHandler() {
      
      @Override
      public void onLogoutSuccess(HttpServletRequest request, HttpServletResponse response, Authentication auth) throws IOException, ServletException {
        // Do nothing
      }
    };
  }
}
