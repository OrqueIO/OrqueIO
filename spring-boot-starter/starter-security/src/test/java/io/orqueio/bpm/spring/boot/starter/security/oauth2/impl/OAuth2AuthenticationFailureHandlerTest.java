/*
 * Copyright 2026 OrqueIO (https://www.orqueio.io/).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.orqueio.bpm.spring.boot.starter.security.oauth2.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.web.RedirectStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

public class OAuth2AuthenticationFailureHandlerTest {

  private OAuth2AuthenticationFailureHandler handler;
  private HttpServletRequest request;
  private HttpServletResponse response;
  private RedirectStrategy redirectStrategy;

  @Before
  public void setUp() {
    handler = new OAuth2AuthenticationFailureHandler("/login?oauth2_error=true");
    request = mock(HttpServletRequest.class);
    response = mock(HttpServletResponse.class);
    redirectStrategy = mock(RedirectStrategy.class);
    handler.setRedirectStrategy(redirectStrategy);

    // Clear security context before each test
    SecurityContextHolder.clearContext();
  }

  @After
  public void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  public void shouldRedirectToDefaultUrlWhenUserAlreadyAuthenticatedInSession() throws Exception {
    // given
    HttpSession session = mock(HttpSession.class);
    SecurityContext securityContext = mock(SecurityContext.class);
    Authentication authentication = mock(Authentication.class);

    when(request.getSession(false)).thenReturn(session);
    when(session.getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY))
        .thenReturn(securityContext);
    when(securityContext.getAuthentication()).thenReturn(authentication);
    when(authentication.isAuthenticated()).thenReturn(true);
    when(authentication.getPrincipal()).thenReturn("testUser");
    when(authentication.getName()).thenReturn("testUser");

    OAuth2AuthenticationException exception = new OAuth2AuthenticationException(
        new OAuth2Error("temporarily_unavailable", "Authentication expired", null));

    // when
    handler.onAuthenticationFailure(request, response, exception);

    // then - should redirect to default URL without error parameter
    verify(redirectStrategy).sendRedirect(request, response, "/login");
  }

  @Test
  public void shouldRedirectToDefaultUrlWhenUserAlreadyAuthenticatedInSecurityContext() throws Exception {
    // given
    when(request.getSession(false)).thenReturn(null);

    Authentication authentication = mock(Authentication.class);
    when(authentication.isAuthenticated()).thenReturn(true);
    when(authentication.getPrincipal()).thenReturn("testUser");
    when(authentication.getName()).thenReturn("testUser");

    SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
    securityContext.setAuthentication(authentication);
    SecurityContextHolder.setContext(securityContext);

    OAuth2AuthenticationException exception = new OAuth2AuthenticationException(
        new OAuth2Error("temporarily_unavailable", "Authentication expired", null));

    // when
    handler.onAuthenticationFailure(request, response, exception);

    // then - should redirect to default URL without error parameter
    verify(redirectStrategy).sendRedirect(request, response, "/login");
  }

  @Test
  public void shouldNotIgnoreErrorWhenUserIsAnonymous() throws Exception {
    // given
    HttpSession session = mock(HttpSession.class);
    SecurityContext securityContext = mock(SecurityContext.class);
    Authentication authentication = mock(Authentication.class);

    when(request.getSession(false)).thenReturn(session);
    when(request.getSession()).thenReturn(session); // For parent class
    when(session.getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY))
        .thenReturn(securityContext);
    when(securityContext.getAuthentication()).thenReturn(authentication);
    when(authentication.isAuthenticated()).thenReturn(true);
    when(authentication.getPrincipal()).thenReturn("anonymousUser");

    OAuth2AuthenticationException exception = new OAuth2AuthenticationException(
        new OAuth2Error("access_denied", "Access denied", null));

    // when
    handler.onAuthenticationFailure(request, response, exception);

    // then - should redirect to error URL (default behavior)
    verify(redirectStrategy).sendRedirect(eq(request), eq(response), eq("/login?oauth2_error=true"));
  }

  @Test
  public void shouldRedirectToErrorUrlWhenNoAuthentication() throws Exception {
    // given
    HttpSession session = mock(HttpSession.class);
    when(request.getSession(false)).thenReturn(null);
    when(request.getSession()).thenReturn(session); // For parent class

    OAuth2AuthenticationException exception = new OAuth2AuthenticationException(
        new OAuth2Error("invalid_token", "Invalid token", null));

    // when
    handler.onAuthenticationFailure(request, response, exception);

    // then - should redirect to error URL
    verify(redirectStrategy).sendRedirect(eq(request), eq(response), eq("/login?oauth2_error=true"));
  }

  @Test
  public void shouldRedirectToErrorUrlWhenAuthenticationNotAuthenticated() throws Exception {
    // given
    HttpSession session = mock(HttpSession.class);
    SecurityContext securityContext = mock(SecurityContext.class);
    Authentication authentication = mock(Authentication.class);

    when(request.getSession(false)).thenReturn(session);
    when(request.getSession()).thenReturn(session); // For parent class
    when(session.getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY))
        .thenReturn(securityContext);
    when(securityContext.getAuthentication()).thenReturn(authentication);
    when(authentication.isAuthenticated()).thenReturn(false);

    OAuth2AuthenticationException exception = new OAuth2AuthenticationException(
        new OAuth2Error("server_error", "Server error", null));

    // when
    handler.onAuthenticationFailure(request, response, exception);

    // then - should redirect to error URL
    verify(redirectStrategy).sendRedirect(eq(request), eq(response), eq("/login?oauth2_error=true"));
  }

  @Test
  public void shouldHandleNonOAuth2Exception() throws Exception {
    // given
    HttpSession session = mock(HttpSession.class);
    when(request.getSession(false)).thenReturn(null);
    when(request.getSession()).thenReturn(session); // For parent class

    org.springframework.security.core.AuthenticationException exception =
        new org.springframework.security.authentication.BadCredentialsException("Bad credentials");

    // when
    handler.onAuthenticationFailure(request, response, exception);

    // then - should redirect to error URL
    verify(redirectStrategy).sendRedirect(eq(request), eq(response), eq("/login?oauth2_error=true"));
  }
}
