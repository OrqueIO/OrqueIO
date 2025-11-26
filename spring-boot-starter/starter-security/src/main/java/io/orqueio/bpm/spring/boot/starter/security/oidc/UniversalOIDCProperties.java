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

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


public class UniversalOIDCProperties {

    /**
     * OIDC issuer URI (discovery endpoint).
     * Example: https://keycloak.example.com/realms/orqueio
     */
    private String issuerUri;

    /**
     * OAuth2 Client ID (registered in the IdP).
     */
    private String clientId;

    /**
     * OAuth2 Client Secret (obtained from the IdP).
     * Important: Store this securely! Consider using environment variables.
     */
    private String clientSecret;

    /**
     * Which claim to use as the user ID (username).
     * Default: preferred_username
     *
     * Common values:
     * - preferred_username (Keycloak, most IdPs)
     * - sub (unique subject identifier)
     * - email (if email is used as username)
     */
    private String userNameAttribute = "preferred_username";

    /**
     * OAuth2 scopes to request from the IdP.
     * Default: [openid, profile, email]
     *
     * Note: "openid" is REQUIRED for OIDC (differentiates OIDC from plain OAuth2)
     */
    private List<String> scopes = Arrays.asList("openid", "profile", "email");

    /**
     * Mapping of IdP claims to OrqueIO user attributes.
     * This allows flexibility for different IdPs that use different claim names.
     */
    private ClaimsMapping claims = new ClaimsMapping();

    /**
     * Mapping configuration for user attributes from OIDC claims.
     */
    public static class ClaimsMapping {
        /**
         * Claim name for user ID (username).
         * Default: preferred_username
         */
        private String userId = "preferred_username";

        /**
         * Claim name for first name.
         * Default: given_name (standard OIDC claim)
         */
        private String firstName = "given_name";

        /**
         * Claim name for last name.
         * Default: family_name (standard OIDC claim)
         */
        private String lastName = "family_name";

        /**
         * Claim name for email.
         * Default: email (standard OIDC claim)
         */
        private String email = "email";

        /**
         * Claim name for groups/roles.
         * Default: groups
         *
         * Note: This may require additional IdP configuration
         * (e.g., Keycloak mapper for groups claim)
         */
        private String groups = "groups";


        public String getUserId() {
            return userId;
        }

        public void setUserId(String userId) {
            this.userId = userId;
        }

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getGroups() {
            return groups;
        }

        public void setGroups(String groups) {
            this.groups = groups;
        }

        public Map<String, String> toMap() {
            Map<String, String> map = new HashMap<>();
            map.put("userId", userId);
            map.put("firstName", firstName);
            map.put("lastName", lastName);
            map.put("email", email);
            map.put("groups", groups);
            return map;
        }
    }

    public String getIssuerUri() {
        return issuerUri;
    }

    public void setIssuerUri(String issuerUri) {
        this.issuerUri = issuerUri;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getUserNameAttribute() {
        return userNameAttribute;
    }

    public void setUserNameAttribute(String userNameAttribute) {
        this.userNameAttribute = userNameAttribute;
    }

    public List<String> getScopes() {
        return scopes;
    }

    public void setScopes(List<String> scopes) {
        this.scopes = scopes;
    }

    public ClaimsMapping getClaims() {
        return claims;
    }

    public void setClaims(ClaimsMapping claims) {
        this.claims = claims;
    }
}
