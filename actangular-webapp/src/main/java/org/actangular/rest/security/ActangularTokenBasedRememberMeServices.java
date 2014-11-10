/**
 * 
 */
package org.actangular.rest.security;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.actangular.rest.service.api.identity.PasswordChangedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.rememberme.InvalidCookieException;
import org.springframework.security.web.authentication.rememberme.TokenBasedRememberMeServices;

/**
 * @author Bassam Al-Sarori
 *
 */
public class ActangularTokenBasedRememberMeServices extends TokenBasedRememberMeServices implements ApplicationListener<PasswordChangedEvent>{

  protected static final String REMEMBER_ME_FOR_SESSION = "session";
  protected static final String SESSION_DURATION_INDICATOR = "0";
  protected static final String DEFINED_DURATION_INDICATOR = "1";

  public ActangularTokenBasedRememberMeServices(String key, UserDetailsService userDetailsService) {
    super(key, userDetailsService);
  }

  public void onApplicationEvent(PasswordChangedEvent event) {
    updateCookie(event.getPassword(), event.getRequest(), event.getResponse());
  }

  @Override
  protected boolean rememberMeRequested(HttpServletRequest request, String parameter) {
    return super.rememberMeRequested(request, parameter) || 
        REMEMBER_ME_FOR_SESSION.equalsIgnoreCase(request.getParameter(parameter));
  }

  protected void setCookie(String[] tokens, int maxAge, HttpServletRequest request, HttpServletResponse response) {
    String extendedTokens[] = new String[4]; 
    System.arraycopy(tokens, 0, extendedTokens, 0, 3);
    if(REMEMBER_ME_FOR_SESSION.equalsIgnoreCase(request.getParameter(getParameter()))){
      extendedTokens[3] = SESSION_DURATION_INDICATOR;
      super.setCookie(extendedTokens, -1, request, response);
    }else{
      extendedTokens[3] = DEFINED_DURATION_INDICATOR;
      super.setCookie(extendedTokens, maxAge, request, response);
    }
  }

  @Override
  protected UserDetails processAutoLoginCookie(String[] cookieTokens, HttpServletRequest request, HttpServletResponse response) {
    if(cookieTokens.length > 3){
      String tokens[] = new String[3]; 
      System.arraycopy(cookieTokens, 0, tokens, 0, 3);
      return super.processAutoLoginCookie(tokens, request, response);
    }
    return super.processAutoLoginCookie(cookieTokens, request, response);
  }

  protected void updateCookie(String newPassword, HttpServletRequest request, HttpServletResponse response) {

    String rememberMeCookieValue = extractRememberMeCookie(request);
    
    if (rememberMeCookieValue == null || rememberMeCookieValue.length() == 0) {
      return;
    }
    
    String[] cookieTokens = null;
    long tokenExpiryTime;
    
    try {
      cookieTokens = decodeCookie(rememberMeCookieValue);
      tokenExpiryTime = new Long(cookieTokens[1]).longValue();
    }catch(InvalidCookieException invalidCookie) {
      logger.debug("Invalid remember-me cookie: " + invalidCookie.getMessage());
      return;
    }catch (NumberFormatException nfe) {
      logger.debug("Cookie token[1] did not contain a valid number (contained '" + cookieTokens[1] + "')");
      return;
    }
    
    if(isTokenExpired(tokenExpiryTime)){
      cancelCookie(request, response);
      return;
    }
    
    String cookieDurationToken = SESSION_DURATION_INDICATOR;
    int maxAge = -1;
    
    if(cookieTokens.length > 3){
      cookieDurationToken = cookieTokens[3];
      if(DEFINED_DURATION_INDICATOR.equals(cookieDurationToken))
        maxAge = (int) ((tokenExpiryTime - System.currentTimeMillis()) / 1000);
    }

    String signatureValue = makeTokenSignature(tokenExpiryTime, cookieTokens[0], newPassword);
    super.setCookie(new String[] {cookieTokens[0], Long.toString(tokenExpiryTime), signatureValue, cookieDurationToken}, maxAge, request, response);

  }

}
