package org.actangular.rest.conf;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.actangular.rest.security.AuthenticationCredentialsFilter;
import org.actangular.rest.security.BasicAuthenticationProvider;
import org.actangular.rest.security.BasicUserDetailsService;
import org.actangular.rest.security.CustomBasicAuthenticationFilter;
import org.actangular.rest.security.CustomTokenBasedRememberMeServices;
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
import org.springframework.security.web.authentication.rememberme.RememberMeAuthenticationFilter;
import org.springframework.security.web.authentication.rememberme.TokenBasedRememberMeServices;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

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
  
  protected RememberMeAuthenticationFilter rememberMeAuthenticationFilter(AuthenticationManager authenticationManager, RememberMeServices rememberMeServices) {
    return new RememberMeAuthenticationFilter(authenticationManager, rememberMeServices);
  }
  
  protected BasicAuthenticationFilter basicAuthenticationFilter(AuthenticationManager authenticationManager,AuthenticationEntryPoint authenticationEntryPoint, RememberMeServices rememberMeServices) {
    return new CustomBasicAuthenticationFilter(authenticationManager, authenticationEntryPoint, rememberMeServices);
  }
  
  protected AuthenticationCredentialsFilter authenticationCredentialsFilter(AuthenticationEntryPoint authenticationEntryPoint) {
    return new AuthenticationCredentialsFilter(authenticationEntryPoint);
  }
  
  protected AuthenticationEntryPoint defaultAuthenticationEntryPoint(){
    return new DefaultAuthenticationEntryPoint();
  }

  @Override
  protected void configure(HttpSecurity http) throws Exception {
    String rememberMeCookieName = environment.getProperty("act.rememberMe.cookieName", "actSecKey");
    TokenBasedRememberMeServices rememberMeServices = rememberMeServices(environment.getProperty("act.rememberMe.key", "actKey"), userDetailsService());
    rememberMeServices.setCookieName(rememberMeCookieName);
    AuthenticationEntryPoint defaultAuthenticationEntryPoint = defaultAuthenticationEntryPoint();
    http
      .addFilter(basicAuthenticationFilter(authenticationManagerBean(),defaultAuthenticationEntryPoint, rememberMeServices))
      .addFilter(rememberMeAuthenticationFilter(authenticationManagerBean(), rememberMeServices))
      .addFilterAfter(authenticationCredentialsFilter(defaultAuthenticationEntryPoint), RememberMeAuthenticationFilter.class)
      .authenticationProvider(authenticationProvider())
      .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS).and()
      .csrf().disable()
      .authorizeRequests()
        .anyRequest().authenticated()
        .and()
      .httpBasic().disable()
      .logout().logoutUrl("/service/logout").deleteCookies(rememberMeCookieName)
      .logoutSuccessHandler(logoutSuccessHandler());
  }
  
  @Override
  @Bean
  protected UserDetailsService userDetailsService() {
    return new BasicUserDetailsService();
  }
  
  protected TokenBasedRememberMeServices rememberMeServices(String key, UserDetailsService userDetailsService){
    CustomTokenBasedRememberMeServices tokenBasedRememberMeServices = new CustomTokenBasedRememberMeServices(key, userDetailsService);
    tokenBasedRememberMeServices.setParameter("remember_me");
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
