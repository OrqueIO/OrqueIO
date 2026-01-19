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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.orqueio.bpm.engine.AuthorizationService;
import io.orqueio.bpm.engine.IdentityService;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.authorization.Authorization;
import io.orqueio.bpm.engine.authorization.AuthorizationQuery;
import io.orqueio.bpm.engine.authorization.Groups;
import io.orqueio.bpm.engine.identity.Group;
import io.orqueio.bpm.engine.identity.GroupQuery;
import io.orqueio.bpm.engine.identity.User;
import io.orqueio.bpm.engine.identity.UserQuery;
import io.orqueio.bpm.spring.boot.starter.security.oauth2.OAuth2Properties;
import java.lang.reflect.Method;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

public class OAuth2UserSynchronizerTest {

  private OAuth2UserSynchronizer synchronizer;
  private ProcessEngine processEngine;
  private IdentityService identityService;
  private AuthorizationService authorizationService;
  private OAuth2Properties oAuth2Properties;

  @Before
  public void setUp() {
    processEngine = mock(ProcessEngine.class);
    identityService = mock(IdentityService.class);
    authorizationService = mock(AuthorizationService.class);
    oAuth2Properties = new OAuth2Properties();

    when(processEngine.getIdentityService()).thenReturn(identityService);
    when(processEngine.getAuthorizationService()).thenReturn(authorizationService);

    // Setup default authorization query mock
    AuthorizationQuery authQuery = mock(AuthorizationQuery.class);
    when(authorizationService.createAuthorizationQuery()).thenReturn(authQuery);
    when(authQuery.groupIdIn(anyString())).thenReturn(authQuery);
    when(authQuery.userIdIn(anyString())).thenReturn(authQuery);
    when(authQuery.resourceType(any())).thenReturn(authQuery);
    when(authQuery.resourceId(anyString())).thenReturn(authQuery);
    when(authQuery.count()).thenReturn(0L);

    Authorization mockAuth = mock(Authorization.class);
    when(authorizationService.createNewAuthorization(any(Integer.class))).thenReturn(mockAuth);

    synchronizer = new OAuth2UserSynchronizer(processEngine, oAuth2Properties);

    SecurityContextHolder.clearContext();
  }

  @After
  public void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  public void shouldNotSynchronizeWhenDisabled() {
    // given
    oAuth2Properties.getUserSync().setEnabled(false);
    synchronizer = new OAuth2UserSynchronizer(processEngine, oAuth2Properties);

    OAuth2AuthenticationToken token = createOAuth2Token("testUser");

    // when
    synchronizer.synchronize(token);

    // then - no user query should be made
    verify(identityService, never()).createUserQuery();
  }

  @Test
  public void shouldCreateNewUserWhenNotExists() {
    // given
    oAuth2Properties.getUserSync().setAutoCreateUsers(true);
    synchronizer = new OAuth2UserSynchronizer(processEngine, oAuth2Properties);

    UserQuery userQuery = mock(UserQuery.class);
    when(identityService.createUserQuery()).thenReturn(userQuery);
    when(userQuery.userId(anyString())).thenReturn(userQuery);
    when(userQuery.memberOfGroup(anyString())).thenReturn(userQuery);
    when(userQuery.singleResult()).thenReturn(null);
    when(userQuery.count()).thenReturn(0L);

    User newUser = mock(User.class);
    when(identityService.newUser(anyString())).thenReturn(newUser);

    GroupQuery groupQuery = mock(GroupQuery.class);
    when(identityService.createGroupQuery()).thenReturn(groupQuery);
    when(groupQuery.groupId(anyString())).thenReturn(groupQuery);
    when(groupQuery.groupMember(anyString())).thenReturn(groupQuery);
    when(groupQuery.singleResult()).thenReturn(null);
    when(groupQuery.list()).thenReturn(Collections.emptyList());

    Group newGroup = mock(Group.class);
    when(identityService.newGroup(anyString())).thenReturn(newGroup);

    OAuth2AuthenticationToken token = createOAuth2Token("testUser");

    // when
    synchronizer.synchronize(token);

    // then
    verify(identityService).newUser("testUser");
    verify(identityService).saveUser(newUser);
  }

