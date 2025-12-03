/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. Camunda licenses this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.orqueio.bpm.spring.boot.starter.security.oauth2.impl;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.webapp.impl.security.auth.AuthenticationUtil;
import io.orqueio.bpm.webapp.impl.security.auth.Authentications;
import io.orqueio.bpm.webapp.impl.security.auth.UserAuthentication;
import io.orqueio.bpm.webapp.impl.util.ProcessEngineUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

import java.io.IOException;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Filter that synchronizes Spring Security OAuth2 authentication to OrqueIO session.
 * Unlike ContainerBasedAuthenticationFilter, this filter does NOT block unauthenticated requests.
 * It only adds OAuth2 authentication to OrqueIO session when present, allowing hybrid auth mode.
 */
public class OAuth2SessionAuthenticationFilter implements Filter {

  private static final Logger logger = LoggerFactory.getLogger(OAuth2SessionAuthenticationFilter.class);

  private static final Pattern ENGINE_PATTERN = Pattern.compile(".*/app/(?:cockpit|admin|tasklist|welcome)/([^/]+)/.*");
  private static final Pattern API_ENGINE_PATTERN = Pattern.compile(".*/api/engine/engine/([^/]+)/.*");
  private static final Pattern API_APP_PATTERN = Pattern.compile(".*/api/(?:cockpit|admin|tasklist|welcome)/.*");

  @Override
  public void init(FilterConfig filterConfig) throws ServletException {
  }

  @Override
  public void destroy() {
  }

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
      throws IOException, ServletException {

    HttpServletRequest httpRequest = (HttpServletRequest) request;

    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

    if (authentication instanceof OAuth2AuthenticationToken) {
      OAuth2AuthenticationToken oauth2Token = (OAuth2AuthenticationToken) authentication;
      synchronizeToOrqueioSession(httpRequest, oauth2Token);
    }

    chain.doFilter(request, response);
  }

  private void synchronizeToOrqueioSession(HttpServletRequest request, OAuth2AuthenticationToken oauth2Token) {
    String engineName = extractEngineName(request);
    if (engineName == null) {
      engineName = "default";
    }

    ProcessEngine engine = ProcessEngineUtil.lookupProcessEngine(engineName);
    if (engine == null) {
      logger.debug("Process engine '{}' not found, skipping OAuth2 session sync", engineName);
      return;
    }

    HttpSession session = request.getSession(true);
    Authentications authentications = AuthenticationUtil.getAuthsFromSession(session);

    String userId = sanitizeId(oauth2Token.getName());

    if (authentications.getAuthenticationForProcessEngine(engineName) != null) {
      String existingUser = authentications.getAuthenticationForProcessEngine(engineName).getIdentityId();
      if (existingUser.equals(userId)) {
        logger.trace("User '{}' already authenticated for engine '{}'", userId, engineName);
        return;
      }
    }

    List<String> groups = oauth2Token.getAuthorities().stream()
        .map(GrantedAuthority::getAuthority)
        .collect(Collectors.toList());

    logger.debug("Synchronizing OAuth2 user '{}' with groups {} to OrqueIO session for engine '{}'",
        userId, groups, engineName);

    UserAuthentication userAuth = AuthenticationUtil.createAuthentication(engine, userId, groups, null);
    if (userAuth != null) {
      authentications.addOrReplace(userAuth);
      AuthenticationUtil.updateSession(session, authentications);
    }
  }

  private String extractEngineName(HttpServletRequest request) {
    String uri = request.getRequestURI();

    Matcher appMatcher = ENGINE_PATTERN.matcher(uri);
    if (appMatcher.matches()) {
      return appMatcher.group(1);
    }

    Matcher apiEngineMatcher = API_ENGINE_PATTERN.matcher(uri);
    if (apiEngineMatcher.matches()) {
      return apiEngineMatcher.group(1);
    }

    Matcher apiAppMatcher = API_APP_PATTERN.matcher(uri);
    if (apiAppMatcher.matches()) {
      return "default";
    }

    return null;
  }

  private String sanitizeId(String id) {
    if (id == null) {
      return null;
    }
    String sanitized = id.replaceAll("[^a-zA-Z0-9]", "");
    if (sanitized.isEmpty()) {
      sanitized = "user" + Math.abs(id.hashCode());
    }
    return sanitized;
  }
}
