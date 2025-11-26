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

import io.orqueio.bpm.engine.identity.Group;
import io.orqueio.bpm.engine.identity.GroupQuery;
import io.orqueio.bpm.engine.identity.NativeUserQuery;
import io.orqueio.bpm.engine.identity.Tenant;
import io.orqueio.bpm.engine.identity.TenantQuery;
import io.orqueio.bpm.engine.identity.User;
import io.orqueio.bpm.engine.identity.UserQuery;
import io.orqueio.bpm.engine.impl.GroupQueryImpl;
import io.orqueio.bpm.engine.impl.Page;
import io.orqueio.bpm.engine.impl.TenantQueryImpl;
import io.orqueio.bpm.engine.impl.UserQueryImpl;
import io.orqueio.bpm.engine.impl.identity.IdentityOperationResult;
import io.orqueio.bpm.engine.impl.identity.IdentityProviderException;
import io.orqueio.bpm.engine.impl.identity.db.DbIdentityServiceProvider;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.persistence.entity.GroupEntity;
import io.orqueio.bpm.engine.impl.persistence.entity.TenantEntity;
import io.orqueio.bpm.engine.impl.persistence.entity.UserEntity;
import io.orqueio.bpm.spring.boot.starter.security.common.UniversalAuthenticationProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;


public class UniversalOIDCIdentityProvider extends DbIdentityServiceProvider {

    private static final Logger logger = LoggerFactory.getLogger(UniversalOIDCIdentityProvider.class);

    private final UniversalAuthenticationProperties authProperties;

    public UniversalOIDCIdentityProvider(UniversalAuthenticationProperties authProperties) {
        this.authProperties = authProperties;
    }

    /**
     *
     * @return 
     */
    protected boolean isOidcAuthenticated() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean authenticated = authentication != null
            && authentication.isAuthenticated()
            && authentication instanceof OAuth2AuthenticationToken;

        logger.debug("Using {} identity provider",
            authenticated ? "OIDC" : "Database");

