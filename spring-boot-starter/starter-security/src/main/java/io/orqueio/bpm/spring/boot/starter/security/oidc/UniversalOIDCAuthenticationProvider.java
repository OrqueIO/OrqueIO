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
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.identity.User;
import io.orqueio.bpm.engine.impl.identity.IdentityOperationResult;
import io.orqueio.bpm.engine.rest.security.auth.AuthenticationResult;
import io.orqueio.bpm.engine.rest.security.auth.impl.ContainerBasedAuthenticationProvider;
import io.orqueio.bpm.spring.boot.starter.security.common.UniversalAuthenticationProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


public class UniversalOIDCAuthenticationProvider extends ContainerBasedAuthenticationProvider {

    private static final Logger logger = LoggerFactory.getLogger(UniversalOIDCAuthenticationProvider.class);

    private UniversalAuthenticationProperties authProperties;

    public UniversalOIDCAuthenticationProvider() {
    }

    /**
     *
     * @param authProperties 
     */
    public UniversalOIDCAuthenticationProvider(UniversalAuthenticationProperties authProperties) {
        this.authProperties = authProperties;
    }

    /**
     * @return 
     */
    protected UniversalAuthenticationProperties getAuthProperties() {
        if (authProperties == null) {
            try {
                authProperties = org.springframework.web.context.support.WebApplicationContextUtils
                    .getRequiredWebApplicationContext(
                        ((org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder
                            .currentRequestAttributes())
                            .getRequest()
                            .getServletContext()
                    )
                    .getBean(UniversalAuthenticationProperties.class);
            } catch (Exception e) {
                logger.error("Failed to load UniversalAuthenticationProperties from Spring context", e);
                throw new IllegalStateException(
                    "Cannot load authentication properties. Ensure UniversalOIDCAutoConfiguration is enabled.", e);
            }
        }
        return authProperties;
    }


    @Override
    public AuthenticationResult extractAuthenticatedUser(HttpServletRequest request, ProcessEngine engine) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null) {
            logger.debug("No authentication found in Spring Security context");
            return handleFallbackToDatabase(request, engine);
        }

        if (!(authentication instanceof OAuth2AuthenticationToken)) {
            logger.debug("Authentication is not OAuth2, it is {}", authentication.getClass().getName());
            return handleFallbackToDatabase(request, engine);
        }

        OAuth2AuthenticationToken oauth2Token = (OAuth2AuthenticationToken) authentication;

        String userId = extractUserId(oauth2Token);

        if (userId == null || userId.isEmpty()) {
            logger.warn("User ID is empty in OAuth2 token");
            return AuthenticationResult.unsuccessful();
        }

        logger.debug("Processing OIDC authentication for user '{}'", userId);

