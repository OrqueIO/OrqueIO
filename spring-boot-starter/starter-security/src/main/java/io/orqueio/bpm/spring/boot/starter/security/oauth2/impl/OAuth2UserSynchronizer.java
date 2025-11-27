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

import io.orqueio.bpm.engine.IdentityService;
import io.orqueio.bpm.engine.identity.Group;
import io.orqueio.bpm.engine.identity.User;
import io.orqueio.bpm.spring.boot.starter.security.oauth2.OAuth2Properties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Synchronizes OAuth2/OIDC users and groups to the OrqueIO database.
 * This allows users authenticated via OAuth2/OIDC to be visible in the
 * OrqueIO Admin webapp and to be assignable to tasks.
 */
public class OAuth2UserSynchronizer {

  private static final Logger logger = LoggerFactory.getLogger(OAuth2UserSynchronizer.class);

  private final IdentityService identityService;
  private final OAuth2Properties.UserSyncProperties syncProperties;
  private final OAuth2Properties.OAuth2IdentityProviderProperties identityProviderProperties;

  public OAuth2UserSynchronizer(
      IdentityService identityService,
      OAuth2Properties oAuth2Properties) {
    this.identityService = identityService;
    this.syncProperties = oAuth2Properties.getUserSync();
    this.identityProviderProperties = oAuth2Properties.getIdentityProvider();
  }

  /**
   * Synchronizes the authenticated OAuth2 user to the database.
   *
   * @param authentication the OAuth2 authentication token
   */
  public void synchronize(OAuth2AuthenticationToken authentication) {
    logger.info("UserSync config: enabled={}, autoCreateUsers={}, autoUpdateUsers={}, syncGroups={}",
        syncProperties.isEnabled(), syncProperties.isAutoCreateUsers(),
        syncProperties.isAutoUpdateUsers(), syncProperties.isSyncGroups());

    if (!syncProperties.isEnabled()) {
      logger.debug("User synchronization is disabled");
      return;
    }

    String userId = authentication.getName();
    Object principal = authentication.getPrincipal();

    logger.info("Synchronizing OAuth2 user '{}' to database", userId);

    // Temporarily clear the SecurityContext so that IdentityService uses
    // DbIdentityServiceProvider instead of OAuth2IdentityProvider
    // This allows us to query and write to the database directly
    Authentication currentAuth = SecurityContextHolder.getContext().getAuthentication();
    try {
      SecurityContextHolder.clearContext();
      logger.debug("Cleared SecurityContext to use DbIdentityServiceProvider");

      // Extract user info
      UserInfo userInfo = extractUserInfo(userId, principal);

      // Sync user
      syncUser(userInfo);

      // Sync groups if enabled (use sanitized userId)
      if (syncProperties.isSyncGroups()) {
        Collection<? extends GrantedAuthority> authorities = authentication.getAuthorities();
        syncGroups(userInfo.userId, authorities);
      }

      logger.info("Successfully synchronized user '{}' to database", userId);
    } catch (Exception e) {
      logger.error("Failed to synchronize user '{}': {}", userId, e.getMessage(), e);
    } finally {
      // Restore the SecurityContext
      SecurityContextHolder.getContext().setAuthentication(currentAuth);
      logger.debug("Restored SecurityContext");
    }
  }

  /**
   * Sanitizes an ID to be a valid OrqueIO/Camunda resource identifier.
   * The default whitelist pattern is [a-zA-Z0-9]+|orqueio-admin, so only
   * alphanumeric characters are allowed. This method removes all non-alphanumeric
   * characters from the ID.
   */
  private String sanitizeId(String id) {
    if (id == null) {
      return null;
    }
    // OrqueIO default pattern: [a-zA-Z0-9]+|orqueio-admin
    // Only alphanumeric characters are allowed, so remove everything else
    String sanitized = id.replaceAll("[^a-zA-Z0-9]", "");
    if (sanitized.isEmpty()) {
      // If the ID becomes empty after sanitization, use a hash-based fallback
      sanitized = "user" + Math.abs(id.hashCode());
    }
    logger.debug("Sanitized ID '{}' -> '{}'", id, sanitized);
    return sanitized;
  }

  private UserInfo extractUserInfo(String userId, Object principal) {
    UserInfo info = new UserInfo();
    info.userId = sanitizeId(userId);

    if (principal instanceof OidcUser) {
      OidcUser oidcUser = (OidcUser) principal;
      info.firstName = oidcUser.getGivenName();
      info.lastName = oidcUser.getFamilyName();
      info.email = oidcUser.getEmail();
    } else if (principal instanceof OAuth2User) {
      OAuth2User oauth2User = (OAuth2User) principal;

      // Try to get name from common attributes
      String fullName = oauth2User.getAttribute("name");
      if (fullName != null && !fullName.isEmpty()) {
        String[] nameParts = fullName.split("\\s+", 2);
        info.firstName = nameParts[0];
        info.lastName = nameParts.length > 1 ? nameParts[1] : "";
      } else {
        info.firstName = userId;
        info.lastName = "";
      }

      info.email = oauth2User.getAttribute("email");
    }

    // Ensure non-null values
    if (info.firstName == null) info.firstName = userId;
    if (info.lastName == null) info.lastName = "";
    if (info.email == null) info.email = "";

    return info;
  }

