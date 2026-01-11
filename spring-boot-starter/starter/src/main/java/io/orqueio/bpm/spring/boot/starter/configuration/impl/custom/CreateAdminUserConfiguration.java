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
package io.orqueio.bpm.spring.boot.starter.configuration.impl.custom;

import io.orqueio.bpm.engine.AuthorizationService;
import io.orqueio.bpm.engine.IdentityService;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.authorization.Groups;
import io.orqueio.bpm.engine.authorization.Permissions;
import io.orqueio.bpm.engine.authorization.Resource;
import io.orqueio.bpm.engine.authorization.Resources;
import io.orqueio.bpm.engine.identity.Group;
import io.orqueio.bpm.engine.identity.User;
import io.orqueio.bpm.engine.impl.persistence.entity.AuthorizationEntity;
import io.orqueio.bpm.spring.boot.starter.configuration.impl.AbstractOrqueioConfiguration;
import io.orqueio.bpm.spring.boot.starter.property.AdminUserProperty;
import org.springframework.beans.BeanUtils;

import jakarta.annotation.PostConstruct;
import java.util.Collections;
import java.util.Optional;

import static java.util.Objects.requireNonNull;
import static io.orqueio.bpm.engine.authorization.Authorization.ANY;
import static io.orqueio.bpm.engine.authorization.Authorization.AUTH_TYPE_GRANT;
import static io.orqueio.bpm.engine.authorization.Groups.ORQUEIO_ADMIN;
import static io.orqueio.bpm.engine.authorization.Groups.ORQUEIO_USER;
import static io.orqueio.bpm.engine.authorization.Permissions.ALL;
import static io.orqueio.bpm.engine.authorization.Permissions.READ;

public class CreateAdminUserConfiguration extends AbstractOrqueioConfiguration {

  private User adminUser;

  @PostConstruct
  void init() {
    adminUser = Optional.ofNullable(orqueioBpmProperties.getAdminUser())
      .map(AdminUserProperty::init)
      .orElseThrow(fail("adminUser not configured!"));
  }

  @Override
  public void postProcessEngineBuild(final ProcessEngine processEngine) {
    requireNonNull(adminUser);

    final IdentityService identityService = processEngine.getIdentityService();
    final AuthorizationService authorizationService = processEngine.getAuthorizationService();

    if (userAlreadyExists(identityService, adminUser)) {
      return;
    }

    createUser(identityService, adminUser);

    if (identityService.createGroupQuery().groupId(ORQUEIO_ADMIN).count() == 0) {
      Group orqueioAdminGroup = identityService.newGroup(ORQUEIO_ADMIN);
      orqueioAdminGroup.setName("OrqueIO BPM Administrators");
      orqueioAdminGroup.setType(Groups.GROUP_TYPE_SYSTEM);
      identityService.saveGroup(orqueioAdminGroup);
    }

    for (Resource resource : Resources.values()) {
      if (authorizationService.createAuthorizationQuery().groupIdIn(ORQUEIO_ADMIN).resourceType(resource).resourceId(ANY).count() == 0) {
        AuthorizationEntity userAdminAuth = new AuthorizationEntity(AUTH_TYPE_GRANT);
        userAdminAuth.setGroupId(ORQUEIO_ADMIN);
        userAdminAuth.setResource(resource);
        userAdminAuth.setResourceId(ANY);
        userAdminAuth.addPermission(ALL);
        authorizationService.saveAuthorization(userAdminAuth);
      }
    }

    ensureOrqueioUserGroupExists(identityService, authorizationService);

    identityService.createMembership(adminUser.getId(), ORQUEIO_ADMIN);
    LOG.creatingInitialAdminUser(adminUser);
  }

  static boolean userAlreadyExists(IdentityService identityService, User adminUser) {
    final User existingUser = identityService.createUserQuery()
      .userId(adminUser.getId())
      .singleResult();
    if (existingUser != null) {
      LOG.skipAdminUserCreation(existingUser);
      return true;
    }
    return false;
  }

  static User createUser(final IdentityService identityService, final User adminUser) {
    User newUser = identityService.newUser(adminUser.getId());
    BeanUtils.copyProperties(adminUser, newUser);
    identityService.saveUser(newUser);
    return newUser;
  }

  static void ensureOrqueioUserGroupExists(IdentityService identityService, AuthorizationService authorizationService) {
    if (identityService.createGroupQuery().groupId(ORQUEIO_USER).count() == 0) {
      Group orqueioUserGroup = identityService.newGroup(ORQUEIO_USER);
      orqueioUserGroup.setName("OrqueIO BPM Users");
      orqueioUserGroup.setType(Groups.GROUP_TYPE_SYSTEM);
      identityService.saveGroup(orqueioUserGroup);
    }

    // Grant READ permission on resources that support it
    for (Resource resource : READ.getTypes()) {
      if (authorizationService.createAuthorizationQuery().groupIdIn(ORQUEIO_USER).resourceType(resource).resourceId(ANY).count() == 0) {
        AuthorizationEntity readAuth = new AuthorizationEntity(AUTH_TYPE_GRANT);
        readAuth.setGroupId(ORQUEIO_USER);
        readAuth.setResource(resource);
        readAuth.setResourceId(ANY);
        readAuth.addPermission(READ);
        authorizationService.saveAuthorization(readAuth);
      }
    }

    // Grant ACCESS on welcome, cockpit and tasklist (not admin)
    String[] allowedApps = {"welcome", "cockpit", "tasklist"};
    for (String appId : allowedApps) {
      if (authorizationService.createAuthorizationQuery().groupIdIn(ORQUEIO_USER).resourceType(Resources.APPLICATION).resourceId(appId).count() == 0) {
        AuthorizationEntity accessAuth = new AuthorizationEntity(AUTH_TYPE_GRANT);
        accessAuth.setGroupId(ORQUEIO_USER);
        accessAuth.setResource(Resources.APPLICATION);
        accessAuth.setResourceId(appId);
        accessAuth.addPermission(Permissions.ACCESS);
        authorizationService.saveAuthorization(accessAuth);
      }
    }
  }

}
