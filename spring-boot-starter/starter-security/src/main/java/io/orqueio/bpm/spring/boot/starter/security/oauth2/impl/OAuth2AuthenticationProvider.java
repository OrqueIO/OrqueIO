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

import jakarta.servlet.http.HttpServletRequest;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.rest.security.auth.AuthenticationResult;
import io.orqueio.bpm.engine.rest.security.auth.impl.ContainerBasedAuthenticationProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

public class OAuth2AuthenticationProvider extends ContainerBasedAuthenticationProvider {

  private static final Logger logger = LoggerFactory.getLogger(OAuth2AuthenticationProvider.class);

  @Override
  public AuthenticationResult extractAuthenticatedUser(HttpServletRequest request, ProcessEngine engine) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

    if (authentication == null) {
      logger.debug("Authentication is null");
      return AuthenticationResult.unsuccessful();
    }

    if (!(authentication instanceof OAuth2AuthenticationToken)) {
      logger.debug("Authentication is not OAuth2, it is {}", authentication.getClass());
      return AuthenticationResult.unsuccessful();
    }
    var oauth2 = (OAuth2AuthenticationToken) authentication;
    String orqueioUserId = oauth2.getName();
    if (orqueioUserId == null || orqueioUserId.isEmpty()) {
      logger.debug("UserId is empty");
      return AuthenticationResult.unsuccessful();
    }

    // Sanitize the userId to match the format used in OAuth2UserSynchronizer
    // OrqueIO default pattern: [a-zA-Z0-9]+|orqueio-admin
    String sanitizedUserId = sanitizeId(orqueioUserId);
    logger.debug("Authenticated user '{}' (sanitized: '{}')", orqueioUserId, sanitizedUserId);
    return AuthenticationResult.successful(sanitizedUserId);
  }

  /**
   * Sanitizes an ID to be a valid OrqueIO/Camunda resource identifier.
   * Must match the sanitization logic in OAuth2UserSynchronizer.
   */
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
