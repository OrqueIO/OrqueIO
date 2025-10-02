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
package io.orqueio.bpm.model.bpmn;

import static org.assertj.core.api.Assertions.assertThat;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.BUSINESS_RULE_TASK;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.CALL_ACTIVITY_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.END_EVENT_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.PROCESS_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.SCRIPT_TASK_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.SEND_TASK_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.SEQUENCE_FLOW_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.SERVICE_TASK_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.START_EVENT_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_CLASS_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_CLASS_XML;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_DELEGATE_EXPRESSION_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_DELEGATE_EXPRESSION_XML;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_DUE_DATE_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_DUE_DATE_XML;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_EXECUTION_EVENT_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_EXECUTION_EVENT_XML;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_EXPRESSION_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_EXPRESSION_XML;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_FLOW_NODE_JOB_PRIORITY;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_GROUPS_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_GROUPS_LIST_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_GROUPS_LIST_XML;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_GROUPS_XML;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_HISTORY_TIME_TO_LIVE;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_PRIORITY_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_PRIORITY_XML;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_PROCESS_JOB_PRIORITY;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_PROCESS_TASK_PRIORITY;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_SERVICE_TASK_PRIORITY;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_STRING_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_STRING_XML;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_TASK_EVENT_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_TASK_EVENT_XML;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_TYPE_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_TYPE_XML;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_USERS_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_USERS_LIST_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_USERS_LIST_XML;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_USERS_XML;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.USER_TASK_ID;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ACTIVITI_NS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_ERROR_CODE_VARIABLE;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_ERROR_MESSAGE_VARIABLE;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;

import io.orqueio.bpm.model.bpmn.instance.BaseElement;
import io.orqueio.bpm.model.bpmn.instance.BpmnModelElementInstance;
import io.orqueio.bpm.model.bpmn.instance.BusinessRuleTask;
import io.orqueio.bpm.model.bpmn.instance.CallActivity;
import io.orqueio.bpm.model.bpmn.instance.EndEvent;
import io.orqueio.bpm.model.bpmn.instance.Error;
import io.orqueio.bpm.model.bpmn.instance.ErrorEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.Expression;
import io.orqueio.bpm.model.bpmn.instance.MessageEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.ParallelGateway;
import io.orqueio.bpm.model.bpmn.instance.Process;
import io.orqueio.bpm.model.bpmn.instance.ScriptTask;
import io.orqueio.bpm.model.bpmn.instance.SendTask;
import io.orqueio.bpm.model.bpmn.instance.SequenceFlow;
import io.orqueio.bpm.model.bpmn.instance.ServiceTask;
import io.orqueio.bpm.model.bpmn.instance.StartEvent;
import io.orqueio.bpm.model.bpmn.instance.TimerEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.UserTask;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioConnector;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioConnectorId;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioConstraint;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioEntry;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioExecutionListener;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioFailedJobRetryTimeCycle;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioField;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioFormData;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioFormField;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioFormProperty;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioIn;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioInputOutput;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioInputParameter;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioList;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioMap;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioOut;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioOutputParameter;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioPotentialStarter;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioProperties;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioProperty;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioScript;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioTaskListener;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioValue;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;
import org.junit.runners.Parameterized.Parameters;

/**
 * @author Sebastian Menski
 * @author Ronny Bräunlich
 */
@RunWith(Parameterized.class)
public class OrqueioExtensionsTest {

  private Process process;
  private StartEvent startEvent;
  private SequenceFlow sequenceFlow;
  private UserTask userTask;
  private ServiceTask serviceTask;
  private SendTask sendTask;
  private ScriptTask scriptTask;
  private CallActivity callActivity;
  private BusinessRuleTask businessRuleTask;
  private EndEvent endEvent;
  private MessageEventDefinition messageEventDefinition;
  private ParallelGateway parallelGateway;
  private String namespace;
  private BpmnModelInstance originalModelInstance;
  private BpmnModelInstance modelInstance;
  private Error error;

  @Parameters(name="Namespace: {0}")
  public static Collection<Object[]> parameters(){
    return Arrays.asList(new Object[][]{
        {ORQUEIO_NS, Bpmn.readModelFromStream(OrqueioExtensionsTest.class.getResourceAsStream("OrqueioExtensionsTest.xml"))},
        //for compatability reasons we gotta check the old namespace, too
        {ACTIVITI_NS, Bpmn.readModelFromStream(OrqueioExtensionsTest.class.getResourceAsStream("OrqueioExtensionsCompatabilityTest.xml"))}
    });
  }

  public OrqueioExtensionsTest(String namespace, BpmnModelInstance modelInstance) {
    this.namespace = namespace;
    this.originalModelInstance = modelInstance;
  }

  @Before
  public void setUp(){
    modelInstance = originalModelInstance.clone();
    process = modelInstance.getModelElementById(PROCESS_ID);
    startEvent = modelInstance.getModelElementById(START_EVENT_ID);
    sequenceFlow = modelInstance.getModelElementById(SEQUENCE_FLOW_ID);
    userTask = modelInstance.getModelElementById(USER_TASK_ID);
    serviceTask = modelInstance.getModelElementById(SERVICE_TASK_ID);
    sendTask = modelInstance.getModelElementById(SEND_TASK_ID);
    scriptTask = modelInstance.getModelElementById(SCRIPT_TASK_ID);
    callActivity = modelInstance.getModelElementById(CALL_ACTIVITY_ID);
    businessRuleTask = modelInstance.getModelElementById(BUSINESS_RULE_TASK);
    endEvent = modelInstance.getModelElementById(END_EVENT_ID);
    messageEventDefinition = (MessageEventDefinition) endEvent.getEventDefinitions().iterator().next();
    parallelGateway = modelInstance.getModelElementById("parallelGateway");
    error = modelInstance.getModelElementById("error");
  }

