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

import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.authorization.Groups;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST Controller that exposes the list of configured OAuth2/OIDC providers.
 * This is used by the frontend to display SSO login buttons on the login page.
 * The path uses the webapp application path (default: /orqueio) to align with webapp API routes.
 */
@RestController
@RequestMapping("${camunda.bpm.webapp.application-path:/orqueio}/api/oauth2")
public class OAuth2ProvidersController {

  private final ClientRegistrationRepository clientRegistrationRepository;
  private final ProcessEngine processEngine;

  public OAuth2ProvidersController(ClientRegistrationRepository clientRegistrationRepository,
                                   ProcessEngine processEngine) {
    this.clientRegistrationRepository = clientRegistrationRepository;
    this.processEngine = processEngine;
  }

  /**
   * Checks if initial setup is needed (no admin user exists).
   * Returns true if no user belongs to the admin group.
   */
  @GetMapping("/setup-required")
  public Map<String, Boolean> isSetupRequired() {
    Map<String, Boolean> result = new HashMap<>();
    long adminCount = processEngine.getIdentityService()
        .createUserQuery()
        .memberOfGroup(Groups.ORQUEIO_ADMIN)
        .count();
    result.put("setupRequired", adminCount == 0);
    return result;
  }

  /**
   * Returns a list of configured OAuth2 providers with their display information.
   * Only exposes safe information (no secrets).
   */
  @GetMapping("/providers")
  public List<Map<String, String>> getProviders() {
    List<Map<String, String>> providers = new ArrayList<>();

    if (clientRegistrationRepository instanceof InMemoryClientRegistrationRepository) {
      InMemoryClientRegistrationRepository inMemoryRepo =
          (InMemoryClientRegistrationRepository) clientRegistrationRepository;

      for (ClientRegistration registration : inMemoryRepo) {
        Map<String, String> provider = new HashMap<>();
        provider.put("id", registration.getRegistrationId());
        provider.put("name", getDisplayName(registration));
        provider.put("loginUrl", "/oauth2/authorization/" + registration.getRegistrationId());
        providers.add(provider);
      }
    }

    return providers;
  }

  /**
   * Gets a user-friendly display name for the OAuth2 provider.
   */
  private String getDisplayName(ClientRegistration registration) {
    String clientName = registration.getClientName();
    if (clientName != null && !clientName.isEmpty() &&
        !clientName.equals(registration.getRegistrationId())) {
      return clientName;
    }

    String id = registration.getRegistrationId();
    return id.substring(0, 1).toUpperCase() + id.substring(1);
  }
}
