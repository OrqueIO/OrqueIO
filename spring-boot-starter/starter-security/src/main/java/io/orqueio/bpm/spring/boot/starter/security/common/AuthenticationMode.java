package io.orqueio.bpm.spring.boot.starter.security.common;

/**
 * Authentication modes supported by OrqueIO.
 *
 * This enum defines the different authentication strategies available:
 * - BASIC: Traditional database authentication (existing behavior)
 * - OIDC: OpenID Connect with any standard-compliant IdP
 * - SAML: SAML 2.0 with any standard-compliant IdP
 */
public enum AuthenticationMode {

    /**
     * Basic authentication using database credentials.
     * This is the default and existing behavior.
     */
    BASIC,

    /**
     * OpenID Connect (OIDC) authentication.
     * Supports any OIDC-compliant identity provider (Keycloak, Azure AD, Okta, etc.)
     */
    OIDC,

    /**
     * SAML 2.0 authentication.
     * Supports any SAML 2.0-compliant identity provider.
     */
    SAML
}