  @Test
  public void testAssignee() {
    assertThat(userTask.getOrqueioAssignee()).isEqualTo(TEST_STRING_XML);
    userTask.setOrqueioAssignee(TEST_STRING_API);
    assertThat(userTask.getOrqueioAssignee()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testAsync() {
    assertThat(startEvent.isOrqueioAsync()).isFalse();
    assertThat(userTask.isOrqueioAsync()).isTrue();
    assertThat(parallelGateway.isOrqueioAsync()).isTrue();

    startEvent.setOrqueioAsync(true);
    userTask.setOrqueioAsync(false);
    parallelGateway.setOrqueioAsync(false);

    assertThat(startEvent.isOrqueioAsync()).isTrue();
    assertThat(userTask.isOrqueioAsync()).isFalse();
    assertThat(parallelGateway.isOrqueioAsync()).isFalse();
  }

  @Test
  public void testAsyncBefore() {
    assertThat(startEvent.isOrqueioAsyncBefore()).isTrue();
    assertThat(endEvent.isOrqueioAsyncBefore()).isTrue();
    assertThat(userTask.isOrqueioAsyncBefore()).isTrue();
    assertThat(parallelGateway.isOrqueioAsyncBefore()).isTrue();

    startEvent.setOrqueioAsyncBefore(false);
    endEvent.setOrqueioAsyncBefore(false);
    userTask.setOrqueioAsyncBefore(false);
    parallelGateway.setOrqueioAsyncBefore(false);

    assertThat(startEvent.isOrqueioAsyncBefore()).isFalse();
    assertThat(endEvent.isOrqueioAsyncBefore()).isFalse();
    assertThat(userTask.isOrqueioAsyncBefore()).isFalse();
    assertThat(parallelGateway.isOrqueioAsyncBefore()).isFalse();
  }

  @Test
  public void testAsyncAfter() {
    assertThat(startEvent.isOrqueioAsyncAfter()).isTrue();
    assertThat(endEvent.isOrqueioAsyncAfter()).isTrue();
    assertThat(userTask.isOrqueioAsyncAfter()).isTrue();
    assertThat(parallelGateway.isOrqueioAsyncAfter()).isTrue();

    startEvent.setOrqueioAsyncAfter(false);
    endEvent.setOrqueioAsyncAfter(false);
    userTask.setOrqueioAsyncAfter(false);
    parallelGateway.setOrqueioAsyncAfter(false);

    assertThat(startEvent.isOrqueioAsyncAfter()).isFalse();
    assertThat(endEvent.isOrqueioAsyncAfter()).isFalse();
    assertThat(userTask.isOrqueioAsyncAfter()).isFalse();
    assertThat(parallelGateway.isOrqueioAsyncAfter()).isFalse();
  }

  @Test
  public void testFlowNodeJobPriority() {
    assertThat(startEvent.getOrqueioJobPriority()).isEqualTo(TEST_FLOW_NODE_JOB_PRIORITY);
    assertThat(endEvent.getOrqueioJobPriority()).isEqualTo(TEST_FLOW_NODE_JOB_PRIORITY);
    assertThat(userTask.getOrqueioJobPriority()).isEqualTo(TEST_FLOW_NODE_JOB_PRIORITY);
    assertThat(parallelGateway.getOrqueioJobPriority()).isEqualTo(TEST_FLOW_NODE_JOB_PRIORITY);
  }

  @Test
  public void testProcessJobPriority() {
    assertThat(process.getOrqueioJobPriority()).isEqualTo(TEST_PROCESS_JOB_PRIORITY);
  }

  @Test
  public void testProcessTaskPriority() {
    assertThat(process.getOrqueioTaskPriority()).isEqualTo(TEST_PROCESS_TASK_PRIORITY);
  }

  @Test
  public void testHistoryTimeToLive() {
    assertThat(process.getOrqueioHistoryTimeToLive()).isEqualTo(TEST_HISTORY_TIME_TO_LIVE);
  }

  @Test
  public void testIsStartableInTasklist() {
    assertThat(process.isOrqueioStartableInTasklist()).isEqualTo(false);
  }

  @Test
  public void testVersionTag() {
    assertThat(process.getOrqueioVersionTag()).isEqualTo("v1.0.0");
  }

  @Test
  public void testServiceTaskPriority() {
    assertThat(serviceTask.getOrqueioTaskPriority()).isEqualTo(TEST_SERVICE_TASK_PRIORITY);
  }

  @Test
  public void testCalledElementBinding() {
    assertThat(callActivity.getOrqueioCalledElementBinding()).isEqualTo(TEST_STRING_XML);
    callActivity.setOrqueioCalledElementBinding(TEST_STRING_API);
    assertThat(callActivity.getOrqueioCalledElementBinding()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testCalledElementVersion() {
    assertThat(callActivity.getOrqueioCalledElementVersion()).isEqualTo(TEST_STRING_XML);
    callActivity.setOrqueioCalledElementVersion(TEST_STRING_API);
    assertThat(callActivity.getOrqueioCalledElementVersion()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testCalledElementVersionTag() {
    assertThat(callActivity.getOrqueioCalledElementVersionTag()).isEqualTo(TEST_STRING_XML);
    callActivity.setOrqueioCalledElementVersionTag(TEST_STRING_API);
    assertThat(callActivity.getOrqueioCalledElementVersionTag()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testCalledElementTenantId() {
    assertThat(callActivity.getOrqueioCalledElementTenantId()).isEqualTo(TEST_STRING_XML);
    callActivity.setOrqueioCalledElementTenantId(TEST_STRING_API);
    assertThat(callActivity.getOrqueioCalledElementTenantId()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testCaseRef() {
    assertThat(callActivity.getOrqueioCaseRef()).isEqualTo(TEST_STRING_XML);
    callActivity.setOrqueioCaseRef(TEST_STRING_API);
    assertThat(callActivity.getOrqueioCaseRef()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testCaseBinding() {
    assertThat(callActivity.getOrqueioCaseBinding()).isEqualTo(TEST_STRING_XML);
    callActivity.setOrqueioCaseBinding(TEST_STRING_API);
    assertThat(callActivity.getOrqueioCaseBinding()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testCaseVersion() {
    assertThat(callActivity.getOrqueioCaseVersion()).isEqualTo(TEST_STRING_XML);
    callActivity.setOrqueioCaseVersion(TEST_STRING_API);
    assertThat(callActivity.getOrqueioCaseVersion()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testCaseTenantId() {
    assertThat(callActivity.getOrqueioCaseTenantId()).isEqualTo(TEST_STRING_XML);
    callActivity.setOrqueioCaseTenantId(TEST_STRING_API);
    assertThat(callActivity.getOrqueioCaseTenantId()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testDecisionRef() {
    assertThat(businessRuleTask.getOrqueioDecisionRef()).isEqualTo(TEST_STRING_XML);
    businessRuleTask.setOrqueioDecisionRef(TEST_STRING_API);
    assertThat(businessRuleTask.getOrqueioDecisionRef()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testDecisionRefBinding() {
    assertThat(businessRuleTask.getOrqueioDecisionRefBinding()).isEqualTo(TEST_STRING_XML);
    businessRuleTask.setOrqueioDecisionRefBinding(TEST_STRING_API);
    assertThat(businessRuleTask.getOrqueioDecisionRefBinding()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testDecisionRefVersion() {
    assertThat(businessRuleTask.getOrqueioDecisionRefVersion()).isEqualTo(TEST_STRING_XML);
    businessRuleTask.setOrqueioDecisionRefVersion(TEST_STRING_API);
    assertThat(businessRuleTask.getOrqueioDecisionRefVersion()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testDecisionRefVersionTag() {
    assertThat(businessRuleTask.getOrqueioDecisionRefVersionTag()).isEqualTo(TEST_STRING_XML);
    businessRuleTask.setOrqueioDecisionRefVersionTag(TEST_STRING_API);
    assertThat(businessRuleTask.getOrqueioDecisionRefVersionTag()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testDecisionRefTenantId() {
    assertThat(businessRuleTask.getOrqueioDecisionRefTenantId()).isEqualTo(TEST_STRING_XML);
    businessRuleTask.setOrqueioDecisionRefTenantId(TEST_STRING_API);
    assertThat(businessRuleTask.getOrqueioDecisionRefTenantId()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testMapDecisionResult() {
    assertThat(businessRuleTask.getOrqueioMapDecisionResult()).isEqualTo(TEST_STRING_XML);
    businessRuleTask.setOrqueioMapDecisionResult(TEST_STRING_API);
    assertThat(businessRuleTask.getOrqueioMapDecisionResult()).isEqualTo(TEST_STRING_API);
  }


  @Test
  public void testTaskPriority() {
    assertThat(businessRuleTask.getOrqueioTaskPriority()).isEqualTo(TEST_STRING_XML);
    businessRuleTask.setOrqueioTaskPriority(TEST_SERVICE_TASK_PRIORITY);
    assertThat(businessRuleTask.getOrqueioTaskPriority()).isEqualTo(TEST_SERVICE_TASK_PRIORITY);
  }

  @Test
  public void testCandidateGroups() {
    assertThat(userTask.getOrqueioCandidateGroups()).isEqualTo(TEST_GROUPS_XML);
    assertThat(userTask.getOrqueioCandidateGroupsList()).containsAll(TEST_GROUPS_LIST_XML);
    userTask.setOrqueioCandidateGroups(TEST_GROUPS_API);
    assertThat(userTask.getOrqueioCandidateGroups()).isEqualTo(TEST_GROUPS_API);
    assertThat(userTask.getOrqueioCandidateGroupsList()).containsAll(TEST_GROUPS_LIST_API);
    userTask.setOrqueioCandidateGroupsList(TEST_GROUPS_LIST_XML);
    assertThat(userTask.getOrqueioCandidateGroups()).isEqualTo(TEST_GROUPS_XML);
    assertThat(userTask.getOrqueioCandidateGroupsList()).containsAll(TEST_GROUPS_LIST_XML);
  }

  @Test
  public void testCandidateStarterGroups() {
    assertThat(process.getOrqueioCandidateStarterGroups()).isEqualTo(TEST_GROUPS_XML);
    assertThat(process.getOrqueioCandidateStarterGroupsList()).containsAll(TEST_GROUPS_LIST_XML);
    process.setOrqueioCandidateStarterGroups(TEST_GROUPS_API);
    assertThat(process.getOrqueioCandidateStarterGroups()).isEqualTo(TEST_GROUPS_API);
    assertThat(process.getOrqueioCandidateStarterGroupsList()).containsAll(TEST_GROUPS_LIST_API);
    process.setOrqueioCandidateStarterGroupsList(TEST_GROUPS_LIST_XML);
    assertThat(process.getOrqueioCandidateStarterGroups()).isEqualTo(TEST_GROUPS_XML);
    assertThat(process.getOrqueioCandidateStarterGroupsList()).containsAll(TEST_GROUPS_LIST_XML);
  }

  @Test
  public void testCandidateStarterUsers() {
    assertThat(process.getOrqueioCandidateStarterUsers()).isEqualTo(TEST_USERS_XML);
    assertThat(process.getOrqueioCandidateStarterUsersList()).containsAll(TEST_USERS_LIST_XML);
    process.setOrqueioCandidateStarterUsers(TEST_USERS_API);
    assertThat(process.getOrqueioCandidateStarterUsers()).isEqualTo(TEST_USERS_API);
    assertThat(process.getOrqueioCandidateStarterUsersList()).containsAll(TEST_USERS_LIST_API);
    process.setOrqueioCandidateStarterUsersList(TEST_USERS_LIST_XML);
    assertThat(process.getOrqueioCandidateStarterUsers()).isEqualTo(TEST_USERS_XML);
    assertThat(process.getOrqueioCandidateStarterUsersList()).containsAll(TEST_USERS_LIST_XML);
  }

  @Test
  public void testCandidateUsers() {
    assertThat(userTask.getOrqueioCandidateUsers()).isEqualTo(TEST_USERS_XML);
    assertThat(userTask.getOrqueioCandidateUsersList()).containsAll(TEST_USERS_LIST_XML);
    userTask.setOrqueioCandidateUsers(TEST_USERS_API);
    assertThat(userTask.getOrqueioCandidateUsers()).isEqualTo(TEST_USERS_API);
    assertThat(userTask.getOrqueioCandidateUsersList()).containsAll(TEST_USERS_LIST_API);
    userTask.setOrqueioCandidateUsersList(TEST_USERS_LIST_XML);
    assertThat(userTask.getOrqueioCandidateUsers()).isEqualTo(TEST_USERS_XML);
    assertThat(userTask.getOrqueioCandidateUsersList()).containsAll(TEST_USERS_LIST_XML);
  }

  @Test
  public void testClass() {
    assertThat(serviceTask.getOrqueioClass()).isEqualTo(TEST_CLASS_XML);
    assertThat(messageEventDefinition.getOrqueioClass()).isEqualTo(TEST_CLASS_XML);

    serviceTask.setOrqueioClass(TEST_CLASS_API);
    messageEventDefinition.setOrqueioClass(TEST_CLASS_API);

    assertThat(serviceTask.getOrqueioClass()).isEqualTo(TEST_CLASS_API);
    assertThat(messageEventDefinition.getOrqueioClass()).isEqualTo(TEST_CLASS_API);
  }

  @Test
  public void testDelegateExpression() {
    assertThat(serviceTask.getOrqueioDelegateExpression()).isEqualTo(TEST_DELEGATE_EXPRESSION_XML);
    assertThat(messageEventDefinition.getOrqueioDelegateExpression()).isEqualTo(TEST_DELEGATE_EXPRESSION_XML);

    serviceTask.setOrqueioDelegateExpression(TEST_DELEGATE_EXPRESSION_API);
    messageEventDefinition.setOrqueioDelegateExpression(TEST_DELEGATE_EXPRESSION_API);

    assertThat(serviceTask.getOrqueioDelegateExpression()).isEqualTo(TEST_DELEGATE_EXPRESSION_API);
    assertThat(messageEventDefinition.getOrqueioDelegateExpression()).isEqualTo(TEST_DELEGATE_EXPRESSION_API);
  }

  @Test
  public void testDueDate() {
    assertThat(userTask.getOrqueioDueDate()).isEqualTo(TEST_DUE_DATE_XML);
    userTask.setOrqueioDueDate(TEST_DUE_DATE_API);
    assertThat(userTask.getOrqueioDueDate()).isEqualTo(TEST_DUE_DATE_API);
  }

  @Test
  public void testErrorCodeVariable(){
    ErrorEventDefinition errorEventDefinition = startEvent.getChildElementsByType(ErrorEventDefinition.class).iterator().next();
    assertThat(errorEventDefinition.getAttributeValueNs(namespace, ORQUEIO_ATTRIBUTE_ERROR_CODE_VARIABLE)).isEqualTo("errorVariable");
  }

  @Test
  public void testErrorMessageVariable(){
    ErrorEventDefinition errorEventDefinition = startEvent.getChildElementsByType(ErrorEventDefinition.class).iterator().next();
    assertThat(errorEventDefinition.getAttributeValueNs(namespace, ORQUEIO_ATTRIBUTE_ERROR_MESSAGE_VARIABLE)).isEqualTo("errorMessageVariable");
  }

  @Test
  public void testErrorMessage() {
    assertThat(error.getOrqueioErrorMessage()).isEqualTo(TEST_STRING_XML);
    error.setOrqueioErrorMessage(TEST_STRING_API);
    assertThat(error.getOrqueioErrorMessage()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testExclusive() {
    assertThat(startEvent.isOrqueioExclusive()).isTrue();
    assertThat(userTask.isOrqueioExclusive()).isFalse();
    userTask.setOrqueioExclusive(true);
    assertThat(userTask.isOrqueioExclusive()).isTrue();
    assertThat(parallelGateway.isOrqueioExclusive()).isTrue();
    parallelGateway.setOrqueioExclusive(false);
    assertThat(parallelGateway.isOrqueioExclusive()).isFalse();

    assertThat(callActivity.isOrqueioExclusive()).isFalse();
    callActivity.setOrqueioExclusive(true);
    assertThat(callActivity.isOrqueioExclusive()).isTrue();
  }

  @Test
  public void testExpression() {
    assertThat(serviceTask.getOrqueioExpression()).isEqualTo(TEST_EXPRESSION_XML);
    assertThat(messageEventDefinition.getOrqueioExpression()).isEqualTo(TEST_EXPRESSION_XML);
    serviceTask.setOrqueioExpression(TEST_EXPRESSION_API);
    messageEventDefinition.setOrqueioExpression(TEST_EXPRESSION_API);
    assertThat(serviceTask.getOrqueioExpression()).isEqualTo(TEST_EXPRESSION_API);
    assertThat(messageEventDefinition.getOrqueioExpression()).isEqualTo(TEST_EXPRESSION_API);
  }

  @Test
  public void testFormHandlerClass() {
    assertThat(startEvent.getOrqueioFormHandlerClass()).isEqualTo(TEST_CLASS_XML);
    assertThat(userTask.getOrqueioFormHandlerClass()).isEqualTo(TEST_CLASS_XML);
    startEvent.setOrqueioFormHandlerClass(TEST_CLASS_API);
    userTask.setOrqueioFormHandlerClass(TEST_CLASS_API);
    assertThat(startEvent.getOrqueioFormHandlerClass()).isEqualTo(TEST_CLASS_API);
    assertThat(userTask.getOrqueioFormHandlerClass()).isEqualTo(TEST_CLASS_API);
  }

  @Test
  public void testFormKey() {
    assertThat(startEvent.getOrqueioFormKey()).isEqualTo(TEST_STRING_XML);
    assertThat(userTask.getOrqueioFormKey()).isEqualTo(TEST_STRING_XML);
    startEvent.setOrqueioFormKey(TEST_STRING_API);
    userTask.setOrqueioFormKey(TEST_STRING_API);
    assertThat(startEvent.getOrqueioFormKey()).isEqualTo(TEST_STRING_API);
    assertThat(userTask.getOrqueioFormKey()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testInitiator() {
    assertThat(startEvent.getOrqueioInitiator()).isEqualTo(TEST_STRING_XML);
    startEvent.setOrqueioInitiator(TEST_STRING_API);
    assertThat(startEvent.getOrqueioInitiator()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testPriority() {
    assertThat(userTask.getOrqueioPriority()).isEqualTo(TEST_PRIORITY_XML);
    userTask.setOrqueioPriority(TEST_PRIORITY_API);
    assertThat(userTask.getOrqueioPriority()).isEqualTo(TEST_PRIORITY_API);
  }

  @Test
  public void testResultVariable() {
    assertThat(serviceTask.getOrqueioResultVariable()).isEqualTo(TEST_STRING_XML);
    assertThat(messageEventDefinition.getOrqueioResultVariable()).isEqualTo(TEST_STRING_XML);
    serviceTask.setOrqueioResultVariable(TEST_STRING_API);
    messageEventDefinition.setOrqueioResultVariable(TEST_STRING_API);
    assertThat(serviceTask.getOrqueioResultVariable()).isEqualTo(TEST_STRING_API);
    assertThat(messageEventDefinition.getOrqueioResultVariable()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testType() {
    assertThat(serviceTask.getOrqueioType()).isEqualTo(TEST_TYPE_XML);
    assertThat(messageEventDefinition.getOrqueioType()).isEqualTo(TEST_STRING_XML);
    serviceTask.setOrqueioType(TEST_TYPE_API);
    messageEventDefinition.setOrqueioType(TEST_STRING_API);
    assertThat(serviceTask.getOrqueioType()).isEqualTo(TEST_TYPE_API);
    assertThat(messageEventDefinition.getOrqueioType()).isEqualTo(TEST_STRING_API);

  }

  @Test
  public void testTopic() {
    assertThat(serviceTask.getOrqueioTopic()).isEqualTo(TEST_STRING_XML);
    assertThat(messageEventDefinition.getOrqueioTopic()).isEqualTo(TEST_STRING_XML);
    serviceTask.setOrqueioTopic(TEST_TYPE_API);
    messageEventDefinition.setOrqueioTopic(TEST_STRING_API);
    assertThat(serviceTask.getOrqueioTopic()).isEqualTo(TEST_TYPE_API);
    assertThat(messageEventDefinition.getOrqueioTopic()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testVariableMappingClass() {
    assertThat(callActivity.getOrqueioVariableMappingClass()).isEqualTo(TEST_CLASS_XML);
    callActivity.setOrqueioVariableMappingClass(TEST_CLASS_API);
    assertThat(callActivity.getOrqueioVariableMappingClass()).isEqualTo(TEST_CLASS_API);
  }

  @Test
  public void testVariableMappingDelegateExpression() {
    assertThat(callActivity.getOrqueioVariableMappingDelegateExpression()).isEqualTo(TEST_DELEGATE_EXPRESSION_XML);
    callActivity.setOrqueioVariableMappingDelegateExpression(TEST_DELEGATE_EXPRESSION_API);
    assertThat(callActivity.getOrqueioVariableMappingDelegateExpression()).isEqualTo(TEST_DELEGATE_EXPRESSION_API);
  }

  @Test
  public void testExecutionListenerExtension() {
    OrqueioExecutionListener processListener = process.getExtensionElements().getElementsQuery().filterByType(OrqueioExecutionListener.class).singleResult();
    OrqueioExecutionListener startEventListener = startEvent.getExtensionElements().getElementsQuery().filterByType(OrqueioExecutionListener.class).singleResult();
    OrqueioExecutionListener serviceTaskListener = serviceTask.getExtensionElements().getElementsQuery().filterByType(OrqueioExecutionListener.class).singleResult();
    assertThat(processListener.getOrqueioClass()).isEqualTo(TEST_CLASS_XML);
    assertThat(processListener.getOrqueioEvent()).isEqualTo(TEST_EXECUTION_EVENT_XML);
    assertThat(startEventListener.getOrqueioExpression()).isEqualTo(TEST_EXPRESSION_XML);
    assertThat(startEventListener.getOrqueioEvent()).isEqualTo(TEST_EXECUTION_EVENT_XML);
    assertThat(serviceTaskListener.getOrqueioDelegateExpression()).isEqualTo(TEST_DELEGATE_EXPRESSION_XML);
    assertThat(serviceTaskListener.getOrqueioEvent()).isEqualTo(TEST_EXECUTION_EVENT_XML);
    processListener.setOrqueioClass(TEST_CLASS_API);
    processListener.setOrqueioEvent(TEST_EXECUTION_EVENT_API);
    startEventListener.setOrqueioExpression(TEST_EXPRESSION_API);
    startEventListener.setOrqueioEvent(TEST_EXECUTION_EVENT_API);
    serviceTaskListener.setOrqueioDelegateExpression(TEST_DELEGATE_EXPRESSION_API);
    serviceTaskListener.setOrqueioEvent(TEST_EXECUTION_EVENT_API);
    assertThat(processListener.getOrqueioClass()).isEqualTo(TEST_CLASS_API);
    assertThat(processListener.getOrqueioEvent()).isEqualTo(TEST_EXECUTION_EVENT_API);
    assertThat(startEventListener.getOrqueioExpression()).isEqualTo(TEST_EXPRESSION_API);
    assertThat(startEventListener.getOrqueioEvent()).isEqualTo(TEST_EXECUTION_EVENT_API);
    assertThat(serviceTaskListener.getOrqueioDelegateExpression()).isEqualTo(TEST_DELEGATE_EXPRESSION_API);
    assertThat(serviceTaskListener.getOrqueioEvent()).isEqualTo(TEST_EXECUTION_EVENT_API);
  }

  @Test
  public void testOrqueioScriptExecutionListener() {
    OrqueioExecutionListener sequenceFlowListener = sequenceFlow.getExtensionElements().getElementsQuery().filterByType(OrqueioExecutionListener.class).singleResult();

    OrqueioScript script = sequenceFlowListener.getOrqueioScript();
    assertThat(script.getOrqueioScriptFormat()).isEqualTo("groovy");
    assertThat(script.getOrqueioResource()).isNull();
    assertThat(script.getTextContent()).isEqualTo("println 'Hello World'");

    OrqueioScript newScript = modelInstance.newInstance(OrqueioScript.class);
    newScript.setOrqueioScriptFormat("groovy");
    newScript.setOrqueioResource("test.groovy");
    sequenceFlowListener.setOrqueioScript(newScript);

    script = sequenceFlowListener.getOrqueioScript();
    assertThat(script.getOrqueioScriptFormat()).isEqualTo("groovy");
    assertThat(script.getOrqueioResource()).isEqualTo("test.groovy");
    assertThat(script.getTextContent()).isEmpty();
  }

  @Test
  public void testFailedJobRetryTimeCycleExtension() {
    OrqueioFailedJobRetryTimeCycle timeCycle = sendTask.getExtensionElements().getElementsQuery().filterByType(OrqueioFailedJobRetryTimeCycle.class).singleResult();
    assertThat(timeCycle.getTextContent()).isEqualTo(TEST_STRING_XML);
    timeCycle.setTextContent(TEST_STRING_API);
    assertThat(timeCycle.getTextContent()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testFieldExtension() {
    OrqueioField field = sendTask.getExtensionElements().getElementsQuery().filterByType(OrqueioField.class).singleResult();
    assertThat(field.getOrqueioName()).isEqualTo(TEST_STRING_XML);
    assertThat(field.getOrqueioExpression()).isEqualTo(TEST_EXPRESSION_XML);
    assertThat(field.getOrqueioStringValue()).isEqualTo(TEST_STRING_XML);
    assertThat(field.getOrqueioExpressionChild().getTextContent()).isEqualTo(TEST_EXPRESSION_XML);
    assertThat(field.getOrqueioString().getTextContent()).isEqualTo(TEST_STRING_XML);
    field.setOrqueioName(TEST_STRING_API);
    field.setOrqueioExpression(TEST_EXPRESSION_API);
    field.setOrqueioStringValue(TEST_STRING_API);
    field.getOrqueioExpressionChild().setTextContent(TEST_EXPRESSION_API);
    field.getOrqueioString().setTextContent(TEST_STRING_API);
    assertThat(field.getOrqueioName()).isEqualTo(TEST_STRING_API);
    assertThat(field.getOrqueioExpression()).isEqualTo(TEST_EXPRESSION_API);
    assertThat(field.getOrqueioStringValue()).isEqualTo(TEST_STRING_API);
    assertThat(field.getOrqueioExpressionChild().getTextContent()).isEqualTo(TEST_EXPRESSION_API);
    assertThat(field.getOrqueioString().getTextContent()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testFormData() {
    OrqueioFormData formData = userTask.getExtensionElements().getElementsQuery().filterByType(OrqueioFormData.class).singleResult();
    OrqueioFormField formField = formData.getOrqueioFormFields().iterator().next();
    assertThat(formField.getOrqueioId()).isEqualTo(TEST_STRING_XML);
    assertThat(formField.getOrqueioLabel()).isEqualTo(TEST_STRING_XML);
    assertThat(formField.getOrqueioType()).isEqualTo(TEST_STRING_XML);
    assertThat(formField.getOrqueioDatePattern()).isEqualTo(TEST_STRING_XML);
    assertThat(formField.getOrqueioDefaultValue()).isEqualTo(TEST_STRING_XML);
    formField.setOrqueioId(TEST_STRING_API);
    formField.setOrqueioLabel(TEST_STRING_API);
    formField.setOrqueioType(TEST_STRING_API);
    formField.setOrqueioDatePattern(TEST_STRING_API);
    formField.setOrqueioDefaultValue(TEST_STRING_API);
    assertThat(formField.getOrqueioId()).isEqualTo(TEST_STRING_API);
    assertThat(formField.getOrqueioLabel()).isEqualTo(TEST_STRING_API);
    assertThat(formField.getOrqueioType()).isEqualTo(TEST_STRING_API);
    assertThat(formField.getOrqueioDatePattern()).isEqualTo(TEST_STRING_API);
    assertThat(formField.getOrqueioDefaultValue()).isEqualTo(TEST_STRING_API);

    OrqueioProperty property = formField.getOrqueioProperties().getOrqueioProperties().iterator().next();
    assertThat(property.getOrqueioId()).isEqualTo(TEST_STRING_XML);
    assertThat(property.getOrqueioValue()).isEqualTo(TEST_STRING_XML);
    property.setOrqueioId(TEST_STRING_API);
    property.setOrqueioValue(TEST_STRING_API);
    assertThat(property.getOrqueioId()).isEqualTo(TEST_STRING_API);
    assertThat(property.getOrqueioValue()).isEqualTo(TEST_STRING_API);

    OrqueioConstraint constraint = formField.getOrqueioValidation().getOrqueioConstraints().iterator().next();
    assertThat(constraint.getOrqueioName()).isEqualTo(TEST_STRING_XML);
    assertThat(constraint.getOrqueioConfig()).isEqualTo(TEST_STRING_XML);
    constraint.setOrqueioName(TEST_STRING_API);
    constraint.setOrqueioConfig(TEST_STRING_API);
    assertThat(constraint.getOrqueioName()).isEqualTo(TEST_STRING_API);
    assertThat(constraint.getOrqueioConfig()).isEqualTo(TEST_STRING_API);

    OrqueioValue value = formField.getOrqueioValues().iterator().next();
    assertThat(value.getOrqueioId()).isEqualTo(TEST_STRING_XML);
    assertThat(value.getOrqueioName()).isEqualTo(TEST_STRING_XML);
    value.setOrqueioId(TEST_STRING_API);
    value.setOrqueioName(TEST_STRING_API);
    assertThat(value.getOrqueioId()).isEqualTo(TEST_STRING_API);
    assertThat(value.getOrqueioName()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testFormProperty() {
    OrqueioFormProperty formProperty = startEvent.getExtensionElements().getElementsQuery().filterByType(OrqueioFormProperty.class).singleResult();
    assertThat(formProperty.getOrqueioId()).isEqualTo(TEST_STRING_XML);
    assertThat(formProperty.getOrqueioName()).isEqualTo(TEST_STRING_XML);
    assertThat(formProperty.getOrqueioType()).isEqualTo(TEST_STRING_XML);
    assertThat(formProperty.isOrqueioRequired()).isFalse();
    assertThat(formProperty.isOrqueioReadable()).isTrue();
    assertThat(formProperty.isOrqueioWriteable()).isTrue();
    assertThat(formProperty.getOrqueioVariable()).isEqualTo(TEST_STRING_XML);
    assertThat(formProperty.getOrqueioExpression()).isEqualTo(TEST_EXPRESSION_XML);
    assertThat(formProperty.getOrqueioDatePattern()).isEqualTo(TEST_STRING_XML);
    assertThat(formProperty.getOrqueioDefault()).isEqualTo(TEST_STRING_XML);
    formProperty.setOrqueioId(TEST_STRING_API);
    formProperty.setOrqueioName(TEST_STRING_API);
    formProperty.setOrqueioType(TEST_STRING_API);
    formProperty.setOrqueioRequired(true);
    formProperty.setOrqueioReadable(false);
    formProperty.setOrqueioWriteable(false);
    formProperty.setOrqueioVariable(TEST_STRING_API);
    formProperty.setOrqueioExpression(TEST_EXPRESSION_API);
    formProperty.setOrqueioDatePattern(TEST_STRING_API);
    formProperty.setOrqueioDefault(TEST_STRING_API);
    assertThat(formProperty.getOrqueioId()).isEqualTo(TEST_STRING_API);
    assertThat(formProperty.getOrqueioName()).isEqualTo(TEST_STRING_API);
    assertThat(formProperty.getOrqueioType()).isEqualTo(TEST_STRING_API);
    assertThat(formProperty.isOrqueioRequired()).isTrue();
    assertThat(formProperty.isOrqueioReadable()).isFalse();
    assertThat(formProperty.isOrqueioWriteable()).isFalse();
    assertThat(formProperty.getOrqueioVariable()).isEqualTo(TEST_STRING_API);
    assertThat(formProperty.getOrqueioExpression()).isEqualTo(TEST_EXPRESSION_API);
    assertThat(formProperty.getOrqueioDatePattern()).isEqualTo(TEST_STRING_API);
    assertThat(formProperty.getOrqueioDefault()).isEqualTo(TEST_STRING_API);
  }

  @Test
  public void testInExtension() {
    OrqueioIn in = callActivity.getExtensionElements().getElementsQuery().filterByType(OrqueioIn.class).singleResult();
    assertThat(in.getOrqueioSource()).isEqualTo(TEST_STRING_XML);
    assertThat(in.getOrqueioSourceExpression()).isEqualTo(TEST_EXPRESSION_XML);
    assertThat(in.getOrqueioVariables()).isEqualTo(TEST_STRING_XML);
    assertThat(in.getOrqueioTarget()).isEqualTo(TEST_STRING_XML);
    assertThat(in.getOrqueioBusinessKey()).isEqualTo(TEST_EXPRESSION_XML);
    assertThat(in.getOrqueioLocal()).isTrue();
    in.setOrqueioSource(TEST_STRING_API);
    in.setOrqueioSourceExpression(TEST_EXPRESSION_API);
    in.setOrqueioVariables(TEST_STRING_API);
    in.setOrqueioTarget(TEST_STRING_API);
    in.setOrqueioBusinessKey(TEST_EXPRESSION_API);
    in.setOrqueioLocal(false);
    assertThat(in.getOrqueioSource()).isEqualTo(TEST_STRING_API);
    assertThat(in.getOrqueioSourceExpression()).isEqualTo(TEST_EXPRESSION_API);
    assertThat(in.getOrqueioVariables()).isEqualTo(TEST_STRING_API);
    assertThat(in.getOrqueioTarget()).isEqualTo(TEST_STRING_API);
    assertThat(in.getOrqueioBusinessKey()).isEqualTo(TEST_EXPRESSION_API);
    assertThat(in.getOrqueioLocal()).isFalse();
  }

  @Test
  public void testOutExtension() {
    OrqueioOut out = callActivity.getExtensionElements().getElementsQuery().filterByType(OrqueioOut.class).singleResult();
    assertThat(out.getOrqueioSource()).isEqualTo(TEST_STRING_XML);
    assertThat(out.getOrqueioSourceExpression()).isEqualTo(TEST_EXPRESSION_XML);
    assertThat(out.getOrqueioVariables()).isEqualTo(TEST_STRING_XML);
    assertThat(out.getOrqueioTarget()).isEqualTo(TEST_STRING_XML);
    assertThat(out.getOrqueioLocal()).isTrue();
    out.setOrqueioSource(TEST_STRING_API);
    out.setOrqueioSourceExpression(TEST_EXPRESSION_API);
    out.setOrqueioVariables(TEST_STRING_API);
    out.setOrqueioTarget(TEST_STRING_API);
    out.setOrqueioLocal(false);
    assertThat(out.getOrqueioSource()).isEqualTo(TEST_STRING_API);
    assertThat(out.getOrqueioSourceExpression()).isEqualTo(TEST_EXPRESSION_API);
    assertThat(out.getOrqueioVariables()).isEqualTo(TEST_STRING_API);
    assertThat(out.getOrqueioTarget()).isEqualTo(TEST_STRING_API);
    assertThat(out.getOrqueioLocal()).isFalse();
  }

  @Test
  public void testPotentialStarter() {
    OrqueioPotentialStarter potentialStarter = startEvent.getExtensionElements().getElementsQuery().filterByType(OrqueioPotentialStarter.class).singleResult();
    Expression expression = potentialStarter.getResourceAssignmentExpression().getExpression();
    assertThat(expression.getTextContent()).isEqualTo(TEST_GROUPS_XML);
    expression.setTextContent(TEST_GROUPS_API);
    assertThat(expression.getTextContent()).isEqualTo(TEST_GROUPS_API);
  }

  @Test
  public void testTaskListener() {
    OrqueioTaskListener taskListener = userTask.getExtensionElements().getElementsQuery().filterByType(OrqueioTaskListener.class).list().get(0);
    assertThat(taskListener.getOrqueioEvent()).isEqualTo(TEST_TASK_EVENT_XML);
    assertThat(taskListener.getOrqueioClass()).isEqualTo(TEST_CLASS_XML);
    assertThat(taskListener.getOrqueioExpression()).isEqualTo(TEST_EXPRESSION_XML);
    assertThat(taskListener.getOrqueioDelegateExpression()).isEqualTo(TEST_DELEGATE_EXPRESSION_XML);
    taskListener.setOrqueioEvent(TEST_TASK_EVENT_API);
    taskListener.setOrqueioClass(TEST_CLASS_API);
    taskListener.setOrqueioExpression(TEST_EXPRESSION_API);
    taskListener.setOrqueioDelegateExpression(TEST_DELEGATE_EXPRESSION_API);
    assertThat(taskListener.getOrqueioEvent()).isEqualTo(TEST_TASK_EVENT_API);
    assertThat(taskListener.getOrqueioClass()).isEqualTo(TEST_CLASS_API);
    assertThat(taskListener.getOrqueioExpression()).isEqualTo(TEST_EXPRESSION_API);
    assertThat(taskListener.getOrqueioDelegateExpression()).isEqualTo(TEST_DELEGATE_EXPRESSION_API);

    OrqueioField field = taskListener.getOrqueioFields().iterator().next();
    assertThat(field.getOrqueioName()).isEqualTo(TEST_STRING_XML);
    assertThat(field.getOrqueioString().getTextContent()).isEqualTo(TEST_STRING_XML);

    Collection<TimerEventDefinition> timeouts = taskListener.getTimeouts();
    assertThat(timeouts.size()).isEqualTo(1);

    TimerEventDefinition timeout = timeouts.iterator().next();
    assertThat(timeout.getTimeCycle()).isNull();
    assertThat(timeout.getTimeDate()).isNull();
    assertThat(timeout.getTimeDuration()).isNotNull();
    assertThat(timeout.getTimeDuration().getRawTextContent()).isEqualTo("PT1H");
  }

  @Test
  public void testOrqueioScriptTaskListener() {
    OrqueioTaskListener taskListener = userTask.getExtensionElements().getElementsQuery().filterByType(OrqueioTaskListener.class).list().get(1);

    OrqueioScript script = taskListener.getOrqueioScript();
    assertThat(script.getOrqueioScriptFormat()).isEqualTo("groovy");
    assertThat(script.getOrqueioResource()).isEqualTo("test.groovy");
    assertThat(script.getTextContent()).isEmpty();

    OrqueioScript newScript = modelInstance.newInstance(OrqueioScript.class);
    newScript.setOrqueioScriptFormat("groovy");
    newScript.setTextContent("println 'Hello World'");
    taskListener.setOrqueioScript(newScript);

    script = taskListener.getOrqueioScript();
    assertThat(script.getOrqueioScriptFormat()).isEqualTo("groovy");
    assertThat(script.getOrqueioResource()).isNull();
    assertThat(script.getTextContent()).isEqualTo("println 'Hello World'");
  }

  @Test
  public void testOrqueioModelerProperties() {
    OrqueioProperties orqueioProperties = endEvent.getExtensionElements().getElementsQuery().filterByType(OrqueioProperties.class).singleResult();
    assertThat(orqueioProperties).isNotNull();
    assertThat(orqueioProperties.getOrqueioProperties()).hasSize(2);

    for (OrqueioProperty orqueioProperty : orqueioProperties.getOrqueioProperties()) {
      assertThat(orqueioProperty.getOrqueioId()).isNull();
      assertThat(orqueioProperty.getOrqueioName()).startsWith("name");
      assertThat(orqueioProperty.getOrqueioValue()).startsWith("value");
    }
  }

  @Test
  public void testGetNonExistingOrqueioCandidateUsers() {
    userTask.removeAttributeNs(namespace, "candidateUsers");
    assertThat(userTask.getOrqueioCandidateUsers()).isNull();
    assertThat(userTask.getOrqueioCandidateUsersList()).isEmpty();
  }

  @Test
  public void testSetNullOrqueioCandidateUsers() {
    assertThat(userTask.getOrqueioCandidateUsers()).isNotEmpty();
    assertThat(userTask.getOrqueioCandidateUsersList()).isNotEmpty();
    userTask.setOrqueioCandidateUsers(null);
    assertThat(userTask.getOrqueioCandidateUsers()).isNull();
    assertThat(userTask.getOrqueioCandidateUsersList()).isEmpty();
  }

  @Test
  public void testEmptyOrqueioCandidateUsers() {
    assertThat(userTask.getOrqueioCandidateUsers()).isNotEmpty();
    assertThat(userTask.getOrqueioCandidateUsersList()).isNotEmpty();
    userTask.setOrqueioCandidateUsers("");
    assertThat(userTask.getOrqueioCandidateUsers()).isNull();
    assertThat(userTask.getOrqueioCandidateUsersList()).isEmpty();
  }

  @Test
  public void testSetNullOrqueioCandidateUsersList() {
    assertThat(userTask.getOrqueioCandidateUsers()).isNotEmpty();
    assertThat(userTask.getOrqueioCandidateUsersList()).isNotEmpty();
    userTask.setOrqueioCandidateUsersList(null);
    assertThat(userTask.getOrqueioCandidateUsers()).isNull();
    assertThat(userTask.getOrqueioCandidateUsersList()).isEmpty();
  }

  @Test
  public void testEmptyOrqueioCandidateUsersList() {
    assertThat(userTask.getOrqueioCandidateUsers()).isNotEmpty();
    assertThat(userTask.getOrqueioCandidateUsersList()).isNotEmpty();
    userTask.setOrqueioCandidateUsersList(Collections.<String>emptyList());
    assertThat(userTask.getOrqueioCandidateUsers()).isNull();
    assertThat(userTask.getOrqueioCandidateUsersList()).isEmpty();
  }

  @Test
  public void testScriptResource() {
    assertThat(scriptTask.getScriptFormat()).isEqualTo("groovy");
    assertThat(scriptTask.getOrqueioResource()).isEqualTo("test.groovy");
  }

  @Test
  public void testOrqueioConnector() {
    OrqueioConnector orqueioConnector = serviceTask.getExtensionElements().getElementsQuery().filterByType(OrqueioConnector.class).singleResult();
    assertThat(orqueioConnector).isNotNull();

    OrqueioConnectorId orqueioConnectorId = orqueioConnector.getOrqueioConnectorId();
    assertThat(orqueioConnectorId).isNotNull();
    assertThat(orqueioConnectorId.getTextContent()).isEqualTo("soap-http-connector");

    OrqueioInputOutput orqueioInputOutput = orqueioConnector.getOrqueioInputOutput();

    Collection<OrqueioInputParameter> inputParameters = orqueioInputOutput.getOrqueioInputParameters();
    assertThat(inputParameters).hasSize(1);

    OrqueioInputParameter inputParameter = inputParameters.iterator().next();
    assertThat(inputParameter.getOrqueioName()).isEqualTo("endpointUrl");
    assertThat(inputParameter.getTextContent()).isEqualTo("http://example.com/webservice");

    Collection<OrqueioOutputParameter> outputParameters = orqueioInputOutput.getOrqueioOutputParameters();
    assertThat(outputParameters).hasSize(1);

    OrqueioOutputParameter outputParameter = outputParameters.iterator().next();
    assertThat(outputParameter.getOrqueioName()).isEqualTo("result");
    assertThat(outputParameter.getTextContent()).isEqualTo("output");
  }

  @Test
  public void testOrqueioInputOutput() {
    OrqueioInputOutput orqueioInputOutput = serviceTask.getExtensionElements().getElementsQuery().filterByType(OrqueioInputOutput.class).singleResult();
    assertThat(orqueioInputOutput).isNotNull();
    assertThat(orqueioInputOutput.getOrqueioInputParameters()).hasSize(6);
    assertThat(orqueioInputOutput.getOrqueioOutputParameters()).hasSize(1);
  }

  @Test
  public void testOrqueioInputParameter() {
    // find existing
    OrqueioInputParameter inputParameter = findInputParameterByName(serviceTask, "shouldBeConstant");

    // modify existing
    inputParameter.setOrqueioName("hello");
    inputParameter.setTextContent("world");
    inputParameter = findInputParameterByName(serviceTask, "hello");
    assertThat(inputParameter.getTextContent()).isEqualTo("world");

    // add new one
    inputParameter = modelInstance.newInstance(OrqueioInputParameter.class);
    inputParameter.setOrqueioName("abc");
    inputParameter.setTextContent("def");
    serviceTask.getExtensionElements().getElementsQuery().filterByType(OrqueioInputOutput.class).singleResult()
      .addChildElement(inputParameter);

    // search for new one
    inputParameter = findInputParameterByName(serviceTask, "abc");
    assertThat(inputParameter.getOrqueioName()).isEqualTo("abc");
    assertThat(inputParameter.getTextContent()).isEqualTo("def");
  }

  @Test
  public void testOrqueioNullInputParameter() {
    OrqueioInputParameter inputParameter = findInputParameterByName(serviceTask, "shouldBeNull");
    assertThat(inputParameter.getOrqueioName()).isEqualTo("shouldBeNull");
    assertThat(inputParameter.getTextContent()).isEmpty();
  }

  @Test
  public void testOrqueioConstantInputParameter() {
    OrqueioInputParameter inputParameter = findInputParameterByName(serviceTask, "shouldBeConstant");
    assertThat(inputParameter.getOrqueioName()).isEqualTo("shouldBeConstant");
    assertThat(inputParameter.getTextContent()).isEqualTo("foo");
  }

  @Test
  public void testOrqueioExpressionInputParameter() {
    OrqueioInputParameter inputParameter = findInputParameterByName(serviceTask, "shouldBeExpression");
    assertThat(inputParameter.getOrqueioName()).isEqualTo("shouldBeExpression");
    assertThat(inputParameter.getTextContent()).isEqualTo("${1 + 1}");
  }

  @Test
  public void testOrqueioListInputParameter() {
    OrqueioInputParameter inputParameter = findInputParameterByName(serviceTask, "shouldBeList");
    assertThat(inputParameter.getOrqueioName()).isEqualTo("shouldBeList");
    assertThat(inputParameter.getTextContent()).isNotEmpty();
    assertThat(inputParameter.getUniqueChildElementByNameNs(ORQUEIO_NS, "list")).isNotNull();

    OrqueioList list = inputParameter.getValue();
    assertThat(list.getValues()).hasSize(3);
    for (BpmnModelElementInstance values : list.getValues()) {
      assertThat(values.getTextContent()).isIn("a", "b", "c");
    }

    list = modelInstance.newInstance(OrqueioList.class);
    for (int i = 0; i < 4; i++) {
      OrqueioValue value = modelInstance.newInstance(OrqueioValue.class);
      value.setTextContent("test");
      list.getValues().add(value);
    }
    Collection<OrqueioValue> testValues = Arrays.asList(modelInstance.newInstance(OrqueioValue.class), modelInstance.newInstance(OrqueioValue.class));
    list.getValues().addAll(testValues);
    inputParameter.setValue(list);

    list = inputParameter.getValue();
    assertThat(list.getValues()).hasSize(6);
    list.getValues().removeAll(testValues);
    ArrayList<BpmnModelElementInstance> orqueioValues = new ArrayList<BpmnModelElementInstance>(list.getValues());
    assertThat(orqueioValues).hasSize(4);
    for (BpmnModelElementInstance value : orqueioValues) {
      assertThat(value.getTextContent()).isEqualTo("test");
    }

    list.getValues().remove(orqueioValues.get(1));
    assertThat(list.getValues()).hasSize(3);

    list.getValues().removeAll(Arrays.asList(orqueioValues.get(0), orqueioValues.get(3)));
    assertThat(list.getValues()).hasSize(1);

    list.getValues().clear();
    assertThat(list.getValues()).isEmpty();

    // test standard list interactions
    Collection<BpmnModelElementInstance> elements = list.getValues();

    OrqueioValue value = modelInstance.newInstance(OrqueioValue.class);
    elements.add(value);

    List<OrqueioValue> newValues = new ArrayList<OrqueioValue>();
    newValues.add(modelInstance.newInstance(OrqueioValue.class));
    newValues.add(modelInstance.newInstance(OrqueioValue.class));
    elements.addAll(newValues);
    assertThat(elements).hasSize(3);

    assertThat(elements).doesNotContain(modelInstance.newInstance(OrqueioValue.class));
    assertThat(elements.containsAll(Arrays.asList(modelInstance.newInstance(OrqueioValue.class)))).isFalse();

    assertThat(elements.remove(modelInstance.newInstance(OrqueioValue.class))).isFalse();
    assertThat(elements).hasSize(3);

    assertThat(elements.remove(value)).isTrue();
    assertThat(elements).hasSize(2);

    assertThat(elements.removeAll(newValues)).isTrue();
    assertThat(elements).isEmpty();

    elements.add(modelInstance.newInstance(OrqueioValue.class));
    elements.clear();
    assertThat(elements).isEmpty();

    inputParameter.removeValue();
    assertThat((Object) inputParameter.getValue()).isNull();

  }

  @Test
  public void testOrqueioMapInputParameter() {
    OrqueioInputParameter inputParameter = findInputParameterByName(serviceTask, "shouldBeMap");
    assertThat(inputParameter.getOrqueioName()).isEqualTo("shouldBeMap");
    assertThat(inputParameter.getTextContent()).isNotEmpty();
    assertThat(inputParameter.getUniqueChildElementByNameNs(ORQUEIO_NS, "map")).isNotNull();

    OrqueioMap map = inputParameter.getValue();
    assertThat(map.getOrqueioEntries()).hasSize(2);
    for (OrqueioEntry entry : map.getOrqueioEntries()) {
      if (entry.getOrqueioKey().equals("foo")) {
        assertThat(entry.getTextContent()).isEqualTo("bar");
      }
      else {
        assertThat(entry.getOrqueioKey()).isEqualTo("hello");
        assertThat(entry.getTextContent()).isEqualTo("world");
      }
    }

    map = modelInstance.newInstance(OrqueioMap.class);
    OrqueioEntry entry = modelInstance.newInstance(OrqueioEntry.class);
    entry.setOrqueioKey("test");
    entry.setTextContent("value");
    map.getOrqueioEntries().add(entry);

    inputParameter.setValue(map);
    map = inputParameter.getValue();
    assertThat(map.getOrqueioEntries()).hasSize(1);
    entry = map.getOrqueioEntries().iterator().next();
    assertThat(entry.getOrqueioKey()).isEqualTo("test");
    assertThat(entry.getTextContent()).isEqualTo("value");

    Collection<OrqueioEntry> entries = map.getOrqueioEntries();
    entries.add(modelInstance.newInstance(OrqueioEntry.class));
    assertThat(entries).hasSize(2);

    inputParameter.removeValue();
    assertThat((Object) inputParameter.getValue()).isNull();
  }

  @Test
  public void testOrqueioScriptInputParameter() {
    OrqueioInputParameter inputParameter = findInputParameterByName(serviceTask, "shouldBeScript");
    assertThat(inputParameter.getOrqueioName()).isEqualTo("shouldBeScript");
    assertThat(inputParameter.getTextContent()).isNotEmpty();
    assertThat(inputParameter.getUniqueChildElementByNameNs(ORQUEIO_NS, "script")).isNotNull();
    assertThat(inputParameter.getUniqueChildElementByType(OrqueioScript.class)).isNotNull();

    OrqueioScript script = inputParameter.getValue();
    assertThat(script.getOrqueioScriptFormat()).isEqualTo("groovy");
    assertThat(script.getOrqueioResource()).isNull();
    assertThat(script.getTextContent()).isEqualTo("1 + 1");

    script = modelInstance.newInstance(OrqueioScript.class);
    script.setOrqueioScriptFormat("python");
    script.setOrqueioResource("script.py");

    inputParameter.setValue(script);

    script = inputParameter.getValue();
    assertThat(script.getOrqueioScriptFormat()).isEqualTo("python");
    assertThat(script.getOrqueioResource()).isEqualTo("script.py");
    assertThat(script.getTextContent()).isEmpty();

    inputParameter.removeValue();
    assertThat((Object) inputParameter.getValue()).isNull();
  }

  @Test
  public void testOrqueioNestedOutputParameter() {
    OrqueioOutputParameter orqueioOutputParameter = serviceTask.getExtensionElements().getElementsQuery().filterByType(OrqueioInputOutput.class).singleResult().getOrqueioOutputParameters().iterator().next();

    assertThat(orqueioOutputParameter).isNotNull();
    assertThat(orqueioOutputParameter.getOrqueioName()).isEqualTo("nested");
    OrqueioList list = orqueioOutputParameter.getValue();
    assertThat(list).isNotNull();
    assertThat(list.getValues()).hasSize(2);
    Iterator<BpmnModelElementInstance> iterator = list.getValues().iterator();

    // nested list
    OrqueioList nestedList = (OrqueioList) iterator.next().getUniqueChildElementByType(OrqueioList.class);
    assertThat(nestedList).isNotNull();
    assertThat(nestedList.getValues()).hasSize(2);
    for (BpmnModelElementInstance value : nestedList.getValues()) {
      assertThat(value.getTextContent()).isEqualTo("list");
    }

    // nested map
    OrqueioMap nestedMap = (OrqueioMap) iterator.next().getUniqueChildElementByType(OrqueioMap.class);
    assertThat(nestedMap).isNotNull();
    assertThat(nestedMap.getOrqueioEntries()).hasSize(2);
    Iterator<OrqueioEntry> mapIterator = nestedMap.getOrqueioEntries().iterator();

    // nested list in nested map
    OrqueioEntry nestedListEntry = mapIterator.next();
    assertThat(nestedListEntry).isNotNull();
    assertThat(nestedListEntry.getOrqueioKey()).isEqualTo("list");
    OrqueioList nestedNestedList = nestedListEntry.getValue();
    for (BpmnModelElementInstance value : nestedNestedList.getValues()) {
      assertThat(value.getTextContent()).isEqualTo("map");
    }

    // nested map in nested map
    OrqueioEntry nestedMapEntry = mapIterator.next();
    assertThat(nestedMapEntry).isNotNull();
    assertThat(nestedMapEntry.getOrqueioKey()).isEqualTo("map");
    OrqueioMap nestedNestedMap = nestedMapEntry.getValue();
    OrqueioEntry entry = nestedNestedMap.getOrqueioEntries().iterator().next();
    assertThat(entry.getOrqueioKey()).isEqualTo("so");
    assertThat(entry.getTextContent()).isEqualTo("nested");
  }

  protected OrqueioInputParameter findInputParameterByName(BaseElement baseElement, String name) {
    Collection<OrqueioInputParameter> orqueioInputParameters = baseElement.getExtensionElements().getElementsQuery()
      .filterByType(OrqueioInputOutput.class).singleResult().getOrqueioInputParameters();
    for (OrqueioInputParameter orqueioInputParameter : orqueioInputParameters) {
      if (orqueioInputParameter.getOrqueioName().equals(name)) {
        return orqueioInputParameter;
      }
    }
    throw new BpmnModelException("Unable to find orqueio:inputParameter with name '" + name + "' for element with id '" + baseElement.getId() + "'");
  }

  @After
  public void validateModel() {
    Bpmn.validateModel(modelInstance);
  }
}
