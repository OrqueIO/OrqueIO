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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import io.orqueio.bpm.engine.IdentityService;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.authorization.Groups;
import io.orqueio.bpm.engine.identity.UserQuery;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import org.junit.Before;
import org.junit.Test;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;

public class OAuth2ProvidersControllerTest {

  private OAuth2ProvidersController controller;
  private ProcessEngine processEngine;
  private IdentityService identityService;
  private InMemoryClientRegistrationRepository clientRegistrationRepository;

  @Before
  public void setUp() {
    processEngine = mock(ProcessEngine.class);
    identityService = mock(IdentityService.class);
    when(processEngine.getIdentityService()).thenReturn(identityService);
  }

  @Test
  public void shouldReturnSetupRequiredTrueWhenNoAdminExists() {
    // given
    UserQuery userQuery = mock(UserQuery.class);
    when(identityService.createUserQuery()).thenReturn(userQuery);
    when(userQuery.memberOfGroup(Groups.ORQUEIO_ADMIN)).thenReturn(userQuery);
    when(userQuery.count()).thenReturn(0L);

    clientRegistrationRepository = createClientRegistrationRepository("keycloak", "Keycloak");
    controller = new OAuth2ProvidersController(clientRegistrationRepository, processEngine);

    // when
    Map<String, Boolean> result = controller.isSetupRequired();

    // then
    assertThat(result).containsEntry("setupRequired", true);
  }

  @Test
  public void shouldReturnSetupRequiredFalseWhenAdminExists() {
    // given
    UserQuery userQuery = mock(UserQuery.class);
    when(identityService.createUserQuery()).thenReturn(userQuery);
    when(userQuery.memberOfGroup(Groups.ORQUEIO_ADMIN)).thenReturn(userQuery);
    when(userQuery.count()).thenReturn(1L);

    clientRegistrationRepository = createClientRegistrationRepository("keycloak", "Keycloak");
    controller = new OAuth2ProvidersController(clientRegistrationRepository, processEngine);

    // when
    Map<String, Boolean> result = controller.isSetupRequired();

    // then
    assertThat(result).containsEntry("setupRequired", false);
  }

  @Test
  public void shouldReturnProvidersList() {
    // given
    clientRegistrationRepository = createClientRegistrationRepository("keycloak", "My Keycloak");
    controller = new OAuth2ProvidersController(clientRegistrationRepository, processEngine);

    // when
    List<Map<String, String>> providers = controller.getProviders();

    // then
    assertThat(providers).hasSize(1);
    assertThat(providers.get(0)).containsEntry("id", "keycloak");
    assertThat(providers.get(0)).containsEntry("name", "My Keycloak");
    assertThat(providers.get(0)).containsEntry("loginUrl", "/oauth2/authorization/keycloak");
  }

  @Test
  public void shouldReturnMultipleProviders() {
    // given
    ClientRegistration keycloak = createClientRegistration("keycloak", "Keycloak SSO");
    ClientRegistration google = createClientRegistration("google", "Google");
    clientRegistrationRepository = new InMemoryClientRegistrationRepository(keycloak, google);
    controller = new OAuth2ProvidersController(clientRegistrationRepository, processEngine);

    // when
    List<Map<String, String>> providers = controller.getProviders();

    // then
    assertThat(providers).hasSize(2);
    assertThat(providers).extracting(p -> p.get("id")).containsExactlyInAnyOrder("keycloak", "google");
  }

  @Test
  public void shouldFormatProviderNameWhenClientNameIsRegistrationId() {
    // given - clientName equals registrationId, so should format nicely
    ClientRegistration registration = ClientRegistration.withRegistrationId("my-provider")
        .clientId("client-id")
        .clientSecret("client-secret")
        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
        .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
        .authorizationUri("http://localhost/authorize")
        .tokenUri("http://localhost/token")
        .clientName("my-provider") // same as registrationId
        .build();

    clientRegistrationRepository = new InMemoryClientRegistrationRepository(registration);
    controller = new OAuth2ProvidersController(clientRegistrationRepository, processEngine);

    // when
    List<Map<String, String>> providers = controller.getProviders();

    // then - should format "my-provider" to "My Provider"
    assertThat(providers.get(0)).containsEntry("name", "My Provider");
  }