        try {
            UniversalAuthenticationProperties props = getAuthProperties();

            if (props.isAutoCreateUsers()) {
                autoCreateOrUpdateUser(userId, oauth2Token, engine, props);
            }

            if (props.isSyncGroups()) {
                syncGroups(userId, oauth2Token, engine, props);
            }

            logger.info("Successfully authenticated OIDC user '{}'", userId);
            return AuthenticationResult.successful(userId);

        } catch (Exception e) {
            logger.error("Error processing OIDC authentication for user '{}'", userId, e);
            return AuthenticationResult.unsuccessful();
        }
    }

    /**
     * @param oauth2Token 
     * @return 
     */
    protected String extractUserId(OAuth2AuthenticationToken oauth2Token) {
        UniversalOIDCProperties oidcProps = getAuthProperties().getOidc();

        if (oidcProps == null) {
            logger.warn("OIDC properties not found, falling back to oauth2Token.getName()");
            return oauth2Token.getName();
        }

        String userIdClaim = oidcProps.getClaims().getUserId();

        Object principal = oauth2Token.getPrincipal();
        if (principal instanceof OidcUser) {
            OidcUser oidcUser = (OidcUser) principal;
            Object userIdValue = oidcUser.getAttribute(userIdClaim);
            if (userIdValue != null) {
                return userIdValue.toString();
            }
        }

        return oauth2Token.getName();
    }


    protected void autoCreateOrUpdateUser(String userId, OAuth2AuthenticationToken oauth2Token,
                                         ProcessEngine engine, UniversalAuthenticationProperties authProperties) {

        User existingUser = engine.getIdentityService().createUserQuery()
            .userId(userId)
            .singleResult();

        if (existingUser == null) {
            logger.info("Auto-creating user '{}' from OIDC claims", userId);

            User newUser = engine.getIdentityService().newUser(userId);
            populateUserFromOidcClaims(newUser, oauth2Token, authProperties);

            engine.getIdentityService().saveUser(newUser);
            logger.info("Successfully created user '{}'", userId);

        } else if (authProperties.isAutoUpdateUsers()) {
            logger.debug("Auto-updating user '{}' from OIDC claims", userId);

            populateUserFromOidcClaims(existingUser, oauth2Token, authProperties);
            engine.getIdentityService().saveUser(existingUser);

            logger.debug("Successfully updated user '{}'", userId);
        }
    }

    /**
     * @param user 
     * @param oauth2Token 
     * @param authProperties 
     */
    protected void populateUserFromOidcClaims(User user, OAuth2AuthenticationToken oauth2Token,
                                             UniversalAuthenticationProperties authProperties) {
        Object principal = oauth2Token.getPrincipal();
        if (!(principal instanceof OidcUser)) {
            logger.warn("Principal is not OidcUser, cannot extract claims");
            return;
        }

        OidcUser oidcUser = (OidcUser) principal;
        UniversalOIDCProperties oidcProps = authProperties.getOidc();

        if (oidcProps == null) {
            logger.warn("OIDC properties not configured");
            return;
        }

        Map<String, Object> attributes = oidcUser.getAttributes();
        UniversalOIDCProperties.ClaimsMapping claims = oidcProps.getClaims();

        Object firstNameValue = attributes.get(claims.getFirstName());
        if (firstNameValue != null) {
            user.setFirstName(firstNameValue.toString());
        }

        Object lastNameValue = attributes.get(claims.getLastName());
        if (lastNameValue != null) {
            user.setLastName(lastNameValue.toString());
        }

        Object emailValue = attributes.get(claims.getEmail());
        if (emailValue != null) {
            user.setEmail(emailValue.toString());
        }

        logger.debug("Populated user '{}' with: firstName='{}', lastName='{}', email='{}'",
            user.getId(), user.getFirstName(), user.getLastName(), user.getEmail());
    }


    protected void syncGroups(String userId, OAuth2AuthenticationToken oauth2Token,
                             ProcessEngine engine, UniversalAuthenticationProperties authProperties) {

        List<String> groupIds = extractGroupsFromToken(oauth2Token, authProperties);

        if (groupIds.isEmpty()) {
            logger.debug("No groups found in OIDC token for user '{}'", userId);
            return;
        }

        logger.debug("Syncing {} groups for user '{}': {}", groupIds.size(), userId, groupIds);

        for (String groupId : groupIds) {
            var existingGroup = engine.getIdentityService().createGroupQuery()
                .groupId(groupId)
                .singleResult();

            if (existingGroup == null) {
                logger.info("Auto-creating group '{}' from OIDC claims", groupId);
                var newGroup = engine.getIdentityService().newGroup(groupId);
                newGroup.setName(groupId);
                engine.getIdentityService().saveGroup(newGroup);
            }
        }

        List<String> currentGroups = engine.getIdentityService().createGroupQuery()
            .groupMember(userId)
            .list()
            .stream()
            .map(g -> g.getId())
            .collect(Collectors.toList());

        for (String groupId : groupIds) {
            if (!currentGroups.contains(groupId)) {
                logger.debug("Adding user '{}' to group '{}'", userId, groupId);
                engine.getIdentityService().createMembership(userId, groupId);
            }
        }

        for (String currentGroupId : currentGroups) {
            if (!groupIds.contains(currentGroupId)) {
                logger.debug("Removing user '{}' from group '{}'", userId, currentGroupId);
                engine.getIdentityService().deleteMembership(userId, currentGroupId);
            }
        }

        logger.info("Successfully synced {} groups for user '{}'", groupIds.size(), userId);
    }

    /**
     * @param oauth2Token 
     * @param authProperties 
     * @return 
     */
    @SuppressWarnings("unchecked")
    protected List<String> extractGroupsFromToken(OAuth2AuthenticationToken oauth2Token,
                                                  UniversalAuthenticationProperties authProperties) {
        Object principal = oauth2Token.getPrincipal();

        if (principal instanceof OidcUser) {
            OidcUser oidcUser = (OidcUser) principal;
            UniversalOIDCProperties oidcProps = authProperties.getOidc();

            if (oidcProps != null) {
                String groupsClaim = oidcProps.getClaims().getGroups();
                Object groupsValue = oidcUser.getAttribute(groupsClaim);

                if (groupsValue instanceof List) {
                    return ((List<?>) groupsValue).stream()
                        .map(Object::toString)
                        .collect(Collectors.toList());
                } else if (groupsValue instanceof String) {
                    return List.of((String) groupsValue);
                }
            }
        }

        return oauth2Token.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .filter(auth -> !auth.startsWith("SCOPE_"))  
            .collect(Collectors.toList());
    }

    protected AuthenticationResult handleFallbackToDatabase(HttpServletRequest request, ProcessEngine engine) {
        if (getAuthProperties().isFallbackToDatabase()) {
            logger.debug("Attempting database authentication fallback");
            return AuthenticationResult.unsuccessful();
        } else {
            logger.warn("Database fallback is disabled - authentication failed");
            return AuthenticationResult.unsuccessful();
        }
    }

}