  @Test
  public void shouldCreateFirstUserAsAdmin() {
    // given
    oAuth2Properties.getUserSync().setAutoCreateUsers(true);
    synchronizer = new OAuth2UserSynchronizer(processEngine, oAuth2Properties);

    UserQuery userQuery = mock(UserQuery.class);
    when(identityService.createUserQuery()).thenReturn(userQuery);
    when(userQuery.userId(anyString())).thenReturn(userQuery);
    when(userQuery.memberOfGroup(Groups.ORQUEIO_ADMIN)).thenReturn(userQuery);
    when(userQuery.singleResult()).thenReturn(null);
    when(userQuery.count()).thenReturn(0L); // No admin exists

    User newUser = mock(User.class);
    when(identityService.newUser(anyString())).thenReturn(newUser);

    GroupQuery groupQuery = mock(GroupQuery.class);
    when(identityService.createGroupQuery()).thenReturn(groupQuery);
    when(groupQuery.groupId(anyString())).thenReturn(groupQuery);
    when(groupQuery.groupMember(anyString())).thenReturn(groupQuery);
    when(groupQuery.singleResult()).thenReturn(null); // Admin group doesn't exist
    when(groupQuery.list()).thenReturn(Collections.emptyList());

    Group newGroup = mock(Group.class);
    when(identityService.newGroup(anyString())).thenReturn(newGroup);

    OAuth2AuthenticationToken token = createOAuth2Token("firstUser");

    // when
    synchronizer.synchronize(token);

    // then - should create admin group and add user to it
    verify(identityService).newGroup(Groups.ORQUEIO_ADMIN);
    verify(identityService).createMembership("firstUser", Groups.ORQUEIO_ADMIN);
  }

  @Test
  public void shouldNotCreateUserWhenAutoCreateDisabled() {
    // given
    oAuth2Properties.getUserSync().setAutoCreateUsers(false);
    synchronizer = new OAuth2UserSynchronizer(processEngine, oAuth2Properties);

    UserQuery userQuery = mock(UserQuery.class);
    when(identityService.createUserQuery()).thenReturn(userQuery);
    when(userQuery.userId(anyString())).thenReturn(userQuery);
    when(userQuery.singleResult()).thenReturn(null);

    OAuth2AuthenticationToken token = createOAuth2Token("newUser");

    // when
    synchronizer.synchronize(token);

    // then - should not create user
    verify(identityService, never()).newUser(anyString());
    verify(identityService, never()).saveUser(any());
  }

  @Test
  public void shouldUpdateExistingUserWhenAutoUpdateEnabled() {
    // given
    oAuth2Properties.getUserSync().setAutoUpdateUsers(true);
    synchronizer = new OAuth2UserSynchronizer(processEngine, oAuth2Properties);

    User existingUser = mock(User.class);
    when(existingUser.getFirstName()).thenReturn("OldFirstName");
    when(existingUser.getLastName()).thenReturn("OldLastName");
    when(existingUser.getEmail()).thenReturn("old@example.com");

    UserQuery userQuery = mock(UserQuery.class);
    when(identityService.createUserQuery()).thenReturn(userQuery);
    when(userQuery.userId(anyString())).thenReturn(userQuery);
    when(userQuery.singleResult()).thenReturn(existingUser);

    OAuth2AuthenticationToken token = createOAuth2TokenWithDetails("existingUser", "NewFirst", "NewLast", "new@example.com");

    // when
    synchronizer.synchronize(token);

    // then
    verify(existingUser).setFirstName("NewFirst");
    verify(existingUser).setLastName("NewLast");
    verify(existingUser).setEmail("new@example.com");
    verify(identityService).saveUser(existingUser);
  }

  @Test
  public void shouldNotUpdateUserWhenAutoUpdateDisabled() {
    // given
    oAuth2Properties.getUserSync().setAutoUpdateUsers(false);
    synchronizer = new OAuth2UserSynchronizer(processEngine, oAuth2Properties);

    User existingUser = mock(User.class);
    when(existingUser.getFirstName()).thenReturn("OldFirstName");

    UserQuery userQuery = mock(UserQuery.class);
    when(identityService.createUserQuery()).thenReturn(userQuery);
    when(userQuery.userId(anyString())).thenReturn(userQuery);
    when(userQuery.singleResult()).thenReturn(existingUser);

    OAuth2AuthenticationToken token = createOAuth2TokenWithDetails("existingUser", "NewFirst", "NewLast", "new@example.com");

    // when
    synchronizer.synchronize(token);

    // then - should not update
    verify(existingUser, never()).setFirstName(anyString());
    verify(identityService, never()).saveUser(any());
  }

