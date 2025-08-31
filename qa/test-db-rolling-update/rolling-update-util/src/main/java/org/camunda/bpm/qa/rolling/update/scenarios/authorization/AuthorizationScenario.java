/*
 * Copyright TOADDLATERCCS and/or licensed to TOADDLATERCCS
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. TOADDLATERCCS this file to you under the Apache License,
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
package io.orqueio.bpm.qa.rolling.update.scenarios.authorization;

import io.orqueio.bpm.engine.AuthorizationService;
import io.orqueio.bpm.engine.IdentityService;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.authorization.Authorization;
import static io.orqueio.bpm.engine.authorization.Authorization.AUTH_TYPE_GRANT;
import io.orqueio.bpm.engine.authorization.Permission;
import io.orqueio.bpm.engine.authorization.Permissions;
import io.orqueio.bpm.engine.authorization.Resources;
import io.orqueio.bpm.engine.identity.Group;
import io.orqueio.bpm.engine.identity.User;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.qa.upgrade.DescribesScenario;
import io.orqueio.bpm.qa.upgrade.ScenarioSetup;
import io.orqueio.bpm.qa.upgrade.Times;

/**
 *
 * @author Christopher Zell <christopher.zell@orqueio.com>
 */
public class AuthorizationScenario {

  protected static final String USER_ID = "user";
  protected static final String GROUP_ID = "group";
  public static final String PROCESS_DEF_KEY = "oneTaskProcess";

  @Deployment
  public static String deployOneTaskProcess() {
    return "io/orqueio/bpm/qa/rolling/update/oneTaskProcess.bpmn20.xml";
  }

  @DescribesScenario("startProcessInstance")
  @Times(1)
  public static ScenarioSetup startProcessInstance() {
    return new ScenarioSetup() {
      public void execute(ProcessEngine engine, String scenarioName) {
        IdentityService identityService = engine.getIdentityService();

        String userId = USER_ID + scenarioName;
        String groupid = GROUP_ID + scenarioName;
        // create an user
        User user = identityService.newUser(userId);
        identityService.saveUser(user);

        // create group
        Group group = identityService.newGroup(groupid);
        identityService.saveGroup(group);

        // create membership
        identityService.createMembership(userId, groupid);

        //create full authorization
        AuthorizationService authorizationService = engine.getAuthorizationService();

        //authorization for process definition
        Authorization authProcDef = createAuthorization(authorizationService, Permissions.ALL, Resources.PROCESS_DEFINITION, userId);
        engine.getAuthorizationService().saveAuthorization(authProcDef);

        //authorization for deployment
        Authorization authDeployment = createAuthorization(authorizationService, Permissions.ALL, Resources.DEPLOYMENT, userId);
        engine.getAuthorizationService().saveAuthorization(authDeployment);

        //authorization for process instance create
        Authorization authProcessInstance = createAuthorization(authorizationService, Permissions.CREATE, Resources.PROCESS_INSTANCE, userId);
        engine.getAuthorizationService().saveAuthorization(authProcessInstance);

        // start a process instance
        engine.getRuntimeService().startProcessInstanceByKey(PROCESS_DEF_KEY, scenarioName);
      }
    };
  }

  protected static Authorization createAuthorization(AuthorizationService authorizationService, Permission permission, Resources resource, String userId) {
    Authorization auth = authorizationService.createNewAuthorization(AUTH_TYPE_GRANT);
    auth.addPermission(permission);
    auth.setResource(resource);
    auth.setResourceId(Authorization.ANY);
    auth.setUserId(userId);
    return auth;
  }
}