  private void syncUser(UserInfo userInfo) {
    logger.info("syncUser: Looking up user '{}' in database", userInfo.userId);
    User existingUser = identityService.createUserQuery()
        .userId(userInfo.userId)
        .singleResult();

    logger.info("syncUser: existingUser={}, autoCreateUsers={}", existingUser != null, syncProperties.isAutoCreateUsers());

    if (existingUser == null) {
      if (syncProperties.isAutoCreateUsers()) {
        createUser(userInfo);
      } else {
        logger.warn("User '{}' does not exist and auto-create is disabled", userInfo.userId);
      }
    } else {
      if (syncProperties.isAutoUpdateUsers()) {
        updateUser(existingUser, userInfo);
      } else {
        logger.debug("User '{}' exists but auto-update is disabled", userInfo.userId);
      }
    }
  }

  private void createUser(UserInfo userInfo) {
    logger.info("Creating new user '{}' in database", userInfo.userId);

    User newUser = identityService.newUser(userInfo.userId);
    newUser.setFirstName(userInfo.firstName);
    newUser.setLastName(userInfo.lastName);
    newUser.setEmail(userInfo.email);
    // No password - user authenticates via OAuth2/OIDC
    newUser.setPassword(null);

    identityService.saveUser(newUser);
    logger.debug("Created user: id='{}', firstName='{}', lastName='{}', email='{}'",
        userInfo.userId, userInfo.firstName, userInfo.lastName, userInfo.email);
  }

  private void updateUser(User existingUser, UserInfo userInfo) {
    boolean updated = false;

    if (!equals(existingUser.getFirstName(), userInfo.firstName)) {
      existingUser.setFirstName(userInfo.firstName);
      updated = true;
    }
    if (!equals(existingUser.getLastName(), userInfo.lastName)) {
      existingUser.setLastName(userInfo.lastName);
      updated = true;
    }
    if (!equals(existingUser.getEmail(), userInfo.email)) {
      existingUser.setEmail(userInfo.email);
      updated = true;
    }

    if (updated) {
      logger.info("Updating user '{}' in database", userInfo.userId);
      identityService.saveUser(existingUser);
    } else {
      logger.debug("User '{}' is already up-to-date", userInfo.userId);
    }
  }

  private void syncGroups(String userId, Collection<? extends GrantedAuthority> authorities) {
    // Extract group names from authorities and sanitize them
    Set<String> oauthGroups = authorities.stream()
        .map(GrantedAuthority::getAuthority)
        .filter(auth -> !auth.startsWith("ROLE_") && !auth.startsWith("SCOPE_"))
        .map(this::sanitizeId)
        .filter(id -> id != null && !id.isEmpty())
        .collect(Collectors.toSet());

    logger.debug("OAuth2 groups for user '{}': {}", userId, oauthGroups);

    // Get existing group memberships
    List<Group> existingGroups = identityService.createGroupQuery()
        .groupMember(userId)
        .list();
    Set<String> existingGroupIds = existingGroups.stream()
        .map(Group::getId)
        .collect(Collectors.toSet());

    // Create missing groups and add memberships
    for (String groupId : oauthGroups) {
      // Ensure group exists
      Group group = identityService.createGroupQuery()
          .groupId(groupId)
          .singleResult();

      if (group == null) {
        logger.info("Creating new group '{}' in database", groupId);
        Group newGroup = identityService.newGroup(groupId);
        newGroup.setName(groupId);
        newGroup.setType("OAUTH2");
        identityService.saveGroup(newGroup);
      }

      // Add membership if not exists
      if (!existingGroupIds.contains(groupId)) {
        logger.info("Adding user '{}' to group '{}'", userId, groupId);
        identityService.createMembership(userId, groupId);
      }
    }

    // Remove obsolete memberships if enabled
    if (syncProperties.isRemoveObsoleteGroupMemberships()) {
      for (String existingGroupId : existingGroupIds) {
        if (!oauthGroups.contains(existingGroupId)) {
          logger.info("Removing user '{}' from group '{}' (no longer in OAuth2 token)", userId, existingGroupId);
          identityService.deleteMembership(userId, existingGroupId);
        }
      }
    }
  }

  private static boolean equals(String a, String b) {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    return a.equals(b);
  }

  private static class UserInfo {
    String userId;
    String firstName;
    String lastName;
    String email;
  }
}