  @Test
  public void shouldNotUpdateUserWhenNoChanges() {
    // given
    oAuth2Properties.getUserSync().setAutoUpdateUsers(true);
    synchronizer = new OAuth2UserSynchronizer(processEngine, oAuth2Properties);

    User existingUser = mock(User.class);
    when(existingUser.getFirstName()).thenReturn("John");
    when(existingUser.getLastName()).thenReturn("Doe");
    when(existingUser.getEmail()).thenReturn("john@example.com");

    UserQuery userQuery = mock(UserQuery.class);
    when(identityService.createUserQuery()).thenReturn(userQuery);
    when(userQuery.userId(anyString())).thenReturn(userQuery);
    when(userQuery.singleResult()).thenReturn(existingUser);

    OAuth2AuthenticationToken token = createOAuth2TokenWithDetails("johndoe", "John", "Doe", "john@example.com");

    // when
    synchronizer.synchronize(token);

    // then - should not save because no changes
    verify(identityService, never()).saveUser(any());
  }

  @Test
  public void shouldSyncGroupsWhenEnabled() {
    // given
    oAuth2Properties.getUserSync().setSyncGroups(true);
    synchronizer = new OAuth2UserSynchronizer(processEngine, oAuth2Properties);

    User existingUser = mock(User.class);
    UserQuery userQuery = mock(UserQuery.class);
    when(identityService.createUserQuery()).thenReturn(userQuery);
    when(userQuery.userId(anyString())).thenReturn(userQuery);
    when(userQuery.memberOfGroup(anyString())).thenReturn(userQuery);
    when(userQuery.singleResult()).thenReturn(existingUser);
    when(userQuery.count()).thenReturn(1L); // Admin exists

    GroupQuery groupQuery = mock(GroupQuery.class);
    when(identityService.createGroupQuery()).thenReturn(groupQuery);
    when(groupQuery.groupId(anyString())).thenReturn(groupQuery);
    when(groupQuery.groupMember(anyString())).thenReturn(groupQuery);
    when(groupQuery.singleResult()).thenReturn(null); // Group doesn't exist
    when(groupQuery.list()).thenReturn(Collections.emptyList());

    Group newGroup = mock(Group.class);
    when(identityService.newGroup(anyString())).thenReturn(newGroup);

    OAuth2AuthenticationToken token = createOAuth2TokenWithGroups("testUser", List.of("developers", "testers"));

    // when
    synchronizer.synchronize(token);

    // then - should create groups and memberships
    verify(identityService).newGroup("developers");
    verify(identityService).newGroup("testers");
    verify(identityService).createMembership("testUser", "developers");
    verify(identityService).createMembership("testUser", "testers");
  }

  @Test
  public void shouldNotSyncGroupsWhenDisabled() {
    // given
    oAuth2Properties.getUserSync().setSyncGroups(false);
    synchronizer = new OAuth2UserSynchronizer(processEngine, oAuth2Properties);

    User existingUser = mock(User.class);
    UserQuery userQuery = mock(UserQuery.class);
    when(identityService.createUserQuery()).thenReturn(userQuery);
    when(userQuery.userId(anyString())).thenReturn(userQuery);
    when(userQuery.memberOfGroup(anyString())).thenReturn(userQuery);
    when(userQuery.singleResult()).thenReturn(existingUser);
    when(userQuery.count()).thenReturn(1L);

    OAuth2AuthenticationToken token = createOAuth2TokenWithGroups("testUser", List.of("developers"));

    // when
    synchronizer.synchronize(token);

    // then - should not sync groups
    verify(identityService, never()).newGroup(eq("developers"));
    verify(identityService, never()).createMembership(anyString(), eq("developers"));
  }

