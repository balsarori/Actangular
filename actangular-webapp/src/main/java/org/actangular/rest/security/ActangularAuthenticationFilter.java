/**
 * 
 */
package org.actangular.rest.security;

import java.io.IOException;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationDetailsSource;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.codec.Base64;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.authentication.NullRememberMeServices;
import org.springframework.security.web.authentication.RememberMeServices;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.util.Assert;
import org.springframework.web.filter.GenericFilterBean;

/**
 * @author Bassam Al-Sarori
 *
 */
public class ActangularAuthenticationFilter extends GenericFilterBean {

  protected AuthenticationDetailsSource<HttpServletRequest,?> authenticationDetailsSource = new WebAuthenticationDetailsSource();
  protected boolean ignoreFailure = false;
  protected String credentialsCharset = "UTF-8";
  protected AuthenticationManager authenticationManager;
  protected AuthenticationEntryPoint authenticationEntryPoint;
  protected RememberMeServices rememberMeServices = new NullRememberMeServices();
  protected String authTokenName = "authToken";
  protected RequestMatcher requestMatcher;
  
  public ActangularAuthenticationFilter(AuthenticationManager authenticationManager, AuthenticationEntryPoint authenticationEntryPoint, RememberMeServices rememberMeServices) {
    this.authenticationManager = authenticationManager;
    this.authenticationEntryPoint = authenticationEntryPoint;
    this.rememberMeServices = rememberMeServices;
  }

  public ActangularAuthenticationFilter(AuthenticationManager authenticationManager, RememberMeServices rememberMeServices) {
    this.authenticationManager = authenticationManager;
    this.rememberMeServices = rememberMeServices;
    this.ignoreFailure = true;
  }

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    final boolean debug = logger.isDebugEnabled();
    final HttpServletRequest request = (HttpServletRequest) req;
    final HttpServletResponse response = (HttpServletResponse) res;
    
    if(!requestMatches(request)){
      chain.doFilter(request, response);
      return;
    }

    String authToken = extractAuthenticationToken(request);

    if (authToken == null || !authToken.startsWith("Basic ")) {
      chain.doFilter(request, response);
      return;
    }

    try {
      String[] tokens = extractUserIdAndPassword(authToken, request);
      assert tokens.length == 2;

      String username = tokens[0];

      if (debug) {
        logger.debug("Basic Authentication token found for user '" + username + "'");
      }

      if (authenticationIsRequired(username)) {
        UsernamePasswordAuthenticationToken authRequest =
            new UsernamePasswordAuthenticationToken(username, tokens[1]);
        authRequest.setDetails(authenticationDetailsSource.buildDetails(request));
        Authentication authResult = authenticationManager.authenticate(authRequest);

        if (debug) {
          logger.debug("Authentication success: " + authResult);
        }

        SecurityContextHolder.getContext().setAuthentication(authResult);

        rememberMeServices.loginSuccess(request, response, authResult);

        onSuccessfulAuthentication(request, response, authResult);
      }

    } catch (AuthenticationException failed) {
      SecurityContextHolder.clearContext();

      if (debug) {
        logger.debug("Authentication request for failed: " + failed);
      }

      rememberMeServices.loginFail(request, response);

      onUnsuccessfulAuthentication(request, response, failed);

      if (ignoreFailure) {
        chain.doFilter(request, response);
      } else {
        authenticationEntryPoint.commence(request, response, failed);
      }

      return;
    }

    chain.doFilter(request, response);
  }

  protected String[] extractUserIdAndPassword(String authToken, HttpServletRequest request) throws IOException {

    byte[] base64Token = authToken.substring(6).getBytes("UTF-8");
    byte[] decoded;
    try {
      decoded = Base64.decode(base64Token);
    } catch (IllegalArgumentException e) {
      throw new BadCredentialsException("Failed to decode basic authentication token");
    }

    String token = new String(decoded, getCredentialsCharset(request));

    int delim = token.indexOf(":");

    if (delim == -1) {
      throw new BadCredentialsException("Invalid basic authentication token");
    }
    return new String[] {token.substring(0, delim), token.substring(delim + 1)};
  }

  protected boolean authenticationIsRequired(String username) {
    // Only reauthenticate if username doesn't match SecurityContextHolder and user isn't authenticated
    // (see SEC-53)
    Authentication existingAuth = SecurityContextHolder.getContext().getAuthentication();

    if(existingAuth == null || !existingAuth.isAuthenticated()) {
      return true;
    }

    // Limit username comparison to providers which use usernames (ie UsernamePasswordAuthenticationToken)
    // (see SEC-348)

    if (existingAuth instanceof UsernamePasswordAuthenticationToken && !existingAuth.getName().equals(username)) {
      return true;
    }

    // Handle unusual condition where an AnonymousAuthenticationToken is already present
    // This shouldn't happen very often, as BasicProcessingFitler is meant to be earlier in the filter
    // chain than AnonymousAuthenticationFilter. Nevertheless, presence of both an AnonymousAuthenticationToken
    // together with a BASIC authentication request header should indicate reauthentication using the
    // BASIC protocol is desirable. This behaviour is also consistent with that provided by form and digest,
    // both of which force re-authentication if the respective header is detected (and in doing so replace
    // any existing AnonymousAuthenticationToken). See SEC-610.
    if (existingAuth instanceof AnonymousAuthenticationToken) {
      return true;
    }

    return false;
  }

  protected void onSuccessfulAuthentication(HttpServletRequest request, HttpServletResponse response,
      Authentication authResult) throws IOException {
  }

  protected void onUnsuccessfulAuthentication(HttpServletRequest request, HttpServletResponse response,
      AuthenticationException failed) throws IOException {
  }

  protected String getCredentialsCharset(HttpServletRequest httpRequest) {
    return credentialsCharset;
  }
  
  protected boolean requestMatches(HttpServletRequest request) {
    if(requestMatcher == null) return true;
    return requestMatcher.matches(request);
  }
  
  protected String extractAuthenticationToken(HttpServletRequest request){
    return request.getParameter(authTokenName);
  }
  
  public void setAuthenticationTokenName(String authTokenName) {
    this.authTokenName = authTokenName;
  }
  
  public void setRequestMatcher(RequestMatcher requestMatcher) {
    Assert.notNull(requestMatcher, "requestMatcher cannot be null");
    this.requestMatcher = requestMatcher;
}
}
