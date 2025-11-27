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
package io.orqueio.bpm.spring.boot.starter.security.oidc;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.logout.SimpleUrlLogoutSuccessHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * OIDC RP-Initiated Logout handler that performs SSO logout at the IdP.
 *
 * This handler implements the OpenID Connect RP-Initiated Logout specification:
 * https://openid.net/specs/openid-connect-rpinitiated-1_0.html
 *
 * When a user logs out, this handler:
 * 1. Clears local application session (handled by Spring Security)
 * 2. Redirects to the IdP's end_session_endpoint to terminate the SSO session
 * 3. Provides a post_logout_redirect_uri to return the user to the application
 */
public class OidcLogoutSuccessHandler extends SimpleUrlLogoutSuccessHandler {

    private static final Logger logger = LoggerFactory.getLogger(OidcLogoutSuccessHandler.class);

    private final ClientRegistrationRepository clientRegistrationRepository;
    private final String postLogoutRedirectUri;

    public OidcLogoutSuccessHandler(
        ClientRegistrationRepository clientRegistrationRepository,
        String postLogoutRedirectUri
    ) {
        this.clientRegistrationRepository = clientRegistrationRepository;
        this.postLogoutRedirectUri = postLogoutRedirectUri;
    }

    @Override
    public void onLogoutSuccess(
        HttpServletRequest request,
        HttpServletResponse response,
        Authentication authentication
    ) throws IOException, jakarta.servlet.ServletException {

        if (authentication == null) {
            logger.debug("No authentication present, performing local logout only");
            super.onLogoutSuccess(request, response, authentication);
            return;
        }

        // Check if this is an OIDC authentication
        if (!(authentication instanceof OAuth2AuthenticationToken)) {
            logger.debug("Not an OAuth2 authentication, performing local logout only");
            super.onLogoutSuccess(request, response, authentication);
            return;
        }

        OAuth2AuthenticationToken oauth2Token = (OAuth2AuthenticationToken) authentication;
        String registrationId = oauth2Token.getAuthorizedClientRegistrationId();

        logger.info("Initiating OIDC logout for registration: {}", registrationId);

        // Get the client registration to access provider configuration
        ClientRegistration clientRegistration = clientRegistrationRepository.findByRegistrationId(registrationId);

        if (clientRegistration == null) {
            logger.warn("Client registration not found for ID: {}, performing local logout only", registrationId);
            super.onLogoutSuccess(request, response, authentication);
            return;
        }

        // Check if the user is an OIDC user (has id_token)
        String idToken = null;
        if (oauth2Token.getPrincipal() instanceof OidcUser) {
            OidcUser oidcUser = (OidcUser) oauth2Token.getPrincipal();
            idToken = oidcUser.getIdToken().getTokenValue();
            logger.debug("Found OIDC user with id_token");
        }

        // Try to get the end_session_endpoint from provider metadata
        String endSessionEndpoint = getEndSessionEndpoint(clientRegistration);

        if (endSessionEndpoint == null) {
            logger.info("No end_session_endpoint found for {}, performing local logout only", registrationId);
            super.onLogoutSuccess(request, response, authentication);
            return;
        }

        // Build the logout URL with OIDC RP-Initiated Logout parameters
        String logoutUrl = buildLogoutUrl(endSessionEndpoint, idToken, request);

        logger.info("Redirecting to IdP logout URL: {}", logoutUrl);
        response.sendRedirect(logoutUrl);
    }

    /**
     * Attempts to retrieve the end_session_endpoint from the OIDC provider.
     *
     * For OIDC providers, this is typically discovered from the issuer's
     * .well-known/openid-configuration endpoint.
     */
    private String getEndSessionEndpoint(ClientRegistration clientRegistration) {
        // Spring Security 6+ automatically discovers the end_session_endpoint
        // from the OIDC provider metadata when using issuer-uri
        Object endSessionEndpoint = clientRegistration.getProviderDetails()
            .getConfigurationMetadata()
            .get("end_session_endpoint");

        if (endSessionEndpoint != null) {
            return endSessionEndpoint.toString();
        }

        // Fallback: construct the endpoint manually for known providers
        String issuerUri = clientRegistration.getProviderDetails().getIssuerUri();
        if (issuerUri != null) {
            // Keycloak pattern
            if (issuerUri.contains("/realms/")) {
                return issuerUri + "/protocol/openid-connect/logout";
            }
            // Google doesn't support RP-Initiated Logout, only revocation
            // GitHub doesn't support OIDC logout (it's OAuth2 only)
        }

        return null;
    }

    /**
     * Builds the logout URL according to OIDC RP-Initiated Logout spec.
     *
     * Required parameters:
     * - post_logout_redirect_uri: Where to redirect after logout
     *
     * Optional parameters:
     * - id_token_hint: The ID token to identify the session to terminate
     * - state: Opaque value to maintain state between logout request and callback
     */
    private String buildLogoutUrl(String endSessionEndpoint, String idToken, HttpServletRequest request) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(endSessionEndpoint);

        // Calculate the absolute post-logout redirect URI
        String absolutePostLogoutUri = calculatePostLogoutRedirectUri(request);
        builder.queryParam("post_logout_redirect_uri", absolutePostLogoutUri);

        // Include id_token_hint if available (recommended by OIDC spec)
        if (idToken != null) {
            builder.queryParam("id_token_hint", idToken);
        }

        return builder.encode(StandardCharsets.UTF_8).build().toUriString();
    }

    /**
     * Calculates the absolute post-logout redirect URI based on the request.
     */
    private String calculatePostLogoutRedirectUri(HttpServletRequest request) {
        if (postLogoutRedirectUri.startsWith("http://") || postLogoutRedirectUri.startsWith("https://")) {
            // Already absolute
            return postLogoutRedirectUri;
        }

        // Build absolute URI from request
        String scheme = request.getScheme();
        String serverName = request.getServerName();
        int serverPort = request.getServerPort();
        String contextPath = request.getContextPath();

        StringBuilder uri = new StringBuilder();
        uri.append(scheme).append("://").append(serverName);

        if ((scheme.equals("http") && serverPort != 80) ||
            (scheme.equals("https") && serverPort != 443)) {
            uri.append(":").append(serverPort);
        }

        uri.append(contextPath);

        if (!postLogoutRedirectUri.startsWith("/")) {
            uri.append("/");
        }
        uri.append(postLogoutRedirectUri);

        return uri.toString();
    }
}