  @Test
  public void shouldRemoveObsoleteGroupMembershipsWhenEnabled() {
    // given
    oAuth2Properties.getUserSync().setSyncGroups(true);
    oAuth2Properties.getUserSync().setRemoveObsoleteGroupMemberships(true);
    synchronizer = new OAuth2UserSynchronizer(processEngine, oAuth2Properties);

    User existingUser = mock(User.class);
    UserQuery userQuery = mock(UserQuery.class);
    when(identityService.createUserQuery()).thenReturn(userQuery);
    when(userQuery.userId(anyString())).thenReturn(userQuery);
    when(userQuery.memberOfGroup(anyString())).thenReturn(userQuery);
    when(userQuery.singleResult()).thenReturn(existingUser);
    when(userQuery.count()).thenReturn(1L);

    // User is member of "oldgroup" in database but not in OAuth2 token
    Group oldGroup = mock(Group.class);
    when(oldGroup.getId()).thenReturn("oldgroup");

    GroupQuery groupQuery = mock(GroupQuery.class);
    when(identityService.createGroupQuery()).thenReturn(groupQuery);
    when(groupQuery.groupId(anyString())).thenReturn(groupQuery);
    when(groupQuery.groupMember(anyString())).thenReturn(groupQuery);
    when(groupQuery.singleResult()).thenReturn(null);
    when(groupQuery.list()).thenReturn(List.of(oldGroup));

    Group newGroup = mock(Group.class);
    when(identityService.newGroup(anyString())).thenReturn(newGroup);

    OAuth2AuthenticationToken token = createOAuth2TokenWithGroups("testUser", List.of("newgroup"));

    // when
    synchronizer.synchronize(token);

    // then - should remove membership from oldgroup
    verify(identityService).deleteMembership("testUser", "oldgroup");
  }

  @Test
  public void shouldSanitizeUserIdWithSpecialCharacters() {
    // given
    oAuth2Properties.getUserSync().setAutoCreateUsers(true);
    synchronizer = new OAuth2UserSynchronizer(processEngine, oAuth2Properties);

    UserQuery userQuery = mock(UserQuery.class);
    when(identityService.createUserQuery()).thenReturn(userQuery);
    when(userQuery.userId(anyString())).thenReturn(userQuery);
    when(userQuery.memberOfGroup(anyString())).thenReturn(userQuery);
    when(userQuery.singleResult()).thenReturn(null);
    when(userQuery.count()).thenReturn(1L); // Admin exists (not first user)

    User newUser = mock(User.class);
    when(identityService.newUser(anyString())).thenReturn(newUser);

    GroupQuery groupQuery = mock(GroupQuery.class);
    when(identityService.createGroupQuery()).thenReturn(groupQuery);
    when(groupQuery.groupId(anyString())).thenReturn(groupQuery);
    when(groupQuery.singleResult()).thenReturn(null);

    Group userGroup = mock(Group.class);
    when(identityService.newGroup(anyString())).thenReturn(userGroup);

    // User ID with special characters (email format)
    OAuth2AuthenticationToken token = createOAuth2Token("user@example.com");

    // when
    synchronizer.synchronize(token);

    // then - should sanitize user ID
    ArgumentCaptor<String> userIdCaptor = ArgumentCaptor.forClass(String.class);
    verify(identityService).newUser(userIdCaptor.capture());
    assertThat(userIdCaptor.getValue()).isEqualTo("userexamplecom");
  }

  @Test
  public void shouldExtractUserInfoFromOidcUser() {
    // given
    oAuth2Properties.getUserSync().setAutoCreateUsers(true);
    synchronizer = new OAuth2UserSynchronizer(processEngine, oAuth2Properties);

    UserQuery userQuery = mock(UserQuery.class);
    when(identityService.createUserQuery()).thenReturn(userQuery);
    when(userQuery.userId(anyString())).thenReturn(userQuery);
    when(userQuery.memberOfGroup(anyString())).thenReturn(userQuery);
    when(userQuery.singleResult()).thenReturn(null);
    when(userQuery.count()).thenReturn(1L);

    User newUser = mock(User.class);
    when(identityService.newUser(anyString())).thenReturn(newUser);

    GroupQuery groupQuery = mock(GroupQuery.class);
    when(identityService.createGroupQuery()).thenReturn(groupQuery);
    when(groupQuery.groupId(anyString())).thenReturn(groupQuery);
    when(groupQuery.singleResult()).thenReturn(null);

    Group userGroup = mock(Group.class);
    when(identityService.newGroup(anyString())).thenReturn(userGroup);

    // Create OIDC token with standard claims
    OidcIdToken idToken = OidcIdToken.withTokenValue("token")
        .claim("sub", "oidcuser")
        .claim("given_name", "John")
        .claim("family_name", "Doe")
        .claim("email", "john.doe@example.com")
        .issuedAt(Instant.now())
        .expiresAt(Instant.now().plusSeconds(3600))
        .build();

    OidcUser oidcUser = new DefaultOidcUser(
        AuthorityUtils.createAuthorityList("USER"),
        idToken,
        "sub"
    );

    OAuth2AuthenticationToken token = new OAuth2AuthenticationToken(
        oidcUser,
        AuthorityUtils.createAuthorityList("USER"),
        "test-provider"
    );

    // when
    synchronizer.synchronize(token);

    // then
    verify(newUser).setFirstName("John");
    verify(newUser).setLastName("Doe");
    verify(newUser).setEmail("john.doe@example.com");
  }

