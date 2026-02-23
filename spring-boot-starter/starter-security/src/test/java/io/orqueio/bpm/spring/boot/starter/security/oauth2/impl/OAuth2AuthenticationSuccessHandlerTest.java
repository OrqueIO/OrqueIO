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
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.Map;
import org.junit.Before;
import org.junit.Test;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.RedirectStrategy;

public class OAuth2AuthenticationSuccessHandlerTest {

  private OAuth2AuthenticationSuccessHandler handler;
  private OAuth2UserSynchronizer userSynchronizer;
  private HttpServletRequest request;
  private HttpServletResponse response;
  private RedirectStrategy redirectStrategy;

  @Before
  public void setUp() {
    userSynchronizer = mock(OAuth2UserSynchronizer.class);
    handler = new OAuth2AuthenticationSuccessHandler(userSynchronizer, "/orqueio/app/");
    request = mock(HttpServletRequest.class);
    response = mock(HttpServletResponse.class);
    redirectStrategy = mock(RedirectStrategy.class);
    handler.setRedirectStrategy(redirectStrategy);
  }

  @Test
  public void shouldSynchronizeUserOnOAuth2AuthenticationSuccess() throws Exception {
    // given
    OAuth2User oAuth2User = new DefaultOAuth2User(
        AuthorityUtils.createAuthorityList("USER"),
        Map.of("name", "testUser"),
        "name"
    );
    OAuth2AuthenticationToken authentication = new OAuth2AuthenticationToken(
        oAuth2User,
        AuthorityUtils.createAuthorityList("USER"),
        "test-provider"
    );

    when(request.getSession()).thenReturn(mock(jakarta.servlet.http.HttpSession.class));

    // when
    handler.onAuthenticationSuccess(request, response, authentication);

    // then
    verify(userSynchronizer).synchronize(authentication);
  }

  @Test
  public void shouldContinueEvenWhenSynchronizationFails() throws Exception {
    // given
    OAuth2User oAuth2User = new DefaultOAuth2User(
        AuthorityUtils.createAuthorityList("USER"),
        Map.of("name", "testUser"),
        "name"
    );
    OAuth2AuthenticationToken authentication = new OAuth2AuthenticationToken(
        oAuth2User,
        AuthorityUtils.createAuthorityList("USER"),
        "test-provider"
    );

    doThrow(new RuntimeException("Sync failed")).when(userSynchronizer).synchronize(any());
    when(request.getSession()).thenReturn(mock(jakarta.servlet.http.HttpSession.class));

    // when - should not throw exception
    handler.onAuthenticationSuccess(request, response, authentication);

    // then - synchronize was called (even though it failed)
    verify(userSynchronizer).synchronize(authentication);
  }

  @Test
  public void shouldNotSynchronizeForNonOAuth2Authentication() throws Exception {
    // given
    Authentication authentication = mock(Authentication.class);
    when(authentication.getName()).thenReturn("testUser");

    when(request.getSession()).thenReturn(mock(jakarta.servlet.http.HttpSession.class));

    // when
    handler.onAuthenticationSuccess(request, response, authentication);

    // then - synchronize should NOT be called
    verify(userSynchronizer, never()).synchronize(any());
  }

  @Test
  public void shouldHandleNullPrincipal() throws Exception {
    // given
    OAuth2User oAuth2User = new DefaultOAuth2User(
        AuthorityUtils.createAuthorityList("USER"),
        Map.of("sub", "12345", "name", ""),
        "sub"
    );
    OAuth2AuthenticationToken authentication = new OAuth2AuthenticationToken(
        oAuth2User,
        AuthorityUtils.createAuthorityList("USER"),
        "test-provider"
    );

    when(request.getSession()).thenReturn(mock(jakarta.servlet.http.HttpSession.class));

    // when
    handler.onAuthenticationSuccess(request, response, authentication);

    // then
    verify(userSynchronizer).synchronize(authentication);
  }
}