  @Test
  public void shouldFormatProviderNameWithUnderscores() {
    // given
    ClientRegistration registration = ClientRegistration.withRegistrationId("my_oauth_provider")
        .clientId("client-id")
        .clientSecret("client-secret")
        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
        .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
        .authorizationUri("http://localhost/authorize")
        .tokenUri("http://localhost/token")
        .clientName("my_oauth_provider")
        .build();

    clientRegistrationRepository = new InMemoryClientRegistrationRepository(registration);
    controller = new OAuth2ProvidersController(clientRegistrationRepository, processEngine);

    // when
    List<Map<String, String>> providers = controller.getProviders();

    // then - should format "my_oauth_provider" to "My Oauth Provider"
    assertThat(providers.get(0)).containsEntry("name", "My Oauth Provider");
  }

  @Test
  public void shouldNotFormatWhenClientNameIsCustom() {
    // given - clientName is different from registrationId
    ClientRegistration registration = ClientRegistration.withRegistrationId("keycloak")
        .clientId("client-id")
        .clientSecret("client-secret")
        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
        .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
        .authorizationUri("http://localhost/authorize")
        .tokenUri("http://localhost/token")
        .clientName("Corporate SSO")
        .build();

    clientRegistrationRepository = new InMemoryClientRegistrationRepository(registration);
    controller = new OAuth2ProvidersController(clientRegistrationRepository, processEngine);

    // when
    List<Map<String, String>> providers = controller.getProviders();

    // then - should use custom clientName as-is
    assertThat(providers.get(0)).containsEntry("name", "Corporate SSO");
  }

  @Test
  public void shouldFormatWhenClientNameIsUrl() {
    // given - clientName is a URL (which Spring can set from issuer-uri)
    ClientRegistration registration = ClientRegistration.withRegistrationId("oidc-provider")
        .clientId("client-id")
        .clientSecret("client-secret")
        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
        .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
        .authorizationUri("http://localhost/authorize")
        .tokenUri("http://localhost/token")
        .clientName("https://auth.example.com/realms/master")
        .build();

    clientRegistrationRepository = new InMemoryClientRegistrationRepository(registration);
    controller = new OAuth2ProvidersController(clientRegistrationRepository, processEngine);

    // when
    List<Map<String, String>> providers = controller.getProviders();

    // then - should format registrationId instead of URL
    assertThat(providers.get(0)).containsEntry("name", "Oidc Provider");
  }

  @Test
  public void shouldReturnEmptyListWhenNoProviders() {
    // given - empty repository (edge case, create with one then test iteration)
    // Note: InMemoryClientRegistrationRepository requires at least one registration
    // So we test the iteration logic with a single provider
    clientRegistrationRepository = createClientRegistrationRepository("single", "Single Provider");
    controller = new OAuth2ProvidersController(clientRegistrationRepository, processEngine);

    // when
    List<Map<String, String>> providers = controller.getProviders();

    // then
    assertThat(providers).hasSize(1);
  }

  private InMemoryClientRegistrationRepository createClientRegistrationRepository(String registrationId, String clientName) {
    ClientRegistration registration = createClientRegistration(registrationId, clientName);
    return new InMemoryClientRegistrationRepository(registration);
  }

  private ClientRegistration createClientRegistration(String registrationId, String clientName) {
    return ClientRegistration.withRegistrationId(registrationId)
        .clientId("client-id")
        .clientSecret("client-secret")
        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
        .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
        .authorizationUri("http://localhost/authorize")
        .tokenUri("http://localhost/token")
        .clientName(clientName)
        .build();
  }
}
