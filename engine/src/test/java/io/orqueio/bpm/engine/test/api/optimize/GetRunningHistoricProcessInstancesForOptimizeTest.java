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
package io.orqueio.bpm.engine.test.api.optimize;

import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.CoreMatchers.notNullValue;
import static org.hamcrest.CoreMatchers.nullValue;
import static org.hamcrest.MatcherAssert.assertThat;

import java.util.Date;
import java.util.List;

import io.orqueio.bpm.engine.AuthorizationService;
import io.orqueio.bpm.engine.IdentityService;
import io.orqueio.bpm.engine.ProcessEngineConfiguration;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.TaskService;
import io.orqueio.bpm.engine.authorization.Authorization;
import io.orqueio.bpm.engine.history.HistoricProcessInstance;
import io.orqueio.bpm.engine.identity.Group;
import io.orqueio.bpm.engine.identity.User;
import io.orqueio.bpm.engine.impl.OptimizeService;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.util.ClockUtil;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.task.Task;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.RequiredHistoryLevel;
import io.orqueio.bpm.engine.test.util.ProcessEngineTestRule;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import io.orqueio.bpm.model.bpmn.Bpmn;
import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;


@RequiredHistoryLevel(ProcessEngineConfiguration.HISTORY_FULL)
public class GetRunningHistoricProcessInstancesForOptimizeTest {
public ProcessEngineRule engineRule = new ProvidedProcessEngineRule();
  protected ProcessEngineTestRule testHelper = new ProcessEngineTestRule(engineRule);

  @Rule
  public RuleChain ruleChain = RuleChain.outerRule(engineRule).around(testHelper);

  private OptimizeService optimizeService;

  protected String userId = "test";

  protected static final String VARIABLE_NAME = "aVariableName";
  protected static final String VARIABLE_VALUE = "aVariableValue";

  private IdentityService identityService;
  private RuntimeService runtimeService;
  private AuthorizationService authorizationService;
  private TaskService taskService;


  @Before
  public void init() {
    ProcessEngineConfigurationImpl config =
      engineRule.getProcessEngineConfiguration();
    optimizeService = config.getOptimizeService();
    identityService = engineRule.getIdentityService();
    runtimeService = engineRule.getRuntimeService();
    authorizationService = engineRule.getAuthorizationService();
    taskService = engineRule.getTaskService();

    createUser(userId);
  }

  @After
  public void cleanUp() {
    for (User user : identityService.createUserQuery().list()) {
      identityService.deleteUser(user.getId());
    }
    for (Group group : identityService.createGroupQuery().list()) {
      identityService.deleteGroup(group.getId());
    }
    for (Authorization authorization : authorizationService.createAuthorizationQuery().list()) {
      authorizationService.deleteAuthorization(authorization.getId());
    }
    ClockUtil.reset();
  }

  @Test
  public void getRunningHistoricProcessInstances() {
    // given
    BpmnModelInstance simpleDefinition = Bpmn.createExecutableProcess("process")
      .startEvent()
      .userTask()
      .endEvent()
      .done();
    testHelper.deploy(simpleDefinition);
    runtimeService.startProcessInstanceByKey("process");

    // when
    List<HistoricProcessInstance> runningHistoricProcessInstances =
      optimizeService.getRunningHistoricProcessInstances(pastDate(), null, 10);

    // then
    assertThat(runningHistoricProcessInstances.size(), is(1));
    assertThatInstanceHasAllImportantInformation(runningHistoricProcessInstances.get(0));
  }

  @Test
  public void startedAfterParameterWorks() {
     // given
    BpmnModelInstance simpleDefinition = Bpmn.createExecutableProcess("process")
      .startEvent()
      .userTask()
      .endEvent()
      .done();
    testHelper.deploy(simpleDefinition);
    Date now = new Date();
    ClockUtil.setCurrentTime(now);
    engineRule.getRuntimeService().startProcessInstanceByKey("process");
    Date nowPlus2Seconds = new Date(now.getTime() + 2000L);
    ClockUtil.setCurrentTime(nowPlus2Seconds);
    runtimeService.startProcessInstanceByKey("process");

    // when
    List<HistoricProcessInstance> runningHistoricProcessInstances =
      optimizeService.getRunningHistoricProcessInstances(now, null, 10);

    // then
    assertThat(runningHistoricProcessInstances.size(), is(1));
  }

  @Test
  public void startedAtParameterWorks() {
     // given
    BpmnModelInstance simpleDefinition = Bpmn.createExecutableProcess("process")
      .startEvent()
      .userTask()
      .endEvent()
      .done();
    testHelper.deploy(simpleDefinition);
    Date now = new Date();
    ClockUtil.setCurrentTime(now);
    ProcessInstance processInstance =
      runtimeService.startProcessInstanceByKey("process");
    Date nowPlus2Seconds = new Date(now.getTime() + 2000L);
    ClockUtil.setCurrentTime(nowPlus2Seconds);
    runtimeService.startProcessInstanceByKey("process");

    // when
    List<HistoricProcessInstance> runningHistoricProcessInstances =
      optimizeService.getRunningHistoricProcessInstances(null, now, 10);

    // then
    assertThat(runningHistoricProcessInstances.size(), is(1));
    assertThat(runningHistoricProcessInstances.get(0).getId(), is(processInstance.getId()));
  }

