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
package io.orqueio.bpm.qa.performance.engine.query;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import io.orqueio.bpm.engine.AuthorizationService;
import io.orqueio.bpm.engine.HistoryService;
import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.RepositoryService;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.TaskService;
import io.orqueio.bpm.engine.authorization.Authorization;
import io.orqueio.bpm.engine.authorization.Permission;
import io.orqueio.bpm.engine.authorization.Resource;
import io.orqueio.bpm.engine.impl.identity.Authentication;
import io.orqueio.bpm.engine.query.Query;
import io.orqueio.bpm.qa.performance.engine.framework.PerfTestRunContext;
import io.orqueio.bpm.qa.performance.engine.framework.PerfTestStepBehavior;
import io.orqueio.bpm.qa.performance.engine.junit.AuthorizationPerformanceTestCase;
import io.orqueio.bpm.qa.performance.engine.junit.PerfTestProcessEngine;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;
import org.junit.runners.Parameterized.Parameter;
import org.junit.runners.Parameterized.Parameters;

import static io.orqueio.bpm.engine.authorization.Resources.*;
import static io.orqueio.bpm.engine.authorization.Permissions.*;

/**
 * @author Daniel Meyer
 *
 */
@SuppressWarnings("rawtypes")
@RunWith(Parameterized.class)
public class RuntimeAuthorizationQueryPerformanceTest extends AuthorizationPerformanceTestCase {

  @Parameter(0)
  public static String name;

  @Parameter(1)
  public static Query query;

  @Parameter(2)
  public static Resource resource;

  @Parameter(3)
  public static Permission[] permissions;

  @Parameter(4)
  public static Authentication authentication;

  static List<Object[]> queryResourcesAndPermissions;

  static List<Authentication> authentications;

  static {
    ProcessEngine processEngine = PerfTestProcessEngine.getInstance();
    RuntimeService runtimeService = processEngine.getRuntimeService();
    TaskService taskService = processEngine.getTaskService();

    queryResourcesAndPermissions = Arrays.<Object[]>asList(
        new Object[] {
            "ProcessInstanceQuery",
            runtimeService.createProcessInstanceQuery(),
            PROCESS_INSTANCE,
            new Permission[] { READ }
        },
        new Object[] {
            "VariableInstanceQuery",
            runtimeService.createVariableInstanceQuery(),
            PROCESS_INSTANCE,
            new Permission[] { READ }
        },
        new Object[] {
            "TaskQuery",
            taskService.createTaskQuery(),
            TASK,
            new Permission[] { READ }
        }
    );

    authentications = Arrays.asList(
        new Authentication(null, Collections.<String>emptyList()){
          @Override
          public String toString() {
            return "without authentication";
          }
        },
        new Authentication("test", Collections.<String>emptyList()){
          @Override
          public String toString() {
            return "with authenticated user without groups";
          }
        },
        new Authentication("test", Arrays.asList("g0", "g1")) {
          @Override
          public String toString() {
            return "with authenticated user and 2 groups";
          }
        },
        new Authentication("test", Arrays.asList("g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8", "g9")) {
          @Override
          public String toString() {
            return "with authenticated user and 10 groups";
          }
        }
    );

  }

  @Parameters(name="{0} - {4}")
  public static Iterable<Object[]> params() {
    final ArrayList<Object[]> params = new ArrayList<Object[]>();

    for (Object[] queryResourcesAndPermission : queryResourcesAndPermissions) {
      for (Authentication authentication : authentications) {
        Object[] array = new Object[queryResourcesAndPermission.length + 1];
        System.arraycopy(queryResourcesAndPermission, 0, array, 0, queryResourcesAndPermission.length);
        array[queryResourcesAndPermission.length] = authentication;
        params.add(array);
      }
    }

    return params;
  }

  @Before
  public void createAuthorizations() {
    AuthorizationService authorizationService = engine.getAuthorizationService();
    List<Authorization> auths = authorizationService.createAuthorizationQuery().list();
    for (Authorization authorization : auths) {
      authorizationService.deleteAuthorization(authorization.getId());
    }

    userGrant("test", resource, permissions);
    for (int i = 0; i < 5; i++) {
      grouptGrant("g"+i, resource, permissions);
    }
    engine.getProcessEngineConfiguration().setAuthorizationEnabled(true);
  }

  @Test
  public void queryList() {
    performanceTest().step(new PerfTestStepBehavior() {
      public void execute(PerfTestRunContext context) {
        try {
          engine.getIdentityService().setAuthentication(authentication);
          query.listPage(0, 15);
        } finally {
          engine.getIdentityService().clearAuthentication();
        }
      }
    }).run();
  }

  @Test
  public void queryCount() {
    performanceTest().step(new PerfTestStepBehavior() {
      public void execute(PerfTestRunContext context) {
        try {
          engine.getIdentityService().setAuthentication(authentication);
          query.count();
        } finally {
          engine.getIdentityService().clearAuthentication();
        }
      }
    }).run();
  }

}
