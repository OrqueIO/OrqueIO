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
package io.orqueio.bpm.spring.boot.starter.security.common;

import io.orqueio.bpm.spring.boot.starter.property.OrqueioBpmProperties;
import io.orqueio.bpm.spring.boot.starter.security.oidc.UniversalOIDCProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.NestedConfigurationProperty;


@ConfigurationProperties(UniversalAuthenticationProperties.PREFIX)
public class UniversalAuthenticationProperties {

    public static final String PREFIX = OrqueioBpmProperties.PREFIX + ".security";

    /**
     * Authentication mode to use.
     * - BASIC: Database authentication (default, existing behavior)
     * - OIDC: OpenID Connect authentication
     * - SAML: SAML 2.0 authentication
     *
     * Default: BASIC (maintains backward compatibility)
     */
    private AuthenticationMode mode = AuthenticationMode.BASIC;

    /**
     * Automatically create users in the database on first SSO login.
     *
     * When enabled:
     * - If a user authenticates via SSO but doesn't exist in OrqueIO database,
     *   a new user will be created automatically with information from the IdP.
     *
     * When disabled:
     * - User must exist in the database before SSO login (same as current OAuth2 behavior).
     *
     * Default: true
     */
    private boolean autoCreateUsers = true;

    /**
     * Automatically update user information from IdP on each login.
     *
     * When enabled:
     * - User's email, first name, last name are updated from IdP claims/attributes
     *   on every successful authentication.
     *
     * When disabled:
     * - User information is only set during initial creation (if autoCreateUsers is true),
     *   or remains unchanged if user already exists.
     *
     * Default: true
     */
    private boolean autoUpdateUsers = true;

    /**
     * Synchronize user groups from IdP to OrqueIO database.
     *
     * When enabled:
     * - Groups from IdP are automatically created in the database if they don't exist.
     * - User memberships are synchronized (added to new groups, removed from old ones).
     *
     * When disabled:
     * - Groups must be managed manually in OrqueIO.
     * - IdP group information is ignored.
     *
     * Default: true
     */
    private boolean syncGroups = true;

    /**
     * Enable fallback to database authentication if SSO fails.
     *
     * When enabled:
     * - If IdP is unreachable or SSO authentication fails, users can still
     *   authenticate using database credentials (login/password form).
     * - Provides continuity of service during IdP outages.
     *
     * When disabled:
     * - If SSO fails, users cannot authenticate at all.
     * - More secure but less available.
     *
     * Default: true (recommended for production)
     */
    private boolean fallbackToDatabase = true;

    /**
     * OIDC configuration (used when mode = OIDC).
     * Contains issuer-uri, client-id, client-secret, scopes, and claims mapping.
     */
    @NestedConfigurationProperty
    private UniversalOIDCProperties oidc;

    // Getters and Setters

    public AuthenticationMode getMode() {
        return mode;
    }

    public void setMode(AuthenticationMode mode) {
        this.mode = mode;
    }

    public boolean isAutoCreateUsers() {
        return autoCreateUsers;
    }

    public void setAutoCreateUsers(boolean autoCreateUsers) {
        this.autoCreateUsers = autoCreateUsers;
    }

    public boolean isAutoUpdateUsers() {
        return autoUpdateUsers;
    }

    public void setAutoUpdateUsers(boolean autoUpdateUsers) {
        this.autoUpdateUsers = autoUpdateUsers;
    }

    public boolean isSyncGroups() {
        return syncGroups;
    }

    public void setSyncGroups(boolean syncGroups) {
        this.syncGroups = syncGroups;
    }

    public boolean isFallbackToDatabase() {
        return fallbackToDatabase;
    }

    public void setFallbackToDatabase(boolean fallbackToDatabase) {
        this.fallbackToDatabase = fallbackToDatabase;
    }

    public UniversalOIDCProperties getOidc() {
        return oidc;
    }

    public void setOidc(UniversalOIDCProperties oidc) {
        this.oidc = oidc;
    }
}
