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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.lang.reflect.Method;
import java.util.Map;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

public class OAuth2SessionAuthenticationFilterTest {

  private OAuth2SessionAuthenticationFilter filter;
  private HttpServletRequest request;
  private HttpServletResponse response;
  private FilterChain chain;

  @Before
  public void setUp() {
    filter = new OAuth2SessionAuthenticationFilter();
    request = mock(HttpServletRequest.class);
    response = mock(HttpServletResponse.class);
    chain = mock(FilterChain.class);

    SecurityContextHolder.clearContext();
  }

  @After
  public void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  public void shouldContinueFilterChainWithoutAuthentication() throws Exception {
    // given - no authentication in SecurityContext

    // when
    filter.doFilter(request, response, chain);

    // then
    verify(chain).doFilter(request, response);
  }

  @Test
  public void shouldContinueFilterChainWithOAuth2Authentication() throws Exception {
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
    SecurityContextHolder.getContext().setAuthentication(authentication);

    when(request.getRequestURI()).thenReturn("/orqueio/app/cockpit/default/");

    // when
    filter.doFilter(request, response, chain);

    // then
    verify(chain).doFilter(request, response);
  }

  @Test
  public void testExtractEngineNameFromCockpitUrl() throws Exception {
    // given
    when(request.getRequestURI()).thenReturn("/orqueio/app/cockpit/default/dashboard");

    // when
    String engineName = invokeExtractEngineName("/orqueio/app/cockpit/default/dashboard");

    // then
    assertThat(engineName).isEqualTo("default");
  }

  @Test
  public void testExtractEngineNameFromAdminUrl() throws Exception {
    // given
    String uri = "/orqueio/app/admin/myengine/users";

    // when
    String engineName = invokeExtractEngineName(uri);

    // then
    assertThat(engineName).isEqualTo("myengine");
  }

  @Test
  public void testExtractEngineNameFromTasklistUrl() throws Exception {
    // given
    String uri = "/orqueio/app/tasklist/production/tasks";

    // when
    String engineName = invokeExtractEngineName(uri);

    // then
    assertThat(engineName).isEqualTo("production");
  }

  @Test
  public void testExtractEngineNameFromWelcomeUrl() throws Exception {
    // given
    String uri = "/orqueio/app/welcome/default/";

    // when
    String engineName = invokeExtractEngineName(uri);

    // then
    assertThat(engineName).isEqualTo("default");
  }

  @Test
  public void testExtractEngineNameFromApiEngineUrl() throws Exception {
    // given
    String uri = "/orqueio/api/engine/engine/default/process-definition";

    // when
    String engineName = invokeExtractEngineName(uri);

    // then
    assertThat(engineName).isEqualTo("default");
  }

  @Test
  public void testExtractEngineNameFromApiAppUrl() throws Exception {
    // given
    String uri = "/orqueio/api/cockpit/plugin/base/default/process-definition";

    // when
    String engineName = invokeExtractEngineName(uri);

    // then - API app URLs return "default"
    assertThat(engineName).isEqualTo("default");
  }

  @Test
  public void testExtractEngineNameFromUnknownUrl() throws Exception {
    // given
    String uri = "/some/other/path";

    // when
    String engineName = invokeExtractEngineName(uri);

    // then
    assertThat(engineName).isNull();
  }

  @Test
  public void testSanitizeIdWithSpecialCharacters() throws Exception {
    // given
    String id = "user@example.com";

    // when
    String sanitized = invokeSanitizeId(id);

    // then - should remove @ and .
    assertThat(sanitized).isEqualTo("userexamplecom");
  }

  @Test
  public void testSanitizeIdWithHyphens() throws Exception {
    // given
    String id = "john-doe-123";

    // when
    String sanitized = invokeSanitizeId(id);

    // then
    assertThat(sanitized).isEqualTo("johndoe123");
  }

  @Test
  public void testSanitizeIdWithOnlySpecialCharacters() throws Exception {
    // given
    String id = "---@@@...";

    // when
    String sanitized = invokeSanitizeId(id);

    // then - should generate fallback based on hash
    assertThat(sanitized).startsWith("user");
    assertThat(sanitized).matches("user\\d+");
  }

  @Test
  public void testSanitizeIdWithNull() throws Exception {
    // given
    String id = null;

    // when
    String sanitized = invokeSanitizeId(id);

    // then
    assertThat(sanitized).isNull();
  }

  @Test
  public void testSanitizeIdWithAlphanumericOnly() throws Exception {
    // given
    String id = "johndoe123";

    // when
    String sanitized = invokeSanitizeId(id);

    // then - should remain unchanged
    assertThat(sanitized).isEqualTo("johndoe123");
  }

  @Test
  public void testSanitizeIdWithUUID() throws Exception {
    // given
    String id = "550e8400-e29b-41d4-a716-446655440000";

    // when
    String sanitized = invokeSanitizeId(id);

    // then - should remove hyphens
    assertThat(sanitized).isEqualTo("550e8400e29b41d4a716446655440000");
  }

  private String invokeExtractEngineName(String uri) throws Exception {
    Method method = OAuth2SessionAuthenticationFilter.class.getDeclaredMethod("extractEngineName", HttpServletRequest.class);
    method.setAccessible(true);
    HttpServletRequest mockRequest = mock(HttpServletRequest.class);
    when(mockRequest.getRequestURI()).thenReturn(uri);
    return (String) method.invoke(filter, mockRequest);
  }

  private String invokeSanitizeId(String id) throws Exception {
    Method method = OAuth2SessionAuthenticationFilter.class.getDeclaredMethod("sanitizeId", String.class);
    method.setAccessible(true);
    return (String) method.invoke(filter, id);
  }
}