  @Test
  public void startedAfterAndStartedAtParameterWorks() {
     // given
    BpmnModelInstance simpleDefinition = Bpmn.createExecutableProcess("process")
      .startEvent()
      .userTask()
      .endEvent()
      .done();
    testHelper.deploy(simpleDefinition);
    Date now = new Date();
    ClockUtil.setCurrentTime(now);
    ProcessInstance processInstance =
      runtimeService.startProcessInstanceByKey("process");
    Date nowPlus2Seconds = new Date(now.getTime() + 2000L);
    ClockUtil.setCurrentTime(nowPlus2Seconds);
    runtimeService.startProcessInstanceByKey("process");

    // when
    List<HistoricProcessInstance> runningHistoricProcessInstances =
      optimizeService.getRunningHistoricProcessInstances(now, now, 10);

    // then
    assertThat(runningHistoricProcessInstances.size(), is(0));
  }

  @Test
  public void maxResultsParameterWorks() {
     // given
    BpmnModelInstance simpleDefinition = Bpmn.createExecutableProcess("process")
      .startEvent()
      .userTask()
      .endEvent()
      .done();
    testHelper.deploy(simpleDefinition);
    runtimeService.startProcessInstanceByKey("process");
    runtimeService.startProcessInstanceByKey("process");
    runtimeService.startProcessInstanceByKey("process");
    runtimeService.startProcessInstanceByKey("process");
    runtimeService.startProcessInstanceByKey("process");

    // when
    List<HistoricProcessInstance> runningHistoricProcessInstances =
      optimizeService.getRunningHistoricProcessInstances(pastDate(), null, 3);

    // then
    assertThat(runningHistoricProcessInstances.size(), is(3));
  }

  @Test
  public void resultIsSortedByStartTime() {
     // given
    BpmnModelInstance simpleDefinition = Bpmn.createExecutableProcess("process")
      .startEvent()
      .userTask()
      .endEvent()
      .done();
    testHelper.deploy(simpleDefinition);
    Date now = new Date();
    Date nowPlus1Second = new Date(now.getTime() + 1000L);
    ClockUtil.setCurrentTime(nowPlus1Second);
    ProcessInstance processInstance1 =
      runtimeService.startProcessInstanceByKey("process");
    Date nowPlus2Seconds = new Date(now.getTime() + 2000L);
    ClockUtil.setCurrentTime(nowPlus2Seconds);
    ProcessInstance processInstance2 =
      runtimeService.startProcessInstanceByKey("process");
    Date nowPlus4Seconds = new Date(nowPlus2Seconds.getTime() + 2000L);
    ClockUtil.setCurrentTime(nowPlus4Seconds);
    ProcessInstance processInstance3 =
      runtimeService.startProcessInstanceByKey("process");

    // when
    List<HistoricProcessInstance> runningHistoricProcessInstances =
      optimizeService.getRunningHistoricProcessInstances(new Date(now.getTime()), null, 10);

    // then
    assertThat(runningHistoricProcessInstances.size(), is(3));
    assertThat(runningHistoricProcessInstances.get(0).getId(), is(processInstance1.getId()));
    assertThat(runningHistoricProcessInstances.get(1).getId(), is(processInstance2.getId()));
    assertThat(runningHistoricProcessInstances.get(2).getId(), is(processInstance3.getId()));
  }

  @Test
  public void fetchOnlyRunningProcessInstances() {
     // given
    BpmnModelInstance simpleDefinition = Bpmn.createExecutableProcess("process")
      .startEvent()
      .userTask()
      .endEvent()
      .done();
    testHelper.deploy(simpleDefinition);
    runtimeService.startProcessInstanceByKey("process");
    completeAllUserTasks();
    ProcessInstance runningProcessInstance =
      runtimeService.startProcessInstanceByKey("process");

    // when
    List<HistoricProcessInstance> runningHistoricProcessInstances =
      optimizeService.getRunningHistoricProcessInstances(pastDate(), null, 10);

    // then
    assertThat(runningHistoricProcessInstances.size(), is(1));
    assertThat(runningHistoricProcessInstances.get(0).getId(), is(runningProcessInstance.getId()));
  }

  private Date pastDate() {
    return new Date(2L);
  }

  private void completeAllUserTasks() {
    List<Task> list = taskService.createTaskQuery().list();
    for (Task task : list) {
      taskService.claim(task.getId(), userId);
      taskService.complete(task.getId());
    }
  }

  protected void createUser(String userId) {
    User user = identityService.newUser(userId);
    identityService.saveUser(user);
  }

  private void assertThatInstanceHasAllImportantInformation(HistoricProcessInstance historicProcessInstance) {
    assertThat(historicProcessInstance, notNullValue());
    assertThat(historicProcessInstance.getId(), notNullValue());
    assertThat(historicProcessInstance.getProcessDefinitionKey(), is("process"));
    assertThat(historicProcessInstance.getProcessDefinitionVersion(), notNullValue());
    assertThat(historicProcessInstance.getProcessDefinitionId(), notNullValue());
    assertThat(historicProcessInstance.getStartTime(), notNullValue());
    assertThat(historicProcessInstance.getEndTime(), nullValue());
  }

}