  @Test
  public void shouldFilterRoleAndScopeAuthoritiesWhenSyncingGroups() {
    // given
    oAuth2Properties.getUserSync().setSyncGroups(true);
    synchronizer = new OAuth2UserSynchronizer(processEngine, oAuth2Properties);

    User existingUser = mock(User.class);
    UserQuery userQuery = mock(UserQuery.class);
    when(identityService.createUserQuery()).thenReturn(userQuery);
    when(userQuery.userId(anyString())).thenReturn(userQuery);
    when(userQuery.memberOfGroup(anyString())).thenReturn(userQuery);
    when(userQuery.singleResult()).thenReturn(existingUser);
    when(userQuery.count()).thenReturn(1L);

    GroupQuery groupQuery = mock(GroupQuery.class);
    when(identityService.createGroupQuery()).thenReturn(groupQuery);
    when(groupQuery.groupId(anyString())).thenReturn(groupQuery);
    when(groupQuery.groupMember(anyString())).thenReturn(groupQuery);
    when(groupQuery.singleResult()).thenReturn(null);
    when(groupQuery.list()).thenReturn(Collections.emptyList());

    Group newGroup = mock(Group.class);
    when(identityService.newGroup(anyString())).thenReturn(newGroup);

    // Create token with ROLE_ and SCOPE_ prefixed authorities (should be filtered)
    OAuth2User oAuth2User = new DefaultOAuth2User(
        List.of(
            new SimpleGrantedAuthority("ROLE_USER"),
            new SimpleGrantedAuthority("SCOPE_openid"),
            new SimpleGrantedAuthority("developers") // only this should be synced
        ),
        Map.of("name", "testUser"),
        "name"
    );
    OAuth2AuthenticationToken token = new OAuth2AuthenticationToken(
        oAuth2User,
        oAuth2User.getAuthorities(),
        "test-provider"
    );

    // when
    synchronizer.synchronize(token);

    // then - should only create "developers" group, not ROLE_USER or SCOPE_openid
    verify(identityService, times(1)).newGroup("developers");
    verify(identityService, never()).newGroup("ROLE_USER");
    verify(identityService, never()).newGroup("SCOPE_openid");
  }

  @Test
  public void shouldRestoreSecurityContextAfterSync() {
    // given
    OAuth2AuthenticationToken originalAuth = createOAuth2Token("originalUser");
    SecurityContextHolder.getContext().setAuthentication(originalAuth);

    oAuth2Properties.getUserSync().setEnabled(false); // Quick path
    synchronizer = new OAuth2UserSynchronizer(processEngine, oAuth2Properties);

    OAuth2AuthenticationToken tokenToSync = createOAuth2Token("userToSync");

    // when
    synchronizer.synchronize(tokenToSync);

    // then - original authentication should be restored
    assertThat(SecurityContextHolder.getContext().getAuthentication()).isEqualTo(originalAuth);
  }

  private OAuth2AuthenticationToken createOAuth2Token(String username) {
    OAuth2User oAuth2User = new DefaultOAuth2User(
        AuthorityUtils.createAuthorityList("USER"),
        Map.of("name", username),
        "name"
    );
    return new OAuth2AuthenticationToken(
        oAuth2User,
        AuthorityUtils.createAuthorityList("USER"),
        "test-provider"
    );
  }

  private OAuth2AuthenticationToken createOAuth2TokenWithDetails(String username, String firstName, String lastName, String email) {
    OAuth2User oAuth2User = new DefaultOAuth2User(
        AuthorityUtils.createAuthorityList("USER"),
        Map.of(
            "name", firstName + " " + lastName,
            "email", email,
            "sub", username
        ),
        "sub"
    );
    return new OAuth2AuthenticationToken(
        oAuth2User,
        AuthorityUtils.createAuthorityList("USER"),
        "test-provider"
    );
  }

  private OAuth2AuthenticationToken createOAuth2TokenWithGroups(String username, List<String> groups) {
    List<SimpleGrantedAuthority> authorities = groups.stream()
        .map(SimpleGrantedAuthority::new)
        .toList();

    OAuth2User oAuth2User = new DefaultOAuth2User(
        authorities,
        Map.of("name", username),
        "name"
    );
    return new OAuth2AuthenticationToken(
        oAuth2User,
        authorities,
        "test-provider"
    );
  }
}
