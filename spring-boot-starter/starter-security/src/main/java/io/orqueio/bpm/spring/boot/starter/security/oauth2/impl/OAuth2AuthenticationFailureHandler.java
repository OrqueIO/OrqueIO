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
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

import java.io.IOException;

/**
 * Custom authentication failure handler that logs OAuth2 authentication errors
 * before redirecting to the login page with an error indicator.
 * <p>
 * This handler also addresses the race condition where some identity providers (e.g., Keycloak)
 * may send two simultaneous redirects: one with a valid authorization code and another with
 * an error (e.g., "temporarily_unavailable" / "authentication_expired"). If the valid request
 * completes first and the user is already authenticated, this handler ignores the error redirect.
 */
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    private static final Logger logger = LoggerFactory.getLogger(OAuth2AuthenticationFailureHandler.class);

    private final String defaultTargetUrl;

    public OAuth2AuthenticationFailureHandler(String defaultFailureUrl) {
        super(defaultFailureUrl);
        this.defaultTargetUrl = defaultFailureUrl.replace("?oauth2_error=true", "");
    }

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception) throws IOException, ServletException {

        Authentication existingAuth = getAuthenticationFromSession(request);
        if (existingAuth != null && existingAuth.isAuthenticated()
                && !"anonymousUser".equals(existingAuth.getPrincipal())) {
            logger.info("OAuth2 error received but user '{}' is already authenticated in session. " +
                            "Ignoring error redirect (likely a race condition from IdP double redirect).",
                    existingAuth.getName());
            getRedirectStrategy().sendRedirect(request, response, defaultTargetUrl);
            return;
        }

        existingAuth = SecurityContextHolder.getContext().getAuthentication();
        if (existingAuth != null && existingAuth.isAuthenticated()
                && !"anonymousUser".equals(existingAuth.getPrincipal())) {
            logger.info("OAuth2 error received but user '{}' is already authenticated in SecurityContext. " +
                            "Ignoring error redirect (likely a race condition from IdP double redirect).",
                    existingAuth.getName());
            getRedirectStrategy().sendRedirect(request, response, defaultTargetUrl);
            return;
        }

        logger.error("OAuth2 authentication failed: {}", exception.getMessage());

        if (exception instanceof OAuth2AuthenticationException) {
            OAuth2AuthenticationException oauth2Exception = (OAuth2AuthenticationException) exception;
            logger.error("OAuth2 error code: {}", oauth2Exception.getError().getErrorCode());
            logger.error("OAuth2 error description: {}", oauth2Exception.getError().getDescription());
            logger.error("OAuth2 error URI: {}", oauth2Exception.getError().getUri());
        }

        logger.error("Full exception details:", exception);

        super.onAuthenticationFailure(request, response, exception);
    }


    private Authentication getAuthenticationFromSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return null;
        }

        Object securityContextObj = session.getAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
        if (securityContextObj instanceof SecurityContext) {
            return ((SecurityContext) securityContextObj).getAuthentication();
        }
        return null;
    }
}
