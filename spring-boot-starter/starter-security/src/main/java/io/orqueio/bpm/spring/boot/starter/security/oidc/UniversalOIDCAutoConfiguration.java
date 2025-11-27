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

import jakarta.servlet.DispatcherType;
import jakarta.servlet.Filter;
import io.orqueio.bpm.engine.rest.security.auth.ProcessEngineAuthenticationFilter;
import io.orqueio.bpm.engine.spring.SpringProcessEngineServicesConfiguration;
import io.orqueio.bpm.spring.boot.starter.OrqueioBpmAutoConfiguration;
import io.orqueio.bpm.spring.boot.starter.property.OrqueioBpmProperties;
import io.orqueio.bpm.spring.boot.starter.property.WebappProperty;
import io.orqueio.bpm.spring.boot.starter.security.common.AuthenticationMode;
import io.orqueio.bpm.spring.boot.starter.security.common.UniversalAuthenticationProperties;
import io.orqueio.bpm.webapp.impl.security.auth.ContainerBasedAuthenticationFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.AutoConfigureOrder;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.security.SecurityProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.web.SecurityFilterChain;

import java.util.Map;


@Configuration
@AutoConfigureOrder(UniversalOIDCAutoConfiguration.UNIVERSAL_OIDC_ORDER)
@AutoConfigureAfter({ OrqueioBpmAutoConfiguration.class, SpringProcessEngineServicesConfiguration.class })
@ConditionalOnBean(OrqueioBpmProperties.class)
@ConditionalOnProperty(
    name = "orqueio.bpm.security.mode",
    havingValue = "OIDC"
)
@EnableConfigurationProperties({ UniversalAuthenticationProperties.class })
public class UniversalOIDCAutoConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(UniversalOIDCAutoConfiguration.class);
    public static final int UNIVERSAL_OIDC_ORDER = Ordered.HIGHEST_PRECEDENCE + 110;

    private final UniversalAuthenticationProperties authProperties;
    private final String webappPath;

    public UniversalOIDCAutoConfiguration(
        OrqueioBpmProperties orqueioBpmProperties,
        UniversalAuthenticationProperties authProperties
    ) {
        this.authProperties = authProperties;
        WebappProperty webapp = orqueioBpmProperties.getWebapp();
        this.webappPath = webapp.getApplicationPath();

        logger.info("Initializing Universal OIDC Auto-Configuration");
        logger.info("  Mode: {}", authProperties.getMode());
        logger.info("  Auto-create users: {}", authProperties.isAutoCreateUsers());
        logger.info("  Sync groups: {}", authProperties.isSyncGroups());
        logger.info("  Fallback to database: {}", authProperties.isFallbackToDatabase());
    }


    @Bean
    public FilterRegistrationBean<?> webappAuthenticationFilter() {
        logger.debug("Registering ContainerBasedAuthenticationFilter for OIDC");

        FilterRegistrationBean<Filter> filterRegistration = new FilterRegistrationBean<>();
        filterRegistration.setName("Universal OIDC Authentication Filter");
        filterRegistration.setFilter(new ContainerBasedAuthenticationFilter());

        filterRegistration.setInitParameters(Map.of(
            ProcessEngineAuthenticationFilter.AUTHENTICATION_PROVIDER_PARAM,
            "io.orqueio.bpm.spring.boot.starter.security.oidc.UniversalOIDCAuthenticationProvider"
        ));

        filterRegistration.setOrder(SecurityProperties.DEFAULT_FILTER_ORDER + 1);

        filterRegistration.addUrlPatterns(webappPath + "/app/*", webappPath + "/api/*");
        filterRegistration.setDispatcherTypes(DispatcherType.REQUEST);

        return filterRegistration;
    }


    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        UniversalOIDCProperties oidc = authProperties.getOidc();

        if (oidc == null || oidc.getIssuerUri() == null) {
            throw new IllegalStateException(
                "OIDC mode is enabled but orqueio.bpm.security.oidc is not configured. " +
                "Please provide issuer-uri, client-id, and client-secret."
            );
        }

        logger.info("Configuring OIDC client:");
        logger.info("  Issuer URI: {}", oidc.getIssuerUri());
        logger.info("  Client ID: {}", oidc.getClientId());
        logger.info("  Scopes: {}", oidc.getScopes());

        ClientRegistration registration = ClientRegistration
            .withRegistrationId("orqueio-oidc")  
            .clientId(oidc.getClientId())
            .clientSecret(oidc.getClientSecret())
            .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
            .scope(oidc.getScopes())
            .issuerUri(oidc.getIssuerUri())  
            .clientName("OrqueIO OIDC")
            .build();

        return new InMemoryClientRegistrationRepository(registration);
    }


    @Bean
    public OidcLogoutSuccessHandler oidcLogoutSuccessHandler(
        ClientRegistrationRepository clientRegistrationRepository
    ) {
        logger.info("Configuring OIDC logout success handler");
        // Post-logout redirect URI: where to send user after IdP logout
        String postLogoutRedirectUri = webappPath + "/";
        return new OidcLogoutSuccessHandler(clientRegistrationRepository, postLogoutRedirectUri);
    }

    @Bean
    public SecurityFilterChain filterChain(
        HttpSecurity http,
        OidcLogoutSuccessHandler oidcLogoutSuccessHandler
    ) throws Exception {
        logger.info("Configuring Spring Security filter chain for OIDC");

        http
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(webappPath + "/app/**").authenticated()
                .requestMatchers(webappPath + "/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .oauth2Login(Customizer.withDefaults())
            .oauth2Client(Customizer.withDefaults())
            .logout(logout -> logout
                .clearAuthentication(true)
                .invalidateHttpSession(true)
                .logoutSuccessHandler(oidcLogoutSuccessHandler)
            )
            .anonymous(AbstractHttpConfigurer::disable)
            .cors(AbstractHttpConfigurer::disable)
            .csrf(AbstractHttpConfigurer::disable);

        return http.build();
    }

    @Bean
    public UniversalOIDCIdentityProviderPlugin identityProviderPlugin() {
        logger.info("Registering UniversalOIDCIdentityProviderPlugin");
        return new UniversalOIDCIdentityProviderPlugin(authProperties);
    }
}