        return authenticated;
    }

    /**
     * @return
     */
    protected UserEntity transformUserFromOidc() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof OAuth2AuthenticationToken)) {
            return null;
        }

        OAuth2AuthenticationToken oauth2Token = (OAuth2AuthenticationToken) authentication;
        Object principal = oauth2Token.getPrincipal();

        if (!(principal instanceof OidcUser)) {
            logger.warn("Principal is not OidcUser");
            return null;
        }

        OidcUser oidcUser = (OidcUser) principal;
        UniversalOIDCProperties oidcProps = authProperties.getOidc();

        if (oidcProps == null) {
            logger.warn("OIDC properties not configured");
            return null;
        }

        String userIdClaim = oidcProps.getClaims().getUserId();
        Object userIdValue = oidcUser.getAttribute(userIdClaim);
        String userId = userIdValue != null ? userIdValue.toString() : oauth2Token.getName();

        UserEntity user = new UserEntity();
        user.setId(userId);

        Map<String, Object> attributes = oidcUser.getAttributes();
        UniversalOIDCProperties.ClaimsMapping claims = oidcProps.getClaims();

        Object firstName = attributes.get(claims.getFirstName());
        if (firstName != null) {
            user.setFirstName(firstName.toString());
        }

        Object lastName = attributes.get(claims.getLastName());
        if (lastName != null) {
            user.setLastName(lastName.toString());
        }

        Object email = attributes.get(claims.getEmail());
        if (email != null) {
            user.setEmail(email.toString());
        }

        return user;
    }

    /**
     * @return 
     */
    @SuppressWarnings("unchecked")
    protected List<Group> transformGroupsFromOidc() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof OAuth2AuthenticationToken)) {
            return Collections.emptyList();
        }

        OAuth2AuthenticationToken oauth2Token = (OAuth2AuthenticationToken) authentication;
        Object principal = oauth2Token.getPrincipal();

        if (principal instanceof OidcUser) {
            OidcUser oidcUser = (OidcUser) principal;
            UniversalOIDCProperties oidcProps = authProperties.getOidc();

            if (oidcProps != null) {
                String groupsClaim = oidcProps.getClaims().getGroups();
                Object groupsValue = oidcUser.getAttribute(groupsClaim);

                if (groupsValue instanceof List) {
                    return ((List<?>) groupsValue).stream()
                        .map(g -> {
                            GroupEntity group = new GroupEntity();
                            group.setId(g.toString());
                            group.setName(g.toString());
                            return group;
                        })
                        .collect(Collectors.toList());
                }
            }
        }

        return oauth2Token.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .filter(auth -> !auth.startsWith("SCOPE_")) 
            .map(auth -> {
                GroupEntity group = new GroupEntity();
                group.setId(auth);
                group.setName(auth);
                return group;
            })
            .collect(Collectors.toList());
    }

    protected static boolean nullOrContainsIgnoreCase(String searchLike, String value) {
        return searchLike == null || value == null ||
            value.toLowerCase().contains(searchLike.replaceAll("%", "").toLowerCase());
    }


    public static class OidcUserQuery extends UserQueryImpl {

        private final UniversalOIDCIdentityProvider provider;

        public OidcUserQuery(UniversalOIDCIdentityProvider provider) {
            this.provider = provider;
        }

        @Override
        public long executeCount(CommandContext commandContext) {
            return 1;  
        }

        @Override
        public List<User> executeList(CommandContext commandContext, Page page) {
            if (this.tenantId != null) {
                throw new IdentityProviderException(
                    "Tenant filtering is not supported for OIDC identity provider");
            }

            return Stream.of(provider.transformUserFromOidc())
                .filter(Objects::nonNull)
                .filter(u -> this.id == null || this.id.equals(u.getId()))
                .filter(u -> this.ids == null || Arrays.stream(this.ids).anyMatch(id -> u.getId().equals(id)))
                .filter(u -> this.firstName == null || this.firstName.equals(u.getFirstName()))
                .filter(u -> nullOrContainsIgnoreCase(this.firstNameLike, u.getFirstName()))
                .filter(u -> this.lastName == null || this.lastName.equals(u.getLastName()))
                .filter(u -> nullOrContainsIgnoreCase(this.lastNameLike, u.getLastName()))
                .filter(u -> this.email == null || this.email.equals(u.getEmail()))
                .filter(u -> nullOrContainsIgnoreCase(this.emailLike, u.getEmail()))
                .filter(u -> this.groupId == null ||
                    provider.transformGroupsFromOidc().stream().anyMatch(g -> g.getId().equals(this.groupId)))
                .collect(Collectors.toList());
        }
    }

    @Override
    public UserEntity findUserById(String userId) {
        if (isOidcAuthenticated()) {
            var user = transformUserFromOidc();
            return user != null && Objects.equals(userId, user.getId()) ? user : null;
        } else {
            return super.findUserById(userId);
        }
    }

    @Override
    public UserQuery createUserQuery() {
        return isOidcAuthenticated() ? new OidcUserQuery(this) : super.createUserQuery();
    }

    @Override
    public UserQueryImpl createUserQuery(CommandContext commandContext) {
        return isOidcAuthenticated() ? new OidcUserQuery(this) : super.createUserQuery(commandContext);
    }

    @Override
    public NativeUserQuery createNativeUserQuery() {
        if (isOidcAuthenticated()) {
            throw new IdentityProviderException(
                "Native user queries are not supported for OIDC identity provider");
        }
        return super.createNativeUserQuery();
    }

    @Override
    public boolean checkPassword(String userId, String password) {
        return !isOidcAuthenticated() && super.checkPassword(userId, password);
    }

    public static class OidcGroupQuery extends GroupQueryImpl {

        private final UniversalOIDCIdentityProvider provider;

        public OidcGroupQuery(UniversalOIDCIdentityProvider provider) {
            this.provider = provider;
        }

        @Override
        public long executeCount(CommandContext commandContext) {
            return executeList(commandContext, null).size();
        }

        @Override
        public List<Group> executeList(CommandContext commandContext, Page page) {
            if (this.type != null || this.tenantId != null) {
                throw new IdentityProviderException(
                    "Type and tenant filtering are not supported for OIDC identity provider");
            }

            return provider.transformGroupsFromOidc().stream()
                .filter(g -> this.id == null || this.id.equals(g.getId()))
                .filter(g -> this.ids == null || Arrays.stream(this.ids).anyMatch(id -> g.getId().equals(id)))
                .filter(g -> this.name == null || this.name.equals(g.getName()))
                .filter(g -> nullOrContainsIgnoreCase(this.nameLike, g.getName()))
                .filter(g -> {
                    var user = provider.transformUserFromOidc();
                    return this.userId == null || user == null || this.userId.equals(user.getId());
                })
                .collect(Collectors.toList());
        }
    }

    @Override
    public GroupEntity findGroupById(String groupId) {
        if (isOidcAuthenticated()) {
            var groups = transformGroupsFromOidc();
            return (GroupEntity) groups.stream()
                .filter(g -> g.getId().equals(groupId))
                .findFirst()
                .orElse(null);
        } else {
            return super.findGroupById(groupId);
        }
    }

    @Override
    public GroupQuery createGroupQuery() {
        return isOidcAuthenticated() ? new OidcGroupQuery(this) : super.createGroupQuery();
    }

    @Override
    public GroupQuery createGroupQuery(CommandContext commandContext) {
        return isOidcAuthenticated() ? new OidcGroupQuery(this) : super.createGroupQuery(commandContext);
    }

    public static class OidcTenantQuery extends TenantQueryImpl {
        @Override
        public long executeCount(CommandContext commandContext) {
            return 0;
        }

        @Override
        public List<Tenant> executeList(CommandContext commandContext, Page page) {
            return Collections.emptyList();
        }
    }

    @Override
    public TenantEntity findTenantById(String tenantId) {
        return isOidcAuthenticated() ? null : super.findTenantById(tenantId);
    }

    @Override
    public TenantQuery createTenantQuery() {
        return isOidcAuthenticated() ? new OidcTenantQuery() : super.createTenantQuery();
    }

    @Override
    public TenantQuery createTenantQuery(CommandContext commandContext) {
        return isOidcAuthenticated() ? new OidcTenantQuery() : super.createTenantQuery();
    }

    @Override
    public void flush() {
        if (!isOidcAuthenticated()) {
            super.flush();
        }
    }

    @Override
    public void close() {
        if (!isOidcAuthenticated()) {
            super.close();
        }
    }

    protected void checkWriteAllowed() {
        if (isOidcAuthenticated()) {
            throw new IdentityProviderException(
                "Write operations are not supported when authenticated via OIDC. " +
                "User and group data is managed by the Identity Provider."
            );
        }
    }

    @Override
    public UserEntity createNewUser(String userId) {
        checkWriteAllowed();
        return super.createNewUser(userId);
    }

    @Override
    public IdentityOperationResult saveUser(User user) {
        checkWriteAllowed();
        return super.saveUser(user);
    }

    @Override
    public IdentityOperationResult deleteUser(String userId) {
        checkWriteAllowed();
        return super.deleteUser(userId);
    }

    @Override
    public IdentityOperationResult unlockUser(String userId) {
        checkWriteAllowed();
        return super.unlockUser(userId);
    }

    @Override
    public GroupEntity createNewGroup(String groupId) {
        checkWriteAllowed();
        return super.createNewGroup(groupId);
    }

    @Override
    public IdentityOperationResult saveGroup(Group group) {
        checkWriteAllowed();
        return super.saveGroup(group);
    }

    @Override
    public IdentityOperationResult deleteGroup(String groupId) {
        checkWriteAllowed();
        return super.deleteGroup(groupId);
    }

    @Override
    public Tenant createNewTenant(String tenantId) {
        checkWriteAllowed();
        return super.createNewTenant(tenantId);
    }

    @Override
    public IdentityOperationResult saveTenant(Tenant tenant) {
        checkWriteAllowed();
        return super.saveTenant(tenant);
    }

    @Override
    public IdentityOperationResult deleteTenant(String tenantId) {
        checkWriteAllowed();
        return super.deleteTenant(tenantId);
    }

    @Override
    public IdentityOperationResult createMembership(String userId, String groupId) {
        checkWriteAllowed();
        return super.createMembership(userId, groupId);
    }

    @Override
    public IdentityOperationResult deleteMembership(String userId, String groupId) {
        checkWriteAllowed();
        return super.deleteMembership(userId, groupId);
    }

    @Override
    public IdentityOperationResult createTenantUserMembership(String tenantId, String userId) {
        checkWriteAllowed();
        return super.createTenantUserMembership(tenantId, userId);
    }

    @Override
    public IdentityOperationResult createTenantGroupMembership(String tenantId, String groupId) {
        checkWriteAllowed();
        return super.createTenantGroupMembership(tenantId, groupId);
    }

    @Override
    public IdentityOperationResult deleteTenantUserMembership(String tenantId, String userId) {
        checkWriteAllowed();
        return super.deleteTenantUserMembership(tenantId, userId);
    }

    @Override
    public IdentityOperationResult deleteTenantGroupMembership(String tenantId, String groupId) {
        checkWriteAllowed();
        return super.deleteTenantGroupMembership(tenantId, groupId);
    }
}
