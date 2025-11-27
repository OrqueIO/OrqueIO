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

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;

import java.io.IOException;

/**
 * Authentication success handler that triggers user synchronization after OAuth2/OIDC login.
 * Extends {@link SavedRequestAwareAuthenticationSuccessHandler} to maintain the redirect
 * to the originally requested URL after successful authentication.
 */
public class OAuth2AuthenticationSuccessHandler extends SavedRequestAwareAuthenticationSuccessHandler {

  private static final Logger logger = LoggerFactory.getLogger(OAuth2AuthenticationSuccessHandler.class);

  private final OAuth2UserSynchronizer userSynchronizer;

  public OAuth2AuthenticationSuccessHandler(OAuth2UserSynchronizer userSynchronizer) {
    this.userSynchronizer = userSynchronizer;
  }

  @Override
  public void onAuthenticationSuccess(
      HttpServletRequest request,
      HttpServletResponse response,
      Authentication authentication) throws IOException, ServletException {

    logger.info("OAuth2AuthenticationSuccessHandler: authentication success for user '{}'", authentication.getName());

    // Synchronize user to database
    if (authentication instanceof OAuth2AuthenticationToken) {
      OAuth2AuthenticationToken oauth2Token = (OAuth2AuthenticationToken) authentication;
      logger.info("OAuth2AuthenticationSuccessHandler: Synchronizing user '{}' to database", authentication.getName());
      try {
        userSynchronizer.synchronize(oauth2Token);
        logger.info("OAuth2AuthenticationSuccessHandler: User '{}' synchronized successfully", authentication.getName());
      } catch (Exception e) {
        // Log error but don't fail the authentication
        logger.error("Failed to synchronize user '{}' to database: {}",
            authentication.getName(), e.getMessage(), e);
      }
    } else {
      logger.warn("OAuth2AuthenticationSuccessHandler: Authentication is not OAuth2AuthenticationToken, type={}",
          authentication.getClass().getSimpleName());
    }

    // Continue with default redirect behavior
    super.onAuthenticationSuccess(request, response, authentication);
  }
}
