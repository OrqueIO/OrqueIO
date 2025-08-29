/*
 * Copyright Toaddlaterccs and/or licensed to Toaddlaterccs
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. Toaddlaterccs this file to you under the Apache License,
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
package io.orqueio.bpm.model.bpmn.builder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Fail.fail;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.BOUNDARY_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.CALL_ACTIVITY_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.CATCH_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.CONDITION_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.EXTERNAL_TASK_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.FORM_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.PROCESS_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.SERVICE_TASK_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.START_EVENT_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.SUB_PROCESS_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TASK_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_CLASS_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_CONDITION;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_CONDITIONAL_VARIABLE_EVENTS;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_CONDITIONAL_VARIABLE_EVENTS_LIST;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_CONDITIONAL_VARIABLE_NAME;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_DELEGATE_EXPRESSION_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_DUE_DATE_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_EXPRESSION_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_EXTERNAL_TASK_TOPIC;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_FOLLOW_UP_DATE_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_GROUPS_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_GROUPS_LIST_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_HISTORY_TIME_TO_LIVE;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_PRIORITY_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_PROCESS_TASK_PRIORITY;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_SERVICE_TASK_PRIORITY;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_STARTABLE_IN_TASKLIST;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_STRING_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_STRING_FORM_REF_BINDING;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_STRING_FORM_REF_VERSION;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_USERS_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_USERS_LIST_API;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TEST_VERSION_TAG;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.TRANSACTION_ID;
import static io.orqueio.bpm.model.bpmn.BpmnTestConstants.USER_TASK_ID;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN20_NS;
import static org.junit.Assert.assertEquals;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import io.orqueio.bpm.model.bpmn.AssociationDirection;
import io.orqueio.bpm.model.bpmn.Bpmn;
import io.orqueio.bpm.model.bpmn.BpmnModelException;
import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.GatewayDirection;
import io.orqueio.bpm.model.bpmn.TransactionMethod;
import io.orqueio.bpm.model.bpmn.instance.Activity;
import io.orqueio.bpm.model.bpmn.instance.Association;
import io.orqueio.bpm.model.bpmn.instance.BaseElement;
import io.orqueio.bpm.model.bpmn.instance.BoundaryEvent;
import io.orqueio.bpm.model.bpmn.instance.BpmnModelElementInstance;
import io.orqueio.bpm.model.bpmn.instance.BusinessRuleTask;
import io.orqueio.bpm.model.bpmn.instance.CallActivity;
import io.orqueio.bpm.model.bpmn.instance.CompensateEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.ConditionalEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.Definitions;
import io.orqueio.bpm.model.bpmn.instance.Documentation;
import io.orqueio.bpm.model.bpmn.instance.EndEvent;
import io.orqueio.bpm.model.bpmn.instance.Error;
import io.orqueio.bpm.model.bpmn.instance.ErrorEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.Escalation;
import io.orqueio.bpm.model.bpmn.instance.EscalationEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.Event;
import io.orqueio.bpm.model.bpmn.instance.EventDefinition;
import io.orqueio.bpm.model.bpmn.instance.ExtensionElements;
import io.orqueio.bpm.model.bpmn.instance.FlowElement;
import io.orqueio.bpm.model.bpmn.instance.FlowNode;
import io.orqueio.bpm.model.bpmn.instance.Gateway;
import io.orqueio.bpm.model.bpmn.instance.InclusiveGateway;
import io.orqueio.bpm.model.bpmn.instance.Message;
import io.orqueio.bpm.model.bpmn.instance.MessageEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.MultiInstanceLoopCharacteristics;
import io.orqueio.bpm.model.bpmn.instance.Process;
import io.orqueio.bpm.model.bpmn.instance.ReceiveTask;
import io.orqueio.bpm.model.bpmn.instance.ScriptTask;
import io.orqueio.bpm.model.bpmn.instance.SendTask;
import io.orqueio.bpm.model.bpmn.instance.SequenceFlow;
import io.orqueio.bpm.model.bpmn.instance.ServiceTask;
import io.orqueio.bpm.model.bpmn.instance.Signal;
import io.orqueio.bpm.model.bpmn.instance.SignalEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.StartEvent;
import io.orqueio.bpm.model.bpmn.instance.SubProcess;
import io.orqueio.bpm.model.bpmn.instance.Task;
import io.orqueio.bpm.model.bpmn.instance.TimeCycle;
import io.orqueio.bpm.model.bpmn.instance.TimeDate;
import io.orqueio.bpm.model.bpmn.instance.TimeDuration;
import io.orqueio.bpm.model.bpmn.instance.TimerEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.Transaction;
import io.orqueio.bpm.model.bpmn.instance.UserTask;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioErrorEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioExecutionListener;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioFailedJobRetryTimeCycle;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioFormData;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioFormField;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioIn;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioInputOutput;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioInputParameter;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioOut;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioOutputParameter;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioTaskListener;
import io.orqueio.bpm.model.xml.Model;
import io.orqueio.bpm.model.xml.instance.ModelElementInstance;
import io.orqueio.bpm.model.xml.type.ModelElementType;
import org.junit.After;
import org.junit.BeforeClass;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;


/**
 * @author Sebastian Menski
 */
public class ProcessBuilderTest {

  public static final String TIMER_DATE = "2011-03-11T12:13:14Z";
  public static final String TIMER_DURATION = "P10D";
  public static final String TIMER_CYCLE = "R3/PT10H";

  public static final String FAILED_JOB_RETRY_TIME_CYCLE = "R5/PT1M";

  @Rule
  public ExpectedException thrown = ExpectedException.none();

  private BpmnModelInstance modelInstance;
  private static ModelElementType taskType;
  private static ModelElementType gatewayType;
  private static ModelElementType eventType;
  private static ModelElementType processType;

  @BeforeClass
  public static void getElementTypes() {
    Model model = Bpmn.createEmptyModel().getModel();
    taskType = model.getType(Task.class);
    gatewayType = model.getType(Gateway.class);
    eventType = model.getType(Event.class);
    processType = model.getType(Process.class);
  }

  @After
  public void validateModel() throws IOException {
    if (modelInstance != null) {
      Bpmn.validateModel(modelInstance);
    }
  }

  @Test
  public void testCreateEmptyProcess() {
    modelInstance = Bpmn.createProcess()
      .done();

    Definitions definitions = modelInstance.getDefinitions();
    assertThat(definitions).isNotNull();
    assertThat(definitions.getTargetNamespace()).isEqualTo(BPMN20_NS);

    Collection<ModelElementInstance> processes = modelInstance.getModelElementsByType(processType);
    assertThat(processes)
      .hasSize(1);

    Process process = (Process) processes.iterator().next();

    assertThat(process.getId()).isNotNull();
  }

  @Test
  public void emptyProcessShouldHaveDefaultHTTL() {
    modelInstance = Bpmn.createProcess().done();

    var process = (Process) modelInstance.getModelElementsByType(processType)
        .iterator()
        .next();

    assertThat(process.getOrqueioHistoryTimeToLiveString())
        .isEqualTo("P180D");
  }

  @Test
  public void shouldHaveDefaultHTTLValueOnSkipDefaultHistoryTimeToLiveFalse() {
    modelInstance = Bpmn.createProcess().done();

    var process = (Process) modelInstance.getModelElementsByType(processType)
        .iterator()
        .next();

    assertThat(process.getOrqueioHistoryTimeToLiveString())
        .isEqualTo("P180D");
  }

  @Test
  public void shouldHaveNullHTTLValueOnCreateProcessWithSkipHTTL() {
    modelInstance = Bpmn.createProcess().orqueioHistoryTimeToLive(null).done();

    var process = (Process) modelInstance.getModelElementsByType(processType)
        .iterator()
        .next();

    assertThat(process.getOrqueioHistoryTimeToLiveString())
        .isNull();
  }

  @Test
  public void shouldHaveNullHTTLValueOnCreateProcessIdWithoutSkipHTTL(){
    modelInstance = Bpmn.createProcess(PROCESS_ID).done();

    var process = (Process) modelInstance.getModelElementById(PROCESS_ID);

    assertThat(process.getOrqueioHistoryTimeToLiveString())
        .isEqualTo("P180D");
  }

  @Test
  public void shouldHaveNullHTTLValueOnCreateProcessIdWithSkipHTTL(){
    modelInstance = Bpmn.createProcess(PROCESS_ID).orqueioHistoryTimeToLive(null).done();

    var process = (Process) modelInstance.getModelElementById(PROCESS_ID);

    assertThat(process.getOrqueioHistoryTimeToLiveString())
        .isNull();
  }

  @Test
  public void testGetElement() {
    // Make sure this method is publicly available
    Process process = Bpmn.createProcess().getElement();
    assertThat(process).isNotNull();
  }

  @Test
  public void testCreateProcessWithStartEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .done();

    assertThat(modelInstance.getModelElementsByType(eventType))
      .hasSize(1);
  }

  @Test
  public void testCreateProcessWithEndEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .endEvent()
      .done();

    assertThat(modelInstance.getModelElementsByType(eventType))
      .hasSize(2);
  }

  @Test
  public void testCreateProcessWithServiceTask() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .serviceTask()
      .endEvent()
      .done();

    assertThat(modelInstance.getModelElementsByType(eventType))
      .hasSize(2);
    assertThat(modelInstance.getModelElementsByType(taskType))
      .hasSize(1);
  }

  @Test
  public void testCreateProcessWithSendTask() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .sendTask()
      .endEvent()
      .done();

    assertThat(modelInstance.getModelElementsByType(eventType))
      .hasSize(2);
    assertThat(modelInstance.getModelElementsByType(taskType))
      .hasSize(1);
  }

  @Test
  public void testCreateProcessWithUserTask() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask()
      .endEvent()
      .done();

    assertThat(modelInstance.getModelElementsByType(eventType))
      .hasSize(2);
    assertThat(modelInstance.getModelElementsByType(taskType))
      .hasSize(1);
  }

  @Test
  public void testCreateProcessWithBusinessRuleTask() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .businessRuleTask()
      .endEvent()
      .done();

    assertThat(modelInstance.getModelElementsByType(eventType))
      .hasSize(2);
    assertThat(modelInstance.getModelElementsByType(taskType))
      .hasSize(1);
  }

  @Test
  public void testCreateProcessWithScriptTask() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .scriptTask()
      .endEvent()
      .done();

    assertThat(modelInstance.getModelElementsByType(eventType))
      .hasSize(2);
    assertThat(modelInstance.getModelElementsByType(taskType))
      .hasSize(1);
  }

  @Test
  public void testCreateProcessWithReceiveTask() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .receiveTask()
      .endEvent()
      .done();

    assertThat(modelInstance.getModelElementsByType(eventType))
      .hasSize(2);
    assertThat(modelInstance.getModelElementsByType(taskType))
      .hasSize(1);
  }

  @Test
  public void testCreateProcessWithManualTask() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .manualTask()
      .endEvent()
      .done();

    assertThat(modelInstance.getModelElementsByType(eventType))
      .hasSize(2);
    assertThat(modelInstance.getModelElementsByType(taskType))
      .hasSize(1);
  }

  @Test
  public void testCreateProcessWithParallelGateway() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .parallelGateway()
        .scriptTask()
        .endEvent()
      .moveToLastGateway()
        .userTask()
        .endEvent()
      .done();

    assertThat(modelInstance.getModelElementsByType(eventType))
      .hasSize(3);
    assertThat(modelInstance.getModelElementsByType(taskType))
      .hasSize(2);
    assertThat(modelInstance.getModelElementsByType(gatewayType))
      .hasSize(1);
  }

  @Test
  public void testCreateProcessWithExclusiveGateway() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask()
      .exclusiveGateway()
        .condition("approved", "${approved}")
        .serviceTask()
        .endEvent()
      .moveToLastGateway()
        .condition("not approved", "${!approved}")
        .scriptTask()
        .endEvent()
      .done();

    assertThat(modelInstance.getModelElementsByType(eventType))
      .hasSize(3);
    assertThat(modelInstance.getModelElementsByType(taskType))
      .hasSize(3);
    assertThat(modelInstance.getModelElementsByType(gatewayType))
      .hasSize(1);
  }

  @Test
  public void testCreateProcessWithInclusiveGateway() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask()
      .inclusiveGateway()
        .condition("approved", "${approved}")
        .serviceTask()
        .endEvent()
      .moveToLastGateway()
        .condition("not approved", "${!approved}")
        .scriptTask()
        .endEvent()
      .done();

    ModelElementType inclusiveGwType = modelInstance.getModel().getType(InclusiveGateway.class);

    assertThat(modelInstance.getModelElementsByType(eventType))
      .hasSize(3);
    assertThat(modelInstance.getModelElementsByType(taskType))
      .hasSize(3);
    assertThat(modelInstance.getModelElementsByType(inclusiveGwType))
      .hasSize(1);
  }

  @Test
  public void testCreateProcessWithForkAndJoin() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask()
      .parallelGateway()
        .serviceTask()
        .parallelGateway()
        .id("join")
      .moveToLastGateway()
        .scriptTask()
      .connectTo("join")
      .userTask()
      .endEvent()
      .done();

    assertThat(modelInstance.getModelElementsByType(eventType))
      .hasSize(2);
    assertThat(modelInstance.getModelElementsByType(taskType))
      .hasSize(4);
    assertThat(modelInstance.getModelElementsByType(gatewayType))
      .hasSize(2);
  }

  @Test
  public void testCreateProcessWithMultipleParallelTask() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .parallelGateway("fork")
        .userTask()
        .parallelGateway("join")
      .moveToNode("fork")
        .serviceTask()
        .connectTo("join")
      .moveToNode("fork")
        .userTask()
        .connectTo("join")
      .moveToNode("fork")
        .scriptTask()
        .connectTo("join")
      .endEvent()
      .done();

    assertThat(modelInstance.getModelElementsByType(eventType))
      .hasSize(2);
    assertThat(modelInstance.getModelElementsByType(taskType))
      .hasSize(4);
    assertThat(modelInstance.getModelElementsByType(gatewayType))
      .hasSize(2);
  }

  @Test
  public void testBaseElementDocumentation() {
    modelInstance = Bpmn.createProcess("process")
            .documentation("processDocumentation")
            .startEvent("startEvent")
            .documentation("startEventDocumentation_1")
            .documentation("startEventDocumentation_2")
            .documentation("startEventDocumentation_3")
            .userTask("task")
            .documentation("taskDocumentation")
            .businessRuleTask("businessruletask")
            .subProcess("subprocess")
            .documentation("subProcessDocumentation")
            .embeddedSubProcess()
            .startEvent("subprocessStartEvent")
            .endEvent("subprocessEndEvent")
            .subProcessDone()
            .endEvent("endEvent")
            .documentation("endEventDocumentation")
            .done();

    assertThat(((Process) modelInstance.getModelElementById("process")).getDocumentations().iterator().next().getTextContent()).isEqualTo("processDocumentation");
    assertThat(((UserTask) modelInstance.getModelElementById("task")).getDocumentations().iterator().next().getTextContent()).isEqualTo("taskDocumentation");
    assertThat(((SubProcess) modelInstance.getModelElementById("subprocess")).getDocumentations().iterator().next().getTextContent()).isEqualTo("subProcessDocumentation");
    assertThat(((EndEvent) modelInstance.getModelElementById("endEvent")).getDocumentations().iterator().next().getTextContent()).isEqualTo("endEventDocumentation");

    final Documentation[] startEventDocumentations = ((StartEvent) modelInstance.getModelElementById("startEvent")).getDocumentations().toArray(new Documentation[]{});
    assertThat(startEventDocumentations.length).isEqualTo(3);
    for (int i = 1; i <=3; i++) {
      assertThat(startEventDocumentations[i - 1].getTextContent()).isEqualTo("startEventDocumentation_" + i);
    }
  }

  @Test
  public void testExtend() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask()
        .id("task1")
      .serviceTask()
      .endEvent()
      .done();

    assertThat(modelInstance.getModelElementsByType(taskType))
      .hasSize(2);

    UserTask userTask = modelInstance.getModelElementById("task1");
    SequenceFlow outgoingSequenceFlow = userTask.getOutgoing().iterator().next();
    FlowNode serviceTask = outgoingSequenceFlow.getTarget();
    userTask.getOutgoing().remove(outgoingSequenceFlow);
    userTask.builder()
      .scriptTask()
      .userTask()
      .connectTo(serviceTask.getId());

    assertThat(modelInstance.getModelElementsByType(taskType))
      .hasSize(4);
  }

  @Test
  public void testCreateInvoiceProcess() {
    modelInstance = Bpmn.createProcess()
      .executable()
      .startEvent()
        .name("Invoice received")
        .orqueioFormKey("embedded:app:forms/start-form.html")
      .userTask()
        .name("Assign Approver")
        .orqueioFormKey("embedded:app:forms/assign-approver.html")
        .orqueioAssignee("demo")
      .userTask("approveInvoice")
        .name("Approve Invoice")
        .orqueioFormKey("embedded:app:forms/approve-invoice.html")
        .orqueioAssignee("${approver}")
      .exclusiveGateway()
        .name("Invoice approved?")
        .gatewayDirection(GatewayDirection.Diverging)
      .condition("yes", "${approved}")
      .userTask()
        .name("Prepare Bank Transfer")
        .orqueioFormKey("embedded:app:forms/prepare-bank-transfer.html")
        .orqueioCandidateGroups("accounting")
      .serviceTask()
        .name("Archive Invoice")
        .orqueioClass("io.orqueio.bpm.example.invoice.service.ArchiveInvoiceService" )
      .endEvent()
        .name("Invoice processed")
      .moveToLastGateway()
      .condition("no", "${!approved}")
      .userTask()
        .name("Review Invoice")
        .orqueioFormKey("embedded:app:forms/review-invoice.html" )
        .orqueioAssignee("demo")
       .exclusiveGateway()
        .name("Review successful?")
        .gatewayDirection(GatewayDirection.Diverging)
      .condition("no", "${!clarified}")
      .endEvent()
        .name("Invoice not processed")
      .moveToLastGateway()
      .condition("yes", "${clarified}")
      .connectTo("approveInvoice")
      .done();
  }

  @Test
  public void testProcessOrqueioExtensions() {
    modelInstance = Bpmn.createProcess(PROCESS_ID)
      .orqueioJobPriority("${somePriority}")
      .orqueioTaskPriority(TEST_PROCESS_TASK_PRIORITY)
      .orqueioHistoryTimeToLive(TEST_HISTORY_TIME_TO_LIVE)
      .orqueioStartableInTasklist(TEST_STARTABLE_IN_TASKLIST)
      .orqueioVersionTag(TEST_VERSION_TAG)
      .startEvent()
      .endEvent()
      .done();

    Process process = modelInstance.getModelElementById(PROCESS_ID);
    assertThat(process.getOrqueioJobPriority()).isEqualTo("${somePriority}");
    assertThat(process.getOrqueioTaskPriority()).isEqualTo(TEST_PROCESS_TASK_PRIORITY);
    assertThat(process.getOrqueioHistoryTimeToLive()).isEqualTo(TEST_HISTORY_TIME_TO_LIVE);
    assertThat(process.isOrqueioStartableInTasklist()).isEqualTo(TEST_STARTABLE_IN_TASKLIST);
    assertThat(process.getOrqueioVersionTag()).isEqualTo(TEST_VERSION_TAG);
  }

  @Test
  public void testProcessStartableInTasklist() {
    modelInstance = Bpmn.createProcess(PROCESS_ID)
      .startEvent()
      .endEvent()
      .done();

    Process process = modelInstance.getModelElementById(PROCESS_ID);
    assertThat(process.isOrqueioStartableInTasklist()).isEqualTo(true);
  }

  @Test
  public void testTaskOrqueioExternalTask() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
        .serviceTask(EXTERNAL_TASK_ID)
          .orqueioExternalTask(TEST_EXTERNAL_TASK_TOPIC)
        .endEvent()
        .done();

    ServiceTask serviceTask = modelInstance.getModelElementById(EXTERNAL_TASK_ID);
    assertThat(serviceTask.getOrqueioType()).isEqualTo("external");
    assertThat(serviceTask.getOrqueioTopic()).isEqualTo(TEST_EXTERNAL_TASK_TOPIC);
  }

  @Test
  public void testTaskOrqueioExternalTaskErrorEventDefinition() {
    modelInstance = Bpmn.createProcess()
    .startEvent()
    .serviceTask(EXTERNAL_TASK_ID)
    .orqueioExternalTask(TEST_EXTERNAL_TASK_TOPIC)
      .orqueioErrorEventDefinition().id("id").error("myErrorCode", "errorMessage").expression("expression").errorEventDefinitionDone()
    .endEvent()
    .moveToActivity(EXTERNAL_TASK_ID)
    .boundaryEvent("boundary").error("myErrorCode", "errorMessage")
    .endEvent("boundaryEnd")
    .done();

    ServiceTask externalTask = modelInstance.getModelElementById(EXTERNAL_TASK_ID);
    ExtensionElements extensionElements = externalTask.getExtensionElements();
    Collection<OrqueioErrorEventDefinition> errorEventDefinitions = extensionElements.getChildElementsByType(OrqueioErrorEventDefinition.class);
    assertThat(errorEventDefinitions).hasSize(1);
    OrqueioErrorEventDefinition orqueioErrorEventDefinition = errorEventDefinitions.iterator().next();
    assertThat(orqueioErrorEventDefinition).isNotNull();
    assertThat(orqueioErrorEventDefinition.getId()).isEqualTo("id");
    assertThat(orqueioErrorEventDefinition.getOrqueioExpression()).isEqualTo("expression");
    assertErrorEventDefinition("boundary", "myErrorCode", "errorMessage");
  }

  @Test
  public void testTaskOrqueioExtensions() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .serviceTask(TASK_ID)
        .orqueioAsyncBefore()
        .notOrqueioExclusive()
        .orqueioJobPriority("${somePriority}")
        .orqueioTaskPriority(TEST_SERVICE_TASK_PRIORITY)
        .orqueioFailedJobRetryTimeCycle(FAILED_JOB_RETRY_TIME_CYCLE)
      .endEvent()
      .done();

    ServiceTask serviceTask = modelInstance.getModelElementById(TASK_ID);
    assertThat(serviceTask.isOrqueioAsyncBefore()).isTrue();
    assertThat(serviceTask.isOrqueioExclusive()).isFalse();
    assertThat(serviceTask.getOrqueioJobPriority()).isEqualTo("${somePriority}");
    assertThat(serviceTask.getOrqueioTaskPriority()).isEqualTo(TEST_SERVICE_TASK_PRIORITY);

    assertOrqueioFailedJobRetryTimeCycle(serviceTask);
  }

  @Test
  public void testServiceTaskOrqueioExtensions() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .serviceTask(TASK_ID)
        .orqueioClass(TEST_CLASS_API)
        .orqueioDelegateExpression(TEST_DELEGATE_EXPRESSION_API)
        .orqueioExpression(TEST_EXPRESSION_API)
        .orqueioResultVariable(TEST_STRING_API)
        .orqueioTopic(TEST_STRING_API)
        .orqueioType(TEST_STRING_API)
        .orqueioTaskPriority(TEST_SERVICE_TASK_PRIORITY)
        .orqueioFailedJobRetryTimeCycle(FAILED_JOB_RETRY_TIME_CYCLE)
      .done();

    ServiceTask serviceTask = modelInstance.getModelElementById(TASK_ID);
    assertThat(serviceTask.getOrqueioClass()).isEqualTo(TEST_CLASS_API);
    assertThat(serviceTask.getOrqueioDelegateExpression()).isEqualTo(TEST_DELEGATE_EXPRESSION_API);
    assertThat(serviceTask.getOrqueioExpression()).isEqualTo(TEST_EXPRESSION_API);
    assertThat(serviceTask.getOrqueioResultVariable()).isEqualTo(TEST_STRING_API);
    assertThat(serviceTask.getOrqueioTopic()).isEqualTo(TEST_STRING_API);
    assertThat(serviceTask.getOrqueioType()).isEqualTo(TEST_STRING_API);
    assertThat(serviceTask.getOrqueioTaskPriority()).isEqualTo(TEST_SERVICE_TASK_PRIORITY);

    assertOrqueioFailedJobRetryTimeCycle(serviceTask);
  }

  @Test
  public void testServiceTaskOrqueioClass() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .serviceTask(TASK_ID)
        .orqueioClass(getClass().getName())
      .done();

    ServiceTask serviceTask = modelInstance.getModelElementById(TASK_ID);
    assertThat(serviceTask.getOrqueioClass()).isEqualTo(getClass().getName());
  }


  @Test
  public void testSendTaskOrqueioExtensions() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .sendTask(TASK_ID)
        .orqueioClass(TEST_CLASS_API)
        .orqueioDelegateExpression(TEST_DELEGATE_EXPRESSION_API)
        .orqueioExpression(TEST_EXPRESSION_API)
        .orqueioResultVariable(TEST_STRING_API)
        .orqueioTopic(TEST_STRING_API)
        .orqueioType(TEST_STRING_API)
        .orqueioTaskPriority(TEST_SERVICE_TASK_PRIORITY)
        .orqueioFailedJobRetryTimeCycle(FAILED_JOB_RETRY_TIME_CYCLE)
      .endEvent()
      .done();

    SendTask sendTask = modelInstance.getModelElementById(TASK_ID);
    assertThat(sendTask.getOrqueioClass()).isEqualTo(TEST_CLASS_API);
    assertThat(sendTask.getOrqueioDelegateExpression()).isEqualTo(TEST_DELEGATE_EXPRESSION_API);
    assertThat(sendTask.getOrqueioExpression()).isEqualTo(TEST_EXPRESSION_API);
    assertThat(sendTask.getOrqueioResultVariable()).isEqualTo(TEST_STRING_API);
    assertThat(sendTask.getOrqueioTopic()).isEqualTo(TEST_STRING_API);
    assertThat(sendTask.getOrqueioType()).isEqualTo(TEST_STRING_API);
    assertThat(sendTask.getOrqueioTaskPriority()).isEqualTo(TEST_SERVICE_TASK_PRIORITY);

    assertOrqueioFailedJobRetryTimeCycle(sendTask);
  }

  @Test
  public void testSendTaskOrqueioClass() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .sendTask(TASK_ID)
        .orqueioClass(this.getClass())
      .endEvent()
      .done();

    SendTask sendTask = modelInstance.getModelElementById(TASK_ID);
    assertThat(sendTask.getOrqueioClass()).isEqualTo(this.getClass().getName());
  }

  @Test
  public void testUserTaskOrqueioExtensions() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask(TASK_ID)
        .orqueioAssignee(TEST_STRING_API)
        .orqueioCandidateGroups(TEST_GROUPS_API)
        .orqueioCandidateUsers(TEST_USERS_LIST_API)
        .orqueioDueDate(TEST_DUE_DATE_API)
        .orqueioFollowUpDate(TEST_FOLLOW_UP_DATE_API)
        .orqueioFormHandlerClass(TEST_CLASS_API)
        .orqueioFormKey(TEST_STRING_API)
        .orqueioFormRef(FORM_ID)
        .orqueioFormRefBinding(TEST_STRING_FORM_REF_BINDING)
        .orqueioFormRefVersion(TEST_STRING_FORM_REF_VERSION)
        .orqueioPriority(TEST_PRIORITY_API)
        .orqueioFailedJobRetryTimeCycle(FAILED_JOB_RETRY_TIME_CYCLE)
      .endEvent()
      .done();

    UserTask userTask = modelInstance.getModelElementById(TASK_ID);
    assertThat(userTask.getOrqueioAssignee()).isEqualTo(TEST_STRING_API);
    assertThat(userTask.getOrqueioCandidateGroups()).isEqualTo(TEST_GROUPS_API);
    assertThat(userTask.getOrqueioCandidateGroupsList()).containsAll(TEST_GROUPS_LIST_API);
    assertThat(userTask.getOrqueioCandidateUsers()).isEqualTo(TEST_USERS_API);
    assertThat(userTask.getOrqueioCandidateUsersList()).containsAll(TEST_USERS_LIST_API);
    assertThat(userTask.getOrqueioDueDate()).isEqualTo(TEST_DUE_DATE_API);
    assertThat(userTask.getOrqueioFollowUpDate()).isEqualTo(TEST_FOLLOW_UP_DATE_API);
    assertThat(userTask.getOrqueioFormHandlerClass()).isEqualTo(TEST_CLASS_API);
    assertThat(userTask.getOrqueioFormKey()).isEqualTo(TEST_STRING_API);
    assertThat(userTask.getOrqueioFormRef()).isEqualTo(FORM_ID);
    assertThat(userTask.getOrqueioFormRefBinding()).isEqualTo(TEST_STRING_FORM_REF_BINDING);
    assertThat(userTask.getOrqueioFormRefVersion()).isEqualTo(TEST_STRING_FORM_REF_VERSION);
    assertThat(userTask.getOrqueioPriority()).isEqualTo(TEST_PRIORITY_API);

    assertOrqueioFailedJobRetryTimeCycle(userTask);
  }

  @Test
  public void testBusinessRuleTaskOrqueioExtensions() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .businessRuleTask(TASK_ID)
        .orqueioClass(TEST_CLASS_API)
        .orqueioDelegateExpression(TEST_DELEGATE_EXPRESSION_API)
        .orqueioExpression(TEST_EXPRESSION_API)
        .orqueioResultVariable("resultVar")
        .orqueioTopic("topic")
        .orqueioType("type")
        .orqueioDecisionRef("decisionRef")
        .orqueioDecisionRefBinding("latest")
        .orqueioDecisionRefVersion("7")
        .orqueioDecisionRefVersionTag("0.1.0")
        .orqueioDecisionRefTenantId("tenantId")
        .orqueioMapDecisionResult("singleEntry")
        .orqueioTaskPriority(TEST_SERVICE_TASK_PRIORITY)
        .orqueioFailedJobRetryTimeCycle(FAILED_JOB_RETRY_TIME_CYCLE)
      .endEvent()
      .done();

    BusinessRuleTask businessRuleTask = modelInstance.getModelElementById(TASK_ID);
    assertThat(businessRuleTask.getOrqueioClass()).isEqualTo(TEST_CLASS_API);
    assertThat(businessRuleTask.getOrqueioDelegateExpression()).isEqualTo(TEST_DELEGATE_EXPRESSION_API);
    assertThat(businessRuleTask.getOrqueioExpression()).isEqualTo(TEST_EXPRESSION_API);
    assertThat(businessRuleTask.getOrqueioResultVariable()).isEqualTo("resultVar");
    assertThat(businessRuleTask.getOrqueioTopic()).isEqualTo("topic");
    assertThat(businessRuleTask.getOrqueioType()).isEqualTo("type");
    assertThat(businessRuleTask.getOrqueioDecisionRef()).isEqualTo("decisionRef");
    assertThat(businessRuleTask.getOrqueioDecisionRefBinding()).isEqualTo("latest");
    assertThat(businessRuleTask.getOrqueioDecisionRefVersion()).isEqualTo("7");
    assertThat(businessRuleTask.getOrqueioDecisionRefVersionTag()).isEqualTo("0.1.0");
    assertThat(businessRuleTask.getOrqueioDecisionRefTenantId()).isEqualTo("tenantId");
    assertThat(businessRuleTask.getOrqueioMapDecisionResult()).isEqualTo("singleEntry");
    assertThat(businessRuleTask.getOrqueioTaskPriority()).isEqualTo(TEST_SERVICE_TASK_PRIORITY);

    assertOrqueioFailedJobRetryTimeCycle(businessRuleTask);
  }

  @Test
  public void testBusinessRuleTaskOrqueioClass() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .businessRuleTask(TASK_ID)
        .orqueioClass(Bpmn.class)
      .endEvent()
      .done();

    BusinessRuleTask businessRuleTask = modelInstance.getModelElementById(TASK_ID);
    assertThat(businessRuleTask.getOrqueioClass()).isEqualTo("io.orqueio.bpm.model.bpmn.Bpmn");
  }

  @Test
  public void testScriptTaskOrqueioExtensions() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .scriptTask(TASK_ID)
        .orqueioResultVariable(TEST_STRING_API)
        .orqueioResource(TEST_STRING_API)
        .orqueioFailedJobRetryTimeCycle(FAILED_JOB_RETRY_TIME_CYCLE)
      .endEvent()
      .done();

    ScriptTask scriptTask = modelInstance.getModelElementById(TASK_ID);
    assertThat(scriptTask.getOrqueioResultVariable()).isEqualTo(TEST_STRING_API);
    assertThat(scriptTask.getOrqueioResource()).isEqualTo(TEST_STRING_API);

    assertOrqueioFailedJobRetryTimeCycle(scriptTask);
  }

  @Test
  public void testStartEventOrqueioExtensions() {
    modelInstance = Bpmn.createProcess()
      .startEvent(START_EVENT_ID)
        .orqueioAsyncBefore()
        .notOrqueioExclusive()
        .orqueioFormHandlerClass(TEST_CLASS_API)
        .orqueioFormKey(TEST_STRING_API)
        .orqueioFormRef(FORM_ID)
        .orqueioFormRefBinding(TEST_STRING_FORM_REF_BINDING)
        .orqueioFormRefVersion(TEST_STRING_FORM_REF_VERSION)
        .orqueioInitiator(TEST_STRING_API)
        .orqueioFailedJobRetryTimeCycle(FAILED_JOB_RETRY_TIME_CYCLE)
      .done();

    StartEvent startEvent = modelInstance.getModelElementById(START_EVENT_ID);
    assertThat(startEvent.isOrqueioAsyncBefore()).isTrue();
    assertThat(startEvent.isOrqueioExclusive()).isFalse();
    assertThat(startEvent.getOrqueioFormHandlerClass()).isEqualTo(TEST_CLASS_API);
    assertThat(startEvent.getOrqueioFormKey()).isEqualTo(TEST_STRING_API);
    assertThat(startEvent.getOrqueioFormRef()).isEqualTo(FORM_ID);
    assertThat(startEvent.getOrqueioFormRefBinding()).isEqualTo(TEST_STRING_FORM_REF_BINDING);
    assertThat(startEvent.getOrqueioFormRefVersion()).isEqualTo(TEST_STRING_FORM_REF_VERSION);
    assertThat(startEvent.getOrqueioInitiator()).isEqualTo(TEST_STRING_API);

    assertOrqueioFailedJobRetryTimeCycle(startEvent);
  }

  @Test
  public void testErrorDefinitionsForStartEvent() {
    modelInstance = Bpmn.createProcess()
    .startEvent("start")
      .errorEventDefinition("event")
        .errorCodeVariable("errorCodeVariable")
        .errorMessageVariable("errorMessageVariable")
        .error("errorCode", "errorMessage")
      .errorEventDefinitionDone()
     .endEvent().done();

    assertErrorEventDefinition("start", "errorCode", "errorMessage");
    assertErrorEventDefinitionForErrorVariables("start", "errorCodeVariable", "errorMessageVariable");
  }

  @Test
  public void testErrorDefinitionsForStartEventWithoutEventDefinitionId() {
    modelInstance = Bpmn.createProcess()
    .startEvent("start")
      .errorEventDefinition()
        .errorCodeVariable("errorCodeVariable")
        .errorMessageVariable("errorMessageVariable")
        .error("errorCode", "errorMessage")
      .errorEventDefinitionDone()
     .endEvent().done();

    assertErrorEventDefinition("start", "errorCode", "errorMessage");
    assertErrorEventDefinitionForErrorVariables("start", "errorCodeVariable", "errorMessageVariable");
  }

  @Test
  public void testCallActivityOrqueioExtension() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .callActivity(CALL_ACTIVITY_ID)
        .calledElement(TEST_STRING_API)
        .orqueioAsyncBefore()
        .orqueioCalledElementBinding("version")
        .orqueioCalledElementVersion("1.0")
        .orqueioCalledElementVersionTag("ver-1.0")
        .orqueioCalledElementTenantId("t1")
        .orqueioCaseRef("case")
        .orqueioCaseBinding("deployment")
        .orqueioCaseVersion("2")
        .orqueioCaseTenantId("t2")
        .orqueioIn("in-source", "in-target")
        .orqueioOut("out-source", "out-target")
        .orqueioVariableMappingClass(TEST_CLASS_API)
        .orqueioVariableMappingDelegateExpression(TEST_DELEGATE_EXPRESSION_API)
        .notOrqueioExclusive()
        .orqueioFailedJobRetryTimeCycle(FAILED_JOB_RETRY_TIME_CYCLE)
      .endEvent()
      .done();

    CallActivity callActivity = modelInstance.getModelElementById(CALL_ACTIVITY_ID);
    assertThat(callActivity.getCalledElement()).isEqualTo(TEST_STRING_API);
    assertThat(callActivity.isOrqueioAsyncBefore()).isTrue();
    assertThat(callActivity.getOrqueioCalledElementBinding()).isEqualTo("version");
    assertThat(callActivity.getOrqueioCalledElementVersion()).isEqualTo("1.0");
    assertThat(callActivity.getOrqueioCalledElementVersionTag()).isEqualTo("ver-1.0");
    assertThat(callActivity.getOrqueioCalledElementTenantId()).isEqualTo("t1");
    assertThat(callActivity.getOrqueioCaseRef()).isEqualTo("case");
    assertThat(callActivity.getOrqueioCaseBinding()).isEqualTo("deployment");
    assertThat(callActivity.getOrqueioCaseVersion()).isEqualTo("2");
    assertThat(callActivity.getOrqueioCaseTenantId()).isEqualTo("t2");
    assertThat(callActivity.isOrqueioExclusive()).isFalse();

    OrqueioIn orqueioIn = (OrqueioIn) callActivity.getExtensionElements().getUniqueChildElementByType(OrqueioIn.class);
    assertThat(orqueioIn.getOrqueioSource()).isEqualTo("in-source");
    assertThat(orqueioIn.getOrqueioTarget()).isEqualTo("in-target");

    OrqueioOut orqueioOut = (OrqueioOut) callActivity.getExtensionElements().getUniqueChildElementByType(OrqueioOut.class);
    assertThat(orqueioOut.getOrqueioSource()).isEqualTo("out-source");
    assertThat(orqueioOut.getOrqueioTarget()).isEqualTo("out-target");

    assertThat(callActivity.getOrqueioVariableMappingClass()).isEqualTo(TEST_CLASS_API);
    assertThat(callActivity.getOrqueioVariableMappingDelegateExpression()).isEqualTo(TEST_DELEGATE_EXPRESSION_API);
    assertOrqueioFailedJobRetryTimeCycle(callActivity);
  }

  @Test
  public void testCallActivityOrqueioBusinessKey() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .callActivity(CALL_ACTIVITY_ID)
        .orqueioInBusinessKey("business-key")
      .endEvent()
      .done();

    CallActivity callActivity = modelInstance.getModelElementById(CALL_ACTIVITY_ID);
    OrqueioIn orqueioIn = (OrqueioIn) callActivity.getExtensionElements().getUniqueChildElementByType(OrqueioIn.class);
    assertThat(orqueioIn.getOrqueioBusinessKey()).isEqualTo("business-key");
  }

  @Test
  public void testCallActivityOrqueioVariableMappingClass() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .callActivity(CALL_ACTIVITY_ID)
        .orqueioVariableMappingClass(this.getClass())
      .endEvent()
      .done();

    CallActivity callActivity = modelInstance.getModelElementById(CALL_ACTIVITY_ID);
    assertThat(callActivity.getOrqueioVariableMappingClass()).isEqualTo(this.getClass().getName());
  }

  @Test
  public void testSubProcessBuilder() {
    BpmnModelInstance modelInstance = Bpmn.createProcess()
      .startEvent()
      .subProcess(SUB_PROCESS_ID)
        .orqueioAsyncBefore()
        .embeddedSubProcess()
          .startEvent()
          .userTask()
          .endEvent()
        .subProcessDone()
      .serviceTask(SERVICE_TASK_ID)
      .endEvent()
      .done();

    SubProcess subProcess = modelInstance.getModelElementById(SUB_PROCESS_ID);
    ServiceTask serviceTask = modelInstance.getModelElementById(SERVICE_TASK_ID);
    assertThat(subProcess.isOrqueioAsyncBefore()).isTrue();
    assertThat(subProcess.isOrqueioExclusive()).isTrue();
    assertThat(subProcess.getChildElementsByType(Event.class)).hasSize(2);
    assertThat(subProcess.getChildElementsByType(Task.class)).hasSize(1);
    assertThat(subProcess.getFlowElements()).hasSize(5);
    assertThat(subProcess.getSucceedingNodes().singleResult()).isEqualTo(serviceTask);
  }

  @Test
  public void testSubProcessBuilderDetached() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .subProcess(SUB_PROCESS_ID)
      .serviceTask(SERVICE_TASK_ID)
      .endEvent()
      .done();

    SubProcess subProcess = modelInstance.getModelElementById(SUB_PROCESS_ID);

    subProcess.builder()
      .orqueioAsyncBefore()
      .embeddedSubProcess()
        .startEvent()
        .userTask()
        .endEvent();

    ServiceTask serviceTask = modelInstance.getModelElementById(SERVICE_TASK_ID);
    assertThat(subProcess.isOrqueioAsyncBefore()).isTrue();
    assertThat(subProcess.isOrqueioExclusive()).isTrue();
    assertThat(subProcess.getChildElementsByType(Event.class)).hasSize(2);
    assertThat(subProcess.getChildElementsByType(Task.class)).hasSize(1);
    assertThat(subProcess.getFlowElements()).hasSize(5);
    assertThat(subProcess.getSucceedingNodes().singleResult()).isEqualTo(serviceTask);
  }

  @Test
  public void testSubProcessBuilderNested() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .subProcess(SUB_PROCESS_ID + 1)
        .orqueioAsyncBefore()
        .embeddedSubProcess()
          .startEvent()
          .userTask()
          .subProcess(SUB_PROCESS_ID + 2)
            .orqueioAsyncBefore()
            .notOrqueioExclusive()
            .embeddedSubProcess()
              .startEvent()
              .userTask()
              .endEvent()
            .subProcessDone()
          .serviceTask(SERVICE_TASK_ID + 1)
          .endEvent()
        .subProcessDone()
      .serviceTask(SERVICE_TASK_ID + 2)
      .endEvent()
      .done();

    SubProcess subProcess = modelInstance.getModelElementById(SUB_PROCESS_ID + 1);
    ServiceTask serviceTask = modelInstance.getModelElementById(SERVICE_TASK_ID + 2);
    assertThat(subProcess.isOrqueioAsyncBefore()).isTrue();
    assertThat(subProcess.isOrqueioExclusive()).isTrue();
    assertThat(subProcess.getChildElementsByType(Event.class)).hasSize(2);
    assertThat(subProcess.getChildElementsByType(Task.class)).hasSize(2);
    assertThat(subProcess.getChildElementsByType(SubProcess.class)).hasSize(1);
    assertThat(subProcess.getFlowElements()).hasSize(9);
    assertThat(subProcess.getSucceedingNodes().singleResult()).isEqualTo(serviceTask);

    SubProcess nestedSubProcess = modelInstance.getModelElementById(SUB_PROCESS_ID + 2);
    ServiceTask nestedServiceTask = modelInstance.getModelElementById(SERVICE_TASK_ID + 1);
    assertThat(nestedSubProcess.isOrqueioAsyncBefore()).isTrue();
    assertThat(nestedSubProcess.isOrqueioExclusive()).isFalse();
    assertThat(nestedSubProcess.getChildElementsByType(Event.class)).hasSize(2);
    assertThat(nestedSubProcess.getChildElementsByType(Task.class)).hasSize(1);
    assertThat(nestedSubProcess.getFlowElements()).hasSize(5);
    assertThat(nestedSubProcess.getSucceedingNodes().singleResult()).isEqualTo(nestedServiceTask);
  }

  @Test
  public void testSubProcessBuilderWrongScope() {
    try {
      modelInstance = Bpmn.createProcess()
        .startEvent()
        .subProcessDone()
        .endEvent()
        .done();
      fail("Exception expected");
    }
    catch (Exception e) {
      assertThat(e).isInstanceOf(BpmnModelException.class);
    }
  }

  @Test
  public void testTransactionBuilder() {
    BpmnModelInstance modelInstance = Bpmn.createProcess()
      .startEvent()
      .transaction(TRANSACTION_ID)
        .orqueioAsyncBefore()
        .method(TransactionMethod.Image)
        .embeddedSubProcess()
          .startEvent()
          .userTask()
          .endEvent()
        .transactionDone()
      .serviceTask(SERVICE_TASK_ID)
      .endEvent()
      .done();

    Transaction transaction = modelInstance.getModelElementById(TRANSACTION_ID);
    ServiceTask serviceTask = modelInstance.getModelElementById(SERVICE_TASK_ID);
    assertThat(transaction.isOrqueioAsyncBefore()).isTrue();
    assertThat(transaction.isOrqueioExclusive()).isTrue();
    assertThat(transaction.getMethod()).isEqualTo(TransactionMethod.Image);
    assertThat(transaction.getChildElementsByType(Event.class)).hasSize(2);
    assertThat(transaction.getChildElementsByType(Task.class)).hasSize(1);
    assertThat(transaction.getFlowElements()).hasSize(5);
    assertThat(transaction.getSucceedingNodes().singleResult()).isEqualTo(serviceTask);
  }

  @Test
  public void testTransactionBuilderDetached() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .transaction(TRANSACTION_ID)
      .serviceTask(SERVICE_TASK_ID)
      .endEvent()
      .done();

    Transaction transaction = modelInstance.getModelElementById(TRANSACTION_ID);

    transaction.builder()
      .orqueioAsyncBefore()
      .embeddedSubProcess()
        .startEvent()
        .userTask()
        .endEvent();

    ServiceTask serviceTask = modelInstance.getModelElementById(SERVICE_TASK_ID);
    assertThat(transaction.isOrqueioAsyncBefore()).isTrue();
    assertThat(transaction.isOrqueioExclusive()).isTrue();
    assertThat(transaction.getChildElementsByType(Event.class)).hasSize(2);
    assertThat(transaction.getChildElementsByType(Task.class)).hasSize(1);
    assertThat(transaction.getFlowElements()).hasSize(5);
    assertThat(transaction.getSucceedingNodes().singleResult()).isEqualTo(serviceTask);
  }

  @Test
  public void testScriptText() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .scriptTask("script")
        .scriptFormat("groovy")
        .scriptText("println \"hello, world\";")
      .endEvent()
      .done();

    ScriptTask scriptTask = modelInstance.getModelElementById("script");
    assertThat(scriptTask.getScriptFormat()).isEqualTo("groovy");
    assertThat(scriptTask.getScript().getTextContent()).isEqualTo("println \"hello, world\";");
  }

  @Test
  public void testEventBasedGatewayAsyncAfter() {
    try {
      modelInstance = Bpmn.createProcess()
        .startEvent()
        .eventBasedGateway()
          .orqueioAsyncAfter()
        .done();

      fail("Expected UnsupportedOperationException");
    } catch(UnsupportedOperationException ex) {
      // happy path
    }

    try {
      modelInstance = Bpmn.createProcess()
        .startEvent()
        .eventBasedGateway()
          .orqueioAsyncAfter(true)
        .endEvent()
        .done();
      fail("Expected UnsupportedOperationException");
    } catch(UnsupportedOperationException ex) {
      // happy ending :D
    }
  }

  @Test
  public void testMessageStartEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent("start").message("message")
      .done();

    assertMessageEventDefinition("start", "message");
  }

  @Test
  public void testMessageStartEventWithExistingMessage() {
    modelInstance = Bpmn.createProcess()
      .startEvent("start").message("message")
        .subProcess().triggerByEvent()
         .embeddedSubProcess()
         .startEvent("subStart").message("message")
         .subProcessDone()
      .done();

    Message message = assertMessageEventDefinition("start", "message");
    Message subMessage = assertMessageEventDefinition("subStart", "message");

    assertThat(message).isEqualTo(subMessage);

    assertOnlyOneMessageExists("message");
  }

  @Test
  public void testIntermediateMessageCatchEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateCatchEvent("catch").message("message")
      .done();

    assertMessageEventDefinition("catch", "message");
  }

  @Test
  public void testIntermediateMessageCatchEventWithExistingMessage() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateCatchEvent("catch1").message("message")
      .intermediateCatchEvent("catch2").message("message")
      .done();

    Message message1 = assertMessageEventDefinition("catch1", "message");
    Message message2 = assertMessageEventDefinition("catch2", "message");

    assertThat(message1).isEqualTo(message2);

    assertOnlyOneMessageExists("message");
  }

  @Test
  public void testMessageEndEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .endEvent("end").message("message")
      .done();

    assertMessageEventDefinition("end", "message");
  }

  @Test
  public void testMessageEventDefintionEndEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .endEvent("end")
      .messageEventDefinition()
        .message("message")
      .done();

    assertMessageEventDefinition("end", "message");
  }

  @Test
  public void testMessageEndEventWithExistingMessage() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .parallelGateway()
      .endEvent("end1").message("message")
      .moveToLastGateway()
      .endEvent("end2").message("message")
      .done();

    Message message1 = assertMessageEventDefinition("end1", "message");
    Message message2 = assertMessageEventDefinition("end2", "message");

    assertThat(message1).isEqualTo(message2);

    assertOnlyOneMessageExists("message");
  }

  @Test
  public void testMessageEventDefinitionEndEventWithExistingMessage() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .parallelGateway()
      .endEvent("end1")
      .messageEventDefinition()
        .message("message")
        .messageEventDefinitionDone()
      .moveToLastGateway()
      .endEvent("end2")
      .messageEventDefinition()
        .message("message")
      .done();

    Message message1 = assertMessageEventDefinition("end1", "message");
    Message message2 = assertMessageEventDefinition("end2", "message");

    assertThat(message1).isEqualTo(message2);

    assertOnlyOneMessageExists("message");
  }

  @Test
  public void testIntermediateMessageThrowEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateThrowEvent("throw").message("message")
      .done();

    assertMessageEventDefinition("throw", "message");
  }

  @Test
  public void testIntermediateMessageEventDefintionThrowEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateThrowEvent("throw")
      .messageEventDefinition()
        .message("message")
      .done();

    assertMessageEventDefinition("throw", "message");
  }

  @Test
  public void testIntermediateMessageThrowEventWithExistingMessage() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateThrowEvent("throw1").message("message")
      .intermediateThrowEvent("throw2").message("message")
      .done();

    Message message1 = assertMessageEventDefinition("throw1", "message");
    Message message2 = assertMessageEventDefinition("throw2", "message");

    assertThat(message1).isEqualTo(message2);
    assertOnlyOneMessageExists("message");
  }


  @Test
  public void testIntermediateMessageEventDefintionThrowEventWithExistingMessage() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateThrowEvent("throw1")
      .messageEventDefinition()
        .message("message")
        .messageEventDefinitionDone()
      .intermediateThrowEvent("throw2")
      .messageEventDefinition()
        .message("message")
        .messageEventDefinitionDone()
      .done();

    Message message1 = assertMessageEventDefinition("throw1", "message");
    Message message2 = assertMessageEventDefinition("throw2", "message");

    assertThat(message1).isEqualTo(message2);
    assertOnlyOneMessageExists("message");
  }

  @Test
  public void testIntermediateMessageThrowEventWithMessageDefinition() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateThrowEvent("throw1")
      .messageEventDefinition()
        .id("messageEventDefinition")
        .message("message")
        .orqueioTaskPriority(TEST_SERVICE_TASK_PRIORITY)
        .orqueioType("external")
        .orqueioTopic("TOPIC")
      .done();

    MessageEventDefinition event = modelInstance.getModelElementById("messageEventDefinition");
    assertThat(event.getOrqueioTaskPriority()).isEqualTo(TEST_SERVICE_TASK_PRIORITY);
    assertThat(event.getOrqueioTopic()).isEqualTo("TOPIC");
    assertThat(event.getOrqueioType()).isEqualTo("external");
    assertThat(event.getMessage().getName()).isEqualTo("message");
  }

  @Test
  public void testIntermediateMessageThrowEventWithTaskPriority() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateThrowEvent("throw1")
      .messageEventDefinition("messageEventDefinition")
        .orqueioTaskPriority(TEST_SERVICE_TASK_PRIORITY)
      .done();

    MessageEventDefinition event = modelInstance.getModelElementById("messageEventDefinition");
    assertThat(event.getOrqueioTaskPriority()).isEqualTo(TEST_SERVICE_TASK_PRIORITY);
  }

  @Test
  public void testEndEventWithTaskPriority() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .endEvent("end")
      .messageEventDefinition("messageEventDefinition")
        .orqueioTaskPriority(TEST_SERVICE_TASK_PRIORITY)
      .done();

    MessageEventDefinition event = modelInstance.getModelElementById("messageEventDefinition");
    assertThat(event.getOrqueioTaskPriority()).isEqualTo(TEST_SERVICE_TASK_PRIORITY);
  }

  @Test
  public void testMessageEventDefinitionWithID() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateThrowEvent("throw1")
      .messageEventDefinition("messageEventDefinition")
      .done();

    MessageEventDefinition event = modelInstance.getModelElementById("messageEventDefinition");
    assertThat(event).isNotNull();

    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateThrowEvent("throw2")
      .messageEventDefinition().id("messageEventDefinition1")
      .done();

    //========================================
    //==============end event=================
    //========================================
    event = modelInstance.getModelElementById("messageEventDefinition1");
    assertThat(event).isNotNull();
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .endEvent("end1")
      .messageEventDefinition("messageEventDefinition")
      .done();

    event = modelInstance.getModelElementById("messageEventDefinition");
    assertThat(event).isNotNull();

    modelInstance = Bpmn.createProcess()
      .startEvent()
      .endEvent("end2")
      .messageEventDefinition().id("messageEventDefinition1")
      .done();

    event = modelInstance.getModelElementById("messageEventDefinition1");
    assertThat(event).isNotNull();
  }

  @Test
  public void testReceiveTaskMessage() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .receiveTask("receive").message("message")
      .done();

    ReceiveTask receiveTask = modelInstance.getModelElementById("receive");

    Message message = receiveTask.getMessage();
    assertThat(message).isNotNull();
    assertThat(message.getName()).isEqualTo("message");
  }

  @Test
  public void testReceiveTaskWithExistingMessage() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .receiveTask("receive1").message("message")
      .receiveTask("receive2").message("message")
      .done();

    ReceiveTask receiveTask1 = modelInstance.getModelElementById("receive1");
    Message message1 = receiveTask1.getMessage();

    ReceiveTask receiveTask2 = modelInstance.getModelElementById("receive2");
    Message message2 = receiveTask2.getMessage();

    assertThat(message1).isEqualTo(message2);

    assertOnlyOneMessageExists("message");
  }

  @Test
  public void testSendTaskMessage() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .sendTask("send").message("message")
      .done();

    SendTask sendTask = modelInstance.getModelElementById("send");

    Message message = sendTask.getMessage();
    assertThat(message).isNotNull();
    assertThat(message.getName()).isEqualTo("message");
  }

  @Test
  public void testSendTaskWithExistingMessage() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .sendTask("send1").message("message")
      .sendTask("send2").message("message")
      .done();

    SendTask sendTask1 = modelInstance.getModelElementById("send1");
    Message message1 = sendTask1.getMessage();

    SendTask sendTask2 = modelInstance.getModelElementById("send2");
    Message message2 = sendTask2.getMessage();

    assertThat(message1).isEqualTo(message2);

    assertOnlyOneMessageExists("message");
  }

  @Test
  public void testSignalStartEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent("start").signal("signal")
      .done();

    assertSignalEventDefinition("start", "signal");
  }

  @Test
  public void testSignalStartEventWithExistingSignal() {
    modelInstance = Bpmn.createProcess()
      .startEvent("start").signal("signal")
      .subProcess().triggerByEvent()
      .embeddedSubProcess()
      .startEvent("subStart").signal("signal")
      .subProcessDone()
      .done();

    Signal signal = assertSignalEventDefinition("start", "signal");
    Signal subSignal = assertSignalEventDefinition("subStart", "signal");

    assertThat(signal).isEqualTo(subSignal);

    assertOnlyOneSignalExists("signal");
  }

  @Test
  public void testIntermediateSignalCatchEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateCatchEvent("catch").signal("signal")
      .done();

    assertSignalEventDefinition("catch", "signal");
  }

  @Test
  public void testIntermediateSignalCatchEventWithExistingSignal() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateCatchEvent("catch1").signal("signal")
      .intermediateCatchEvent("catch2").signal("signal")
      .done();

    Signal signal1 = assertSignalEventDefinition("catch1", "signal");
    Signal signal2 = assertSignalEventDefinition("catch2", "signal");

    assertThat(signal1).isEqualTo(signal2);

    assertOnlyOneSignalExists("signal");
  }

  @Test
  public void testSignalEndEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .endEvent("end").signal("signal")
      .done();

    assertSignalEventDefinition("end", "signal");
  }

  @Test
  public void testSignalEndEventWithExistingSignal() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .parallelGateway()
      .endEvent("end1").signal("signal")
      .moveToLastGateway()
      .endEvent("end2").signal("signal")
      .done();

    Signal signal1 = assertSignalEventDefinition("end1", "signal");
    Signal signal2 = assertSignalEventDefinition("end2", "signal");

    assertThat(signal1).isEqualTo(signal2);

    assertOnlyOneSignalExists("signal");
  }

  @Test
  public void testIntermediateSignalThrowEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateThrowEvent("throw").signal("signal")
      .done();

    assertSignalEventDefinition("throw", "signal");
  }

  @Test
  public void testIntermediateSignalThrowEventWithExistingSignal() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateThrowEvent("throw1").signal("signal")
      .intermediateThrowEvent("throw2").signal("signal")
      .done();

    Signal signal1 = assertSignalEventDefinition("throw1", "signal");
    Signal signal2 = assertSignalEventDefinition("throw2", "signal");

    assertThat(signal1).isEqualTo(signal2);

    assertOnlyOneSignalExists("signal");
  }

  @Test
  public void testIntermediateSignalThrowEventWithPayloadLocalVar() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateThrowEvent("throw")
        .signalEventDefinition("signal")
          .orqueioInSourceTarget("source", "target1")
          .orqueioInSourceExpressionTarget("${'sourceExpression'}", "target2")
          .orqueioInAllVariables("all", true)
          .orqueioInBusinessKey("aBusinessKey")
          .throwEventDefinitionDone()
      .endEvent()
      .done();

    assertSignalEventDefinition("throw", "signal");
    SignalEventDefinition signalEventDefinition = assertAndGetSingleEventDefinition("throw", SignalEventDefinition.class);

    assertThat(signalEventDefinition.getSignal().getName()).isEqualTo("signal");

    List<OrqueioIn> orqueioInParams = signalEventDefinition.getExtensionElements().getElementsQuery().filterByType(OrqueioIn.class).list();
    assertThat(orqueioInParams.size()).isEqualTo(4);

    int paramCounter = 0;
    for (OrqueioIn inParam : orqueioInParams) {
      if (inParam.getOrqueioVariables() != null) {
        assertThat(inParam.getOrqueioVariables()).isEqualTo("all");
        if (inParam.getOrqueioLocal()) {
          paramCounter++;
        }
      } else if (inParam.getOrqueioBusinessKey() != null) {
        assertThat(inParam.getOrqueioBusinessKey()).isEqualTo("aBusinessKey");
        paramCounter++;
      } else if (inParam.getOrqueioSourceExpression() != null) {
        assertThat(inParam.getOrqueioSourceExpression()).isEqualTo("${'sourceExpression'}");
        assertThat(inParam.getOrqueioTarget()).isEqualTo("target2");
        paramCounter++;
      } else if (inParam.getOrqueioSource() != null) {
        assertThat(inParam.getOrqueioSource()).isEqualTo("source");
        assertThat(inParam.getOrqueioTarget()).isEqualTo("target1");
        paramCounter++;
      }
    }
    assertThat(paramCounter).isEqualTo(orqueioInParams.size());
  }

  @Test
  public void testIntermediateSignalThrowEventWithPayload() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateThrowEvent("throw")
        .signalEventDefinition("signal")
          .orqueioInAllVariables("all")
          .throwEventDefinitionDone()
      .endEvent()
      .done();

    SignalEventDefinition signalEventDefinition = assertAndGetSingleEventDefinition("throw", SignalEventDefinition.class);

    List<OrqueioIn> orqueioInParams = signalEventDefinition.getExtensionElements().getElementsQuery().filterByType(OrqueioIn.class).list();
    assertThat(orqueioInParams.size()).isEqualTo(1);

    assertThat(orqueioInParams.get(0).getOrqueioVariables()).isEqualTo("all");
  }

  @Test
  public void testMessageBoundaryEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .endEvent()
      .moveToActivity("task") // jump back to user task and attach a boundary event
      .boundaryEvent("boundary").message("message")
      .endEvent("boundaryEnd")
      .done();

    assertMessageEventDefinition("boundary", "message");

    UserTask userTask = modelInstance.getModelElementById("task");
    BoundaryEvent boundaryEvent = modelInstance.getModelElementById("boundary");
    EndEvent boundaryEnd = modelInstance.getModelElementById("boundaryEnd");

    // boundary event is attached to the user task
    assertThat(boundaryEvent.getAttachedTo()).isEqualTo(userTask);

    // boundary event has no incoming sequence flows
    assertThat(boundaryEvent.getIncoming()).isEmpty();

    // the next flow node is the boundary end event
    List<FlowNode> succeedingNodes = boundaryEvent.getSucceedingNodes().list();
    assertThat(succeedingNodes).containsOnly(boundaryEnd);
  }

  @Test
  public void testMultipleBoundaryEvents() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .endEvent()
      .moveToActivity("task") // jump back to user task and attach a boundary event
      .boundaryEvent("boundary1").message("message")
      .endEvent("boundaryEnd1")
      .moveToActivity("task") // jump back to user task and attach another boundary event
      .boundaryEvent("boundary2").signal("signal")
      .endEvent("boundaryEnd2")
      .done();

    assertMessageEventDefinition("boundary1", "message");
    assertSignalEventDefinition("boundary2", "signal");

    UserTask userTask = modelInstance.getModelElementById("task");
    BoundaryEvent boundaryEvent1 = modelInstance.getModelElementById("boundary1");
    EndEvent boundaryEnd1 = modelInstance.getModelElementById("boundaryEnd1");
    BoundaryEvent boundaryEvent2 = modelInstance.getModelElementById("boundary2");
    EndEvent boundaryEnd2 = modelInstance.getModelElementById("boundaryEnd2");

    // boundary events are attached to the user task
    assertThat(boundaryEvent1.getAttachedTo()).isEqualTo(userTask);
    assertThat(boundaryEvent2.getAttachedTo()).isEqualTo(userTask);

    // boundary events have no incoming sequence flows
    assertThat(boundaryEvent1.getIncoming()).isEmpty();
    assertThat(boundaryEvent2.getIncoming()).isEmpty();

    // the next flow node is the boundary end event
    List<FlowNode> succeedingNodes = boundaryEvent1.getSucceedingNodes().list();
    assertThat(succeedingNodes).containsOnly(boundaryEnd1);
    succeedingNodes = boundaryEvent2.getSucceedingNodes().list();
    assertThat(succeedingNodes).containsOnly(boundaryEnd2);
  }

  @Test
  public void testOrqueioTaskListenerByClassName() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
          .userTask("task")
            .orqueioTaskListenerClass("start", "aClass")
        .endEvent()
        .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioTaskListener> taskListeners = extensionElements.getChildElementsByType(OrqueioTaskListener.class);
    assertThat(taskListeners).hasSize(1);

    OrqueioTaskListener taskListener = taskListeners.iterator().next();
    assertThat(taskListener.getOrqueioClass()).isEqualTo("aClass");
    assertThat(taskListener.getOrqueioEvent()).isEqualTo("start");
  }

  @Test
  public void testOrqueioTaskListenerByClass() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
          .userTask("task")
            .orqueioTaskListenerClass("start", this.getClass())
        .endEvent()
        .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioTaskListener> taskListeners = extensionElements.getChildElementsByType(OrqueioTaskListener.class);
    assertThat(taskListeners).hasSize(1);

    OrqueioTaskListener taskListener = taskListeners.iterator().next();
    assertThat(taskListener.getOrqueioClass()).isEqualTo(this.getClass().getName());
    assertThat(taskListener.getOrqueioEvent()).isEqualTo("start");
  }

  @Test
  public void testOrqueioTaskListenerByExpression() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
          .userTask("task")
            .orqueioTaskListenerExpression("start", "anExpression")
        .endEvent()
        .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioTaskListener> taskListeners = extensionElements.getChildElementsByType(OrqueioTaskListener.class);
    assertThat(taskListeners).hasSize(1);

    OrqueioTaskListener taskListener = taskListeners.iterator().next();
    assertThat(taskListener.getOrqueioExpression()).isEqualTo("anExpression");
    assertThat(taskListener.getOrqueioEvent()).isEqualTo("start");
  }

  @Test
  public void testOrqueioTaskListenerByDelegateExpression() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
          .userTask("task")
            .orqueioTaskListenerDelegateExpression("start", "aDelegate")
        .endEvent()
        .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioTaskListener> taskListeners = extensionElements.getChildElementsByType(OrqueioTaskListener.class);
    assertThat(taskListeners).hasSize(1);

    OrqueioTaskListener taskListener = taskListeners.iterator().next();
    assertThat(taskListener.getOrqueioDelegateExpression()).isEqualTo("aDelegate");
    assertThat(taskListener.getOrqueioEvent()).isEqualTo("start");
  }

  @Test
  public void testOrqueioTimeoutCycleTaskListenerByClassName() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
          .userTask("task")
            .orqueioTaskListenerClassTimeoutWithCycle("timeout-1", "aClass", "R/PT1H")
        .endEvent()
        .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioTaskListener> taskListeners = extensionElements.getChildElementsByType(OrqueioTaskListener.class);
    assertThat(taskListeners).hasSize(1);

    OrqueioTaskListener taskListener = taskListeners.iterator().next();
    assertThat(taskListener.getOrqueioClass()).isEqualTo("aClass");
    assertThat(taskListener.getOrqueioEvent()).isEqualTo("timeout");

    Collection<TimerEventDefinition> timeouts = taskListener.getTimeouts();
    assertThat(timeouts.size()).isEqualTo(1);

    TimerEventDefinition timeout = timeouts.iterator().next();
    assertThat(timeout.getTimeCycle()).isNotNull();
    assertThat(timeout.getTimeCycle().getRawTextContent()).isEqualTo("R/PT1H");
    assertThat(timeout.getTimeDate()).isNull();
    assertThat(timeout.getTimeDuration()).isNull();
  }

  @Test
  public void testOrqueioTimeoutDateTaskListenerByClassName() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
          .userTask("task")
            .orqueioTaskListenerClassTimeoutWithDate("timeout-1", "aClass", "2019-09-09T12:12:12")
        .endEvent()
        .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioTaskListener> taskListeners = extensionElements.getChildElementsByType(OrqueioTaskListener.class);
    assertThat(taskListeners).hasSize(1);

    OrqueioTaskListener taskListener = taskListeners.iterator().next();
    assertThat(taskListener.getOrqueioClass()).isEqualTo("aClass");
    assertThat(taskListener.getOrqueioEvent()).isEqualTo("timeout");

    Collection<TimerEventDefinition> timeouts = taskListener.getTimeouts();
    assertThat(timeouts.size()).isEqualTo(1);

    TimerEventDefinition timeout = timeouts.iterator().next();
    assertThat(timeout.getTimeCycle()).isNull();
    assertThat(timeout.getTimeDate()).isNotNull();
    assertThat(timeout.getTimeDate().getRawTextContent()).isEqualTo("2019-09-09T12:12:12");
    assertThat(timeout.getTimeDuration()).isNull();
  }

  @Test
  public void testOrqueioTimeoutDurationTaskListenerByClassName() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
          .userTask("task")
            .orqueioTaskListenerClassTimeoutWithDuration("timeout-1", "aClass", "PT1H")
        .endEvent()
        .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioTaskListener> taskListeners = extensionElements.getChildElementsByType(OrqueioTaskListener.class);
    assertThat(taskListeners).hasSize(1);

    OrqueioTaskListener taskListener = taskListeners.iterator().next();
    assertThat(taskListener.getOrqueioClass()).isEqualTo("aClass");
    assertThat(taskListener.getOrqueioEvent()).isEqualTo("timeout");

    Collection<TimerEventDefinition> timeouts = taskListener.getTimeouts();
    assertThat(timeouts.size()).isEqualTo(1);

    TimerEventDefinition timeout = timeouts.iterator().next();
    assertThat(timeout.getTimeCycle()).isNull();
    assertThat(timeout.getTimeDate()).isNull();
    assertThat(timeout.getTimeDuration()).isNotNull();
    assertThat(timeout.getTimeDuration().getRawTextContent()).isEqualTo("PT1H");
  }

  @Test
  public void testOrqueioTimeoutDurationTaskListenerByClass() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
          .userTask("task")
            .orqueioTaskListenerClassTimeoutWithDuration("timeout-1", this.getClass(), "PT1H")
        .endEvent()
        .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioTaskListener> taskListeners = extensionElements.getChildElementsByType(OrqueioTaskListener.class);
    assertThat(taskListeners).hasSize(1);

    OrqueioTaskListener taskListener = taskListeners.iterator().next();
    assertThat(taskListener.getOrqueioClass()).isEqualTo(this.getClass().getName());
    assertThat(taskListener.getOrqueioEvent()).isEqualTo("timeout");

    Collection<TimerEventDefinition> timeouts = taskListener.getTimeouts();
    assertThat(timeouts.size()).isEqualTo(1);

    TimerEventDefinition timeout = timeouts.iterator().next();
    assertThat(timeout.getTimeCycle()).isNull();
    assertThat(timeout.getTimeDate()).isNull();
    assertThat(timeout.getTimeDuration()).isNotNull();
    assertThat(timeout.getTimeDuration().getRawTextContent()).isEqualTo("PT1H");
  }

  @Test
  public void testOrqueioTimeoutCycleTaskListenerByClass() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
          .userTask("task")
            .orqueioTaskListenerClassTimeoutWithCycle("timeout-1", this.getClass(), "R/PT1H")
        .endEvent()
        .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioTaskListener> taskListeners = extensionElements.getChildElementsByType(OrqueioTaskListener.class);
    assertThat(taskListeners).hasSize(1);

    OrqueioTaskListener taskListener = taskListeners.iterator().next();
    assertThat(taskListener.getOrqueioClass()).isEqualTo(this.getClass().getName());
    assertThat(taskListener.getOrqueioEvent()).isEqualTo("timeout");

    Collection<TimerEventDefinition> timeouts = taskListener.getTimeouts();
    assertThat(timeouts.size()).isEqualTo(1);

    TimerEventDefinition timeout = timeouts.iterator().next();
    assertThat(timeout.getTimeCycle()).isNotNull();
    assertThat(timeout.getTimeCycle().getRawTextContent()).isEqualTo("R/PT1H");
    assertThat(timeout.getTimeDate()).isNull();
    assertThat(timeout.getTimeDuration()).isNull();
  }

  @Test
  public void testOrqueioTimeoutDateTaskListenerByClass() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
          .userTask("task")
            .orqueioTaskListenerClassTimeoutWithDate("timeout-1", this.getClass(), "2019-09-09T12:12:12")
        .endEvent()
        .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioTaskListener> taskListeners = extensionElements.getChildElementsByType(OrqueioTaskListener.class);
    assertThat(taskListeners).hasSize(1);

    OrqueioTaskListener taskListener = taskListeners.iterator().next();
    assertThat(taskListener.getOrqueioClass()).isEqualTo(this.getClass().getName());
    assertThat(taskListener.getOrqueioEvent()).isEqualTo("timeout");

    Collection<TimerEventDefinition> timeouts = taskListener.getTimeouts();
    assertThat(timeouts.size()).isEqualTo(1);

    TimerEventDefinition timeout = timeouts.iterator().next();
    assertThat(timeout.getTimeCycle()).isNull();
    assertThat(timeout.getTimeDate()).isNotNull();
    assertThat(timeout.getTimeDate().getRawTextContent()).isEqualTo("2019-09-09T12:12:12");
    assertThat(timeout.getTimeDuration()).isNull();
  }

  @Test
  public void testOrqueioTimeoutCycleTaskListenerByExpression() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
          .userTask("task")
            .orqueioTaskListenerExpressionTimeoutWithCycle("timeout-1", "anExpression", "R/PT1H")
        .endEvent()
        .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioTaskListener> taskListeners = extensionElements.getChildElementsByType(OrqueioTaskListener.class);
    assertThat(taskListeners).hasSize(1);

    OrqueioTaskListener taskListener = taskListeners.iterator().next();
    assertThat(taskListener.getOrqueioExpression()).isEqualTo("anExpression");
    assertThat(taskListener.getOrqueioEvent()).isEqualTo("timeout");

    Collection<TimerEventDefinition> timeouts = taskListener.getTimeouts();
    assertThat(timeouts.size()).isEqualTo(1);

    TimerEventDefinition timeout = timeouts.iterator().next();
    assertThat(timeout.getTimeCycle()).isNotNull();
    assertThat(timeout.getTimeCycle().getRawTextContent()).isEqualTo("R/PT1H");
    assertThat(timeout.getTimeDate()).isNull();
    assertThat(timeout.getTimeDuration()).isNull();
  }

  @Test
  public void testOrqueioTimeoutDateTaskListenerByExpression() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
          .userTask("task")
            .orqueioTaskListenerExpressionTimeoutWithDate("timeout-1", "anExpression", "2019-09-09T12:12:12")
        .endEvent()
        .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioTaskListener> taskListeners = extensionElements.getChildElementsByType(OrqueioTaskListener.class);
    assertThat(taskListeners).hasSize(1);

    OrqueioTaskListener taskListener = taskListeners.iterator().next();
    assertThat(taskListener.getOrqueioExpression()).isEqualTo("anExpression");
    assertThat(taskListener.getOrqueioEvent()).isEqualTo("timeout");

    Collection<TimerEventDefinition> timeouts = taskListener.getTimeouts();
    assertThat(timeouts.size()).isEqualTo(1);

    TimerEventDefinition timeout = timeouts.iterator().next();
    assertThat(timeout.getTimeCycle()).isNull();
    assertThat(timeout.getTimeDate()).isNotNull();
    assertThat(timeout.getTimeDate().getRawTextContent()).isEqualTo("2019-09-09T12:12:12");
    assertThat(timeout.getTimeDuration()).isNull();
  }

  @Test
  public void testOrqueioTimeoutDurationTaskListenerByExpression() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
          .userTask("task")
            .orqueioTaskListenerExpressionTimeoutWithDuration("timeout-1", "anExpression", "PT1H")
        .endEvent()
        .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioTaskListener> taskListeners = extensionElements.getChildElementsByType(OrqueioTaskListener.class);
    assertThat(taskListeners).hasSize(1);

    OrqueioTaskListener taskListener = taskListeners.iterator().next();
    assertThat(taskListener.getOrqueioExpression()).isEqualTo("anExpression");
    assertThat(taskListener.getOrqueioEvent()).isEqualTo("timeout");

    Collection<TimerEventDefinition> timeouts = taskListener.getTimeouts();
    assertThat(timeouts.size()).isEqualTo(1);

    TimerEventDefinition timeout = timeouts.iterator().next();
    assertThat(timeout.getTimeCycle()).isNull();
    assertThat(timeout.getTimeDate()).isNull();
    assertThat(timeout.getTimeDuration()).isNotNull();
    assertThat(timeout.getTimeDuration().getRawTextContent()).isEqualTo("PT1H");
  }

  @Test
  public void testOrqueioTimeoutCycleTaskListenerByDelegateExpression() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
          .userTask("task")
            .orqueioTaskListenerDelegateExpressionTimeoutWithCycle("timeout-1", "aDelegate", "R/PT1H")
        .endEvent()
        .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioTaskListener> taskListeners = extensionElements.getChildElementsByType(OrqueioTaskListener.class);
    assertThat(taskListeners).hasSize(1);

    OrqueioTaskListener taskListener = taskListeners.iterator().next();
    assertThat(taskListener.getOrqueioDelegateExpression()).isEqualTo("aDelegate");
    assertThat(taskListener.getOrqueioEvent()).isEqualTo("timeout");

    Collection<TimerEventDefinition> timeouts = taskListener.getTimeouts();
    assertThat(timeouts.size()).isEqualTo(1);

    TimerEventDefinition timeout = timeouts.iterator().next();
    assertThat(timeout.getTimeCycle()).isNotNull();
    assertThat(timeout.getTimeCycle().getRawTextContent()).isEqualTo("R/PT1H");
    assertThat(timeout.getTimeDate()).isNull();
    assertThat(timeout.getTimeDuration()).isNull();
  }

  @Test
  public void testOrqueioTimeoutDateTaskListenerByDelegateExpression() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
          .userTask("task")
            .orqueioTaskListenerDelegateExpressionTimeoutWithDate("timeout-1", "aDelegate", "2019-09-09T12:12:12")
        .endEvent()
        .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioTaskListener> taskListeners = extensionElements.getChildElementsByType(OrqueioTaskListener.class);
    assertThat(taskListeners).hasSize(1);

    OrqueioTaskListener taskListener = taskListeners.iterator().next();
    assertThat(taskListener.getOrqueioDelegateExpression()).isEqualTo("aDelegate");
    assertThat(taskListener.getOrqueioEvent()).isEqualTo("timeout");

    Collection<TimerEventDefinition> timeouts = taskListener.getTimeouts();
    assertThat(timeouts.size()).isEqualTo(1);

    TimerEventDefinition timeout = timeouts.iterator().next();
    assertThat(timeout.getTimeCycle()).isNull();
    assertThat(timeout.getTimeDate()).isNotNull();
    assertThat(timeout.getTimeDate().getRawTextContent()).isEqualTo("2019-09-09T12:12:12");
    assertThat(timeout.getTimeDuration()).isNull();
  }

  @Test
  public void testOrqueioTimeoutDurationTaskListenerByDelegateExpression() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
          .userTask("task")
            .orqueioTaskListenerDelegateExpressionTimeoutWithDuration("timeout-1", "aDelegate", "PT1H")
        .endEvent()
        .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioTaskListener> taskListeners = extensionElements.getChildElementsByType(OrqueioTaskListener.class);
    assertThat(taskListeners).hasSize(1);

    OrqueioTaskListener taskListener = taskListeners.iterator().next();
    assertThat(taskListener.getOrqueioDelegateExpression()).isEqualTo("aDelegate");
    assertThat(taskListener.getOrqueioEvent()).isEqualTo("timeout");

    Collection<TimerEventDefinition> timeouts = taskListener.getTimeouts();
    assertThat(timeouts.size()).isEqualTo(1);

    TimerEventDefinition timeout = timeouts.iterator().next();
    assertThat(timeout.getTimeCycle()).isNull();
    assertThat(timeout.getTimeDate()).isNull();
    assertThat(timeout.getTimeDuration()).isNotNull();
    assertThat(timeout.getTimeDuration().getRawTextContent()).isEqualTo("PT1H");
  }

  @Test
  public void testOrqueioExecutionListenerByClassName() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .orqueioExecutionListenerClass("start", "aClass")
      .endEvent()
      .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioExecutionListener> executionListeners = extensionElements.getChildElementsByType(OrqueioExecutionListener.class);
    assertThat(executionListeners).hasSize(1);

    OrqueioExecutionListener executionListener = executionListeners.iterator().next();
    assertThat(executionListener.getOrqueioClass()).isEqualTo("aClass");
    assertThat(executionListener.getOrqueioEvent()).isEqualTo("start");
  }

  @Test
  public void testOrqueioExecutionListenerByClass() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .orqueioExecutionListenerClass("start", this.getClass())
      .endEvent()
      .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioExecutionListener> executionListeners = extensionElements.getChildElementsByType(OrqueioExecutionListener.class);
    assertThat(executionListeners).hasSize(1);

    OrqueioExecutionListener executionListener = executionListeners.iterator().next();
    assertThat(executionListener.getOrqueioClass()).isEqualTo(this.getClass().getName());
    assertThat(executionListener.getOrqueioEvent()).isEqualTo("start");
  }

  @Test
  public void testOrqueioExecutionListenerByExpression() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .orqueioExecutionListenerExpression("start", "anExpression")
      .endEvent()
      .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioExecutionListener> executionListeners = extensionElements.getChildElementsByType(OrqueioExecutionListener.class);
    assertThat(executionListeners).hasSize(1);

    OrqueioExecutionListener executionListener = executionListeners.iterator().next();
    assertThat(executionListener.getOrqueioExpression()).isEqualTo("anExpression");
    assertThat(executionListener.getOrqueioEvent()).isEqualTo("start");
  }

  @Test
  public void testOrqueioExecutionListenerByDelegateExpression() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .orqueioExecutionListenerDelegateExpression("start", "aDelegateExpression")
      .endEvent()
      .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    ExtensionElements extensionElements = userTask.getExtensionElements();
    Collection<OrqueioExecutionListener> executionListeners = extensionElements.getChildElementsByType(OrqueioExecutionListener.class);
    assertThat(executionListeners).hasSize(1);

    OrqueioExecutionListener executionListener = executionListeners.iterator().next();
    assertThat(executionListener.getOrqueioDelegateExpression()).isEqualTo("aDelegateExpression");
    assertThat(executionListener.getOrqueioEvent()).isEqualTo("start");
  }

  @Test
  public void testMultiInstanceLoopCharacteristicsSequential() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
        .multiInstance()
          .sequential()
          .cardinality("card")
          .completionCondition("compl")
          .orqueioCollection("coll")
          .orqueioElementVariable("element")
        .multiInstanceDone()
      .endEvent()
      .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    Collection<MultiInstanceLoopCharacteristics> miCharacteristics =
        userTask.getChildElementsByType(MultiInstanceLoopCharacteristics.class);

    assertThat(miCharacteristics).hasSize(1);

    MultiInstanceLoopCharacteristics miCharacteristic = miCharacteristics.iterator().next();
    assertThat(miCharacteristic.isSequential()).isTrue();
    assertThat(miCharacteristic.getLoopCardinality().getTextContent()).isEqualTo("card");
    assertThat(miCharacteristic.getCompletionCondition().getTextContent()).isEqualTo("compl");
    assertThat(miCharacteristic.getOrqueioCollection()).isEqualTo("coll");
    assertThat(miCharacteristic.getOrqueioElementVariable()).isEqualTo("element");

  }

  @Test
  public void testMultiInstanceLoopCharacteristicsParallel() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
        .multiInstance()
          .parallel()
        .multiInstanceDone()
      .endEvent()
      .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    Collection<MultiInstanceLoopCharacteristics> miCharacteristics =
      userTask.getChildElementsByType(MultiInstanceLoopCharacteristics.class);

    assertThat(miCharacteristics).hasSize(1);

    MultiInstanceLoopCharacteristics miCharacteristic = miCharacteristics.iterator().next();
    assertThat(miCharacteristic.isSequential()).isFalse();
  }

  @Test
  public void testTaskWithOrqueioInputOutput() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
        .orqueioInputParameter("foo", "bar")
        .orqueioInputParameter("yoo", "hoo")
        .orqueioOutputParameter("one", "two")
        .orqueioOutputParameter("three", "four")
      .endEvent()
      .done();

    UserTask task = modelInstance.getModelElementById("task");
    assertOrqueioInputOutputParameter(task);
  }

  @Test
  public void testMultiInstanceLoopCharacteristicsAsynchronousMultiInstanceAsyncBeforeElement() {
    modelInstance = Bpmn.createProcess()
            .startEvent()
            .userTask("task")
            .multiInstance()
            .orqueioAsyncBefore()
            .parallel()
            .multiInstanceDone()
            .endEvent()
            .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    Collection<MultiInstanceLoopCharacteristics> miCharacteristics =
            userTask.getChildElementsByType(MultiInstanceLoopCharacteristics.class);

    assertThat(miCharacteristics).hasSize(1);

    MultiInstanceLoopCharacteristics miCharacteristic = miCharacteristics.iterator().next();
    assertThat(miCharacteristic.isSequential()).isFalse();
    assertThat(miCharacteristic.isOrqueioAsyncAfter()).isFalse();
    assertThat(miCharacteristic.isOrqueioAsyncBefore()).isTrue();
  }

  @Test
  public void testMultiInstanceLoopCharacteristicsAsynchronousMultiInstanceAsyncAfterElement() {
    modelInstance = Bpmn.createProcess()
            .startEvent()
            .userTask("task")
            .multiInstance()
            .orqueioAsyncAfter()
            .parallel()
            .multiInstanceDone()
            .endEvent()
            .done();

    UserTask userTask = modelInstance.getModelElementById("task");
    Collection<MultiInstanceLoopCharacteristics> miCharacteristics =
            userTask.getChildElementsByType(MultiInstanceLoopCharacteristics.class);

    assertThat(miCharacteristics).hasSize(1);

    MultiInstanceLoopCharacteristics miCharacteristic = miCharacteristics.iterator().next();
    assertThat(miCharacteristic.isSequential()).isFalse();
    assertThat(miCharacteristic.isOrqueioAsyncAfter()).isTrue();
    assertThat(miCharacteristic.isOrqueioAsyncBefore()).isFalse();
  }

  @Test
  public void testTaskWithOrqueioInputOutputWithExistingExtensionElements() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
        .orqueioExecutionListenerExpression("end", "${true}")
        .orqueioInputParameter("foo", "bar")
        .orqueioInputParameter("yoo", "hoo")
        .orqueioOutputParameter("one", "two")
        .orqueioOutputParameter("three", "four")
      .endEvent()
      .done();

    UserTask task = modelInstance.getModelElementById("task");
    assertOrqueioInputOutputParameter(task);
  }

  @Test
  public void testTaskWithOrqueioInputOutputWithExistingOrqueioInputOutput() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
        .orqueioInputParameter("foo", "bar")
        .orqueioOutputParameter("one", "two")
      .endEvent()
      .done();

    UserTask task = modelInstance.getModelElementById("task");

    task.builder()
      .orqueioInputParameter("yoo", "hoo")
      .orqueioOutputParameter("three", "four");

    assertOrqueioInputOutputParameter(task);
  }

  @Test
  public void testSubProcessWithOrqueioInputOutput() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .subProcess("subProcess")
        .orqueioInputParameter("foo", "bar")
        .orqueioInputParameter("yoo", "hoo")
        .orqueioOutputParameter("one", "two")
        .orqueioOutputParameter("three", "four")
        .embeddedSubProcess()
          .startEvent()
          .endEvent()
        .subProcessDone()
      .endEvent()
      .done();

    SubProcess subProcess = modelInstance.getModelElementById("subProcess");
    assertOrqueioInputOutputParameter(subProcess);
  }

  @Test
  public void testSubProcessWithOrqueioInputOutputWithExistingExtensionElements() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .subProcess("subProcess")
        .orqueioExecutionListenerExpression("end", "${true}")
        .orqueioInputParameter("foo", "bar")
        .orqueioInputParameter("yoo", "hoo")
        .orqueioOutputParameter("one", "two")
        .orqueioOutputParameter("three", "four")
        .embeddedSubProcess()
          .startEvent()
          .endEvent()
        .subProcessDone()
      .endEvent()
      .done();

    SubProcess subProcess = modelInstance.getModelElementById("subProcess");
    assertOrqueioInputOutputParameter(subProcess);
  }

  @Test
  public void testSubProcessWithOrqueioInputOutputWithExistingOrqueioInputOutput() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .subProcess("subProcess")
        .orqueioInputParameter("foo", "bar")
        .orqueioOutputParameter("one", "two")
        .embeddedSubProcess()
          .startEvent()
          .endEvent()
        .subProcessDone()
      .endEvent()
      .done();

    SubProcess subProcess = modelInstance.getModelElementById("subProcess");

    subProcess.builder()
      .orqueioInputParameter("yoo", "hoo")
      .orqueioOutputParameter("three", "four");

    assertOrqueioInputOutputParameter(subProcess);
  }

  @Test
  public void testTimerStartEventWithDate() {
    modelInstance = Bpmn.createProcess()
      .startEvent("start").timerWithDate(TIMER_DATE)
      .done();

    assertTimerWithDate("start", TIMER_DATE);
  }

  @Test
  public void testTimerStartEventWithDuration() {
    modelInstance = Bpmn.createProcess()
      .startEvent("start").timerWithDuration(TIMER_DURATION)
      .done();

    assertTimerWithDuration("start", TIMER_DURATION);
  }

  @Test
  public void testTimerStartEventWithCycle() {
    modelInstance = Bpmn.createProcess()
      .startEvent("start").timerWithCycle(TIMER_CYCLE)
      .done();

    assertTimerWithCycle("start", TIMER_CYCLE);
  }

  @Test
  public void testIntermediateTimerCatchEventWithDate() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateCatchEvent("catch").timerWithDate(TIMER_DATE)
      .done();

    assertTimerWithDate("catch", TIMER_DATE);
  }

  @Test
  public void testIntermediateTimerCatchEventWithDuration() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateCatchEvent("catch").timerWithDuration(TIMER_DURATION)
      .done();

    assertTimerWithDuration("catch", TIMER_DURATION);
  }

  @Test
  public void testIntermediateTimerCatchEventWithCycle() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateCatchEvent("catch").timerWithCycle(TIMER_CYCLE)
      .done();

    assertTimerWithCycle("catch", TIMER_CYCLE);
  }

  @Test
  public void testTimerBoundaryEventWithDate() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .endEvent()
      .moveToActivity("task")
      .boundaryEvent("boundary").timerWithDate(TIMER_DATE)
      .done();

    assertTimerWithDate("boundary", TIMER_DATE);
  }

  @Test
  public void testTimerBoundaryEventWithDuration() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .endEvent()
      .moveToActivity("task")
      .boundaryEvent("boundary").timerWithDuration(TIMER_DURATION)
      .done();

    assertTimerWithDuration("boundary", TIMER_DURATION);
  }

  @Test
  public void testTimerBoundaryEventWithCycle() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .endEvent()
      .moveToActivity("task")
      .boundaryEvent("boundary").timerWithCycle(TIMER_CYCLE)
      .done();

    assertTimerWithCycle("boundary", TIMER_CYCLE);
  }

  @Test
  public void testNotCancelingBoundaryEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask()
      .boundaryEvent("boundary").cancelActivity(false)
      .done();

    BoundaryEvent boundaryEvent = modelInstance.getModelElementById("boundary");
    assertThat(boundaryEvent.cancelActivity()).isFalse();
  }

  @Test
  public void testCatchAllErrorBoundaryEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .endEvent()
      .moveToActivity("task")
      .boundaryEvent("boundary").error()
      .endEvent("boundaryEnd")
      .done();

    ErrorEventDefinition errorEventDefinition = assertAndGetSingleEventDefinition("boundary", ErrorEventDefinition.class);
    assertThat(errorEventDefinition.getError()).isNull();
  }

  @Test
  public void testCompensationTask() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .boundaryEvent("boundary")
        .compensateEventDefinition().compensateEventDefinitionDone()
        .compensationStart()
        .userTask("compensate").name("compensate")
        .compensationDone()
      .endEvent("theend")
      .done();

    // Checking Association
    Collection<Association> associations = modelInstance.getModelElementsByType(Association.class);
    assertThat(associations).hasSize(1);
    Association association = associations.iterator().next();
    assertThat(association.getSource().getId()).isEqualTo("boundary");
    assertThat(association.getTarget().getId()).isEqualTo("compensate");
    assertThat(association.getAssociationDirection()).isEqualTo(AssociationDirection.One);

    // Checking Sequence flow
    UserTask task = modelInstance.getModelElementById("task");
    Collection<SequenceFlow> outgoing = task.getOutgoing();
    assertThat(outgoing).hasSize(1);
    SequenceFlow flow = outgoing.iterator().next();
    assertThat(flow.getSource().getId()).isEqualTo("task");
    assertThat(flow.getTarget().getId()).isEqualTo("theend");

  }

  @Test
  public void testOnlyOneCompensateBoundaryEventAllowed() {
    // given
    UserTaskBuilder builder = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .boundaryEvent("boundary")
      .compensateEventDefinition().compensateEventDefinitionDone()
      .compensationStart()
      .userTask("compensate").name("compensate");

    // then
    thrown.expect(BpmnModelException.class);
    thrown.expectMessage("Only single compensation handler allowed. Call compensationDone() to continue main flow.");

    // when
    builder.userTask();
  }

  @Test
  public void testInvalidCompensationStartCall() {
    // given
    StartEventBuilder builder = Bpmn.createProcess().startEvent();

    // then
    thrown.expect(BpmnModelException.class);
    thrown.expectMessage("Compensation can only be started on a boundary event with a compensation event definition");

    // when
    builder.compensationStart();
  }

  @Test
  public void testInvalidCompensationDoneCall() {
    // given
    AbstractFlowNodeBuilder builder = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .boundaryEvent("boundary")
      .compensateEventDefinition().compensateEventDefinitionDone();

    // then
    thrown.expect(BpmnModelException.class);
    thrown.expectMessage("No compensation in progress. Call compensationStart() first.");

    // when
    builder.compensationDone();
  }

  @Test
  public void testErrorBoundaryEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .endEvent()
      .moveToActivity("task")
      .boundaryEvent("boundary").error("myErrorCode", "errorMessage")
      .endEvent("boundaryEnd")
      .done();

    assertErrorEventDefinition("boundary", "myErrorCode", "errorMessage");

    UserTask userTask = modelInstance.getModelElementById("task");
    BoundaryEvent boundaryEvent = modelInstance.getModelElementById("boundary");
    EndEvent boundaryEnd = modelInstance.getModelElementById("boundaryEnd");

    // boundary event is attached to the user task
    assertThat(boundaryEvent.getAttachedTo()).isEqualTo(userTask);

    // boundary event has no incoming sequence flows
    assertThat(boundaryEvent.getIncoming()).isEmpty();

    // the next flow node is the boundary end event
    List<FlowNode> succeedingNodes = boundaryEvent.getSucceedingNodes().list();
    assertThat(succeedingNodes).containsOnly(boundaryEnd);
  }

  @Test
  public void testErrorBoundaryEventWithoutErrorMessage() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
        .userTask("task")
        .endEvent()
        .moveToActivity("task")
        .boundaryEvent("boundary").error("myErrorCode")
        .endEvent("boundaryEnd")
        .done();

    assertErrorEventDefinition("boundary", "myErrorCode", null);
  }

  @Test
  public void testErrorDefinitionForBoundaryEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .endEvent()
      .moveToActivity("task")
      .boundaryEvent("boundary")
        .errorEventDefinition("event")
          .errorCodeVariable("errorCodeVariable")
          .errorMessageVariable("errorMessageVariable")
          .error("errorCode", "errorMessage")
        .errorEventDefinitionDone()
      .endEvent("boundaryEnd")
      .done();

    assertErrorEventDefinition("boundary", "errorCode", "errorMessage");
    assertErrorEventDefinitionForErrorVariables("boundary", "errorCodeVariable", "errorMessageVariable");
  }

  @Test
  public void testErrorDefinitionForBoundaryEventWithoutEventDefinitionId() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .endEvent()
      .moveToActivity("task")
      .boundaryEvent("boundary")
        .errorEventDefinition()
          .errorCodeVariable("errorCodeVariable")
          .errorMessageVariable("errorMessageVariable")
          .error("errorCode", "errorMessage")
        .errorEventDefinitionDone()
      .endEvent("boundaryEnd")
      .done();

    Bpmn.writeModelToStream(System.out, modelInstance);

    assertErrorEventDefinition("boundary", "errorCode", "errorMessage");
    assertErrorEventDefinitionForErrorVariables("boundary", "errorCodeVariable", "errorMessageVariable");
  }

  @Test
  public void testErrorEndEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .endEvent("end").error("myErrorCode", "errorMessage")
      .done();

    assertErrorEventDefinition("end", "myErrorCode", "errorMessage");
  }

  @Test
  public void testErrorEndEventWithoutErrorMessage() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
        .endEvent("end").error("myErrorCode")
        .done();

    assertErrorEventDefinition("end", "myErrorCode", null);
  }

  @Test
  public void testErrorEndEventWithExistingError() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .endEvent("end").error("myErrorCode", "errorMessage")
      .moveToActivity("task")
      .boundaryEvent("boundary").error("myErrorCode")
      .endEvent("boundaryEnd")
      .done();

    Error boundaryError = assertErrorEventDefinition("boundary", "myErrorCode", "errorMessage");
    Error endError = assertErrorEventDefinition("end", "myErrorCode", "errorMessage");

    assertThat(boundaryError).isEqualTo(endError);

    assertOnlyOneErrorExists("myErrorCode");
  }

  @Test
  public void testErrorStartEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .endEvent()
      .subProcess()
        .triggerByEvent()
        .embeddedSubProcess()
        .startEvent("subProcessStart")
        .error("myErrorCode", "errorMessage")
        .endEvent()
      .done();

    assertErrorEventDefinition("subProcessStart", "myErrorCode", "errorMessage");
  }

  @Test
  public void testErrorStartEventWithoutErrorMessage() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
        .endEvent()
        .subProcess()
          .triggerByEvent()
          .embeddedSubProcess()
            .startEvent("subProcessStart")
            .error("myErrorCode")
            .endEvent()
        .done();

    assertErrorEventDefinition("subProcessStart", "myErrorCode", null);
  }

  @Test
  public void testCatchAllErrorStartEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .endEvent()
      .subProcess()
        .triggerByEvent()
        .embeddedSubProcess()
        .startEvent("subProcessStart")
        .error()
        .endEvent()
      .done();

    ErrorEventDefinition errorEventDefinition = assertAndGetSingleEventDefinition("subProcessStart", ErrorEventDefinition.class);
    assertThat(errorEventDefinition.getError()).isNull();
  }

  @Test
  public void testCatchAllEscalationBoundaryEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .endEvent()
      .moveToActivity("task")
      .boundaryEvent("boundary").escalation()
      .endEvent("boundaryEnd")
      .done();

    EscalationEventDefinition escalationEventDefinition = assertAndGetSingleEventDefinition("boundary", EscalationEventDefinition.class);
    assertThat(escalationEventDefinition.getEscalation()).isNull();
  }

  @Test
  public void testEscalationBoundaryEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .subProcess("subProcess")
      .endEvent()
      .moveToActivity("subProcess")
      .boundaryEvent("boundary").escalation("myEscalationCode")
      .endEvent("boundaryEnd")
      .done();

    assertEscalationEventDefinition("boundary", "myEscalationCode");

    SubProcess subProcess = modelInstance.getModelElementById("subProcess");
    BoundaryEvent boundaryEvent = modelInstance.getModelElementById("boundary");
    EndEvent boundaryEnd = modelInstance.getModelElementById("boundaryEnd");

    // boundary event is attached to the sub process
    assertThat(boundaryEvent.getAttachedTo()).isEqualTo(subProcess);

    // boundary event has no incoming sequence flows
    assertThat(boundaryEvent.getIncoming()).isEmpty();

    // the next flow node is the boundary end event
    List<FlowNode> succeedingNodes = boundaryEvent.getSucceedingNodes().list();
    assertThat(succeedingNodes).containsOnly(boundaryEnd);
  }

  @Test
  public void testEscalationEndEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .endEvent("end").escalation("myEscalationCode")
      .done();

    assertEscalationEventDefinition("end", "myEscalationCode");
  }

  @Test
  public void testEscalationStartEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .endEvent()
      .subProcess()
        .triggerByEvent()
        .embeddedSubProcess()
        .startEvent("subProcessStart")
        .escalation("myEscalationCode")
        .endEvent()
      .done();

    assertEscalationEventDefinition("subProcessStart", "myEscalationCode");
  }

  @Test
  public void testCatchAllEscalationStartEvent() {
    modelInstance = Bpmn.createProcess()
        .startEvent()
        .endEvent()
        .subProcess()
          .triggerByEvent()
          .embeddedSubProcess()
          .startEvent("subProcessStart")
          .escalation()
          .endEvent()
        .done();

    EscalationEventDefinition escalationEventDefinition = assertAndGetSingleEventDefinition("subProcessStart", EscalationEventDefinition.class);
    assertThat(escalationEventDefinition.getEscalation()).isNull();
  }

  @Test
  public void testIntermediateEscalationThrowEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateThrowEvent("throw").escalation("myEscalationCode")
      .endEvent()
      .done();

    assertEscalationEventDefinition("throw", "myEscalationCode");
  }

  @Test
  public void testEscalationEndEventWithExistingEscalation() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("task")
      .endEvent("end").escalation("myEscalationCode")
      .moveToActivity("task")
      .boundaryEvent("boundary").escalation("myEscalationCode")
      .endEvent("boundaryEnd")
      .done();

    Escalation boundaryEscalation = assertEscalationEventDefinition("boundary", "myEscalationCode");
    Escalation endEscalation = assertEscalationEventDefinition("end", "myEscalationCode");

    assertThat(boundaryEscalation).isEqualTo(endEscalation);

    assertOnlyOneEscalationExists("myEscalationCode");

  }

  @Test
  public void testCompensationStartEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .endEvent()
      .subProcess()
        .triggerByEvent()
        .embeddedSubProcess()
        .startEvent("subProcessStart")
        .compensation()
        .endEvent()
      .done();

    assertCompensationEventDefinition("subProcessStart");
  }

  @Test
  public void testInterruptingStartEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .endEvent()
      .subProcess()
        .triggerByEvent()
        .embeddedSubProcess()
        .startEvent("subProcessStart")
          .interrupting(true)
          .error()
        .endEvent()
      .done();

    StartEvent startEvent = modelInstance.getModelElementById("subProcessStart");
    assertThat(startEvent).isNotNull();
    assertThat(startEvent.isInterrupting()).isTrue();
  }

  @Test
  public void testNonInterruptingStartEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .endEvent()
      .subProcess()
        .triggerByEvent()
        .embeddedSubProcess()
        .startEvent("subProcessStart")
          .interrupting(false)
          .error()
        .endEvent()
      .done();

    StartEvent startEvent = modelInstance.getModelElementById("subProcessStart");
    assertThat(startEvent).isNotNull();
    assertThat(startEvent.isInterrupting()).isFalse();
  }

  @Test
  public void testUserTaskOrqueioFormField() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask(TASK_ID)
        .orqueioFormField()
          .orqueioId("myFormField_1")
          .orqueioLabel("Form Field One")
          .orqueioType("string")
          .orqueioDefaultValue("myDefaultVal_1")
         .orqueioFormFieldDone()
        .orqueioFormField()
          .orqueioId("myFormField_2")
          .orqueioLabel("Form Field Two")
          .orqueioType("integer")
          .orqueioDefaultValue("myDefaultVal_2")
         .orqueioFormFieldDone()
      .endEvent()
      .done();

    UserTask userTask = modelInstance.getModelElementById(TASK_ID);
    assertOrqueioFormField(userTask);
  }

  @Test
  public void testUserTaskOrqueioFormFieldWithExistingOrqueioFormData() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask(TASK_ID)
        .orqueioFormField()
          .orqueioId("myFormField_1")
          .orqueioLabel("Form Field One")
          .orqueioType("string")
          .orqueioDefaultValue("myDefaultVal_1")
         .orqueioFormFieldDone()
      .endEvent()
      .done();

    UserTask userTask = modelInstance.getModelElementById(TASK_ID);

    userTask.builder()
      .orqueioFormField()
        .orqueioId("myFormField_2")
        .orqueioLabel("Form Field Two")
        .orqueioType("integer")
        .orqueioDefaultValue("myDefaultVal_2")
       .orqueioFormFieldDone();

    assertOrqueioFormField(userTask);
  }

  @Test
  public void testStartEventOrqueioFormField() {
    modelInstance = Bpmn.createProcess()
      .startEvent(START_EVENT_ID)
        .orqueioFormField()
          .orqueioId("myFormField_1")
          .orqueioLabel("Form Field One")
          .orqueioType("string")
          .orqueioDefaultValue("myDefaultVal_1")
         .orqueioFormFieldDone()
         .orqueioFormField()
         .orqueioId("myFormField_2")
          .orqueioLabel("Form Field Two")
          .orqueioType("integer")
          .orqueioDefaultValue("myDefaultVal_2")
         .orqueioFormFieldDone()
      .endEvent()
      .done();

    StartEvent startEvent = modelInstance.getModelElementById(START_EVENT_ID);
    assertOrqueioFormField(startEvent);
  }

  @Test
  public void testUserTaskOrqueioFormRef() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask(TASK_ID)
        .orqueioFormRef(FORM_ID)
        .orqueioFormRefBinding(TEST_STRING_FORM_REF_BINDING)
        .orqueioFormRefVersion(TEST_STRING_FORM_REF_VERSION)
      .endEvent()
      .done();

    UserTask userTask = modelInstance.getModelElementById(TASK_ID);
    assertThat(userTask.getOrqueioFormRef()).isEqualTo(FORM_ID);
    assertThat(userTask.getOrqueioFormRefBinding()).isEqualTo(TEST_STRING_FORM_REF_BINDING);
    assertThat(userTask.getOrqueioFormRefVersion()).isEqualTo(TEST_STRING_FORM_REF_VERSION);
  }

  @Test
  public void testStartEventOrqueioFormRef() {
    modelInstance = Bpmn.createProcess()
        .startEvent(START_EVENT_ID)
          .orqueioFormRef(FORM_ID)
          .orqueioFormRefBinding(TEST_STRING_FORM_REF_BINDING)
          .orqueioFormRefVersion(TEST_STRING_FORM_REF_VERSION)
        .userTask()
        .endEvent()
        .done();

    StartEvent startEvent = modelInstance.getModelElementById(START_EVENT_ID);
    assertThat(startEvent.getOrqueioFormRef()).isEqualTo(FORM_ID);
    assertThat(startEvent.getOrqueioFormRefBinding()).isEqualTo(TEST_STRING_FORM_REF_BINDING);
    assertThat(startEvent.getOrqueioFormRefVersion()).isEqualTo(TEST_STRING_FORM_REF_VERSION);
  }

  @Test
  public void testCompensateEventDefintionCatchStartEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent("start")
        .compensateEventDefinition()
        .waitForCompletion(false)
        .compensateEventDefinitionDone()
      .userTask("userTask")
      .endEvent("end")
      .done();

    CompensateEventDefinition eventDefinition = assertAndGetSingleEventDefinition("start", CompensateEventDefinition.class);
    Activity activity = eventDefinition.getActivity();
    assertThat(activity).isNull();
    assertThat(eventDefinition.isWaitForCompletion()).isFalse();
  }


  @Test
  public void testCompensateEventDefintionCatchBoundaryEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("userTask")
      .boundaryEvent("catch")
        .compensateEventDefinition()
        .waitForCompletion(false)
        .compensateEventDefinitionDone()
      .endEvent("end")
      .done();

    CompensateEventDefinition eventDefinition = assertAndGetSingleEventDefinition("catch", CompensateEventDefinition.class);
    Activity activity = eventDefinition.getActivity();
    assertThat(activity).isNull();
    assertThat(eventDefinition.isWaitForCompletion()).isFalse();
  }

  @Test
  public void testCompensateEventDefintionCatchBoundaryEventWithId() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("userTask")
      .boundaryEvent("catch")
        .compensateEventDefinition("foo")
        .waitForCompletion(false)
        .compensateEventDefinitionDone()
      .endEvent("end")
      .done();

    CompensateEventDefinition eventDefinition = assertAndGetSingleEventDefinition("catch", CompensateEventDefinition.class);
    assertThat(eventDefinition.getId()).isEqualTo("foo");
  }

  @Test
  public void testCompensateEventDefintionThrowEndEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("userTask")
      .endEvent("end")
        .compensateEventDefinition()
        .activityRef("userTask")
        .waitForCompletion(true)
        .compensateEventDefinitionDone()
      .done();

    CompensateEventDefinition eventDefinition = assertAndGetSingleEventDefinition("end", CompensateEventDefinition.class);
    Activity activity = eventDefinition.getActivity();
    assertThat(activity).isEqualTo(modelInstance.getModelElementById("userTask"));
    assertThat(eventDefinition.isWaitForCompletion()).isTrue();
  }

  @Test
  public void testCompensateEventDefintionThrowIntermediateEvent() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("userTask")
      .intermediateThrowEvent("throw")
        .compensateEventDefinition()
        .activityRef("userTask")
        .waitForCompletion(true)
        .compensateEventDefinitionDone()
      .endEvent("end")
      .done();

    CompensateEventDefinition eventDefinition = assertAndGetSingleEventDefinition("throw", CompensateEventDefinition.class);
    Activity activity = eventDefinition.getActivity();
    assertThat(activity).isEqualTo(modelInstance.getModelElementById("userTask"));
    assertThat(eventDefinition.isWaitForCompletion()).isTrue();
  }

  @Test
  public void testCompensateEventDefintionThrowIntermediateEventWithId() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("userTask")
      .intermediateCatchEvent("throw")
        .compensateEventDefinition("foo")
        .activityRef("userTask")
        .waitForCompletion(true)
        .compensateEventDefinitionDone()
      .endEvent("end")
      .done();

    CompensateEventDefinition eventDefinition = assertAndGetSingleEventDefinition("throw", CompensateEventDefinition.class);
    assertThat(eventDefinition.getId()).isEqualTo("foo");
  }

  @Test
  public void testCompensateEventDefintionReferencesNonExistingActivity() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("userTask")
      .endEvent("end")
      .done();

    UserTask userTask = modelInstance.getModelElementById("userTask");
    UserTaskBuilder userTaskBuilder = userTask.builder();

    try {
      userTaskBuilder
        .boundaryEvent()
        .compensateEventDefinition()
        .activityRef("nonExistingTask")
        .done();
      fail("should fail");
    } catch (BpmnModelException e) {
      assertThat(e).hasMessageContaining("Activity with id 'nonExistingTask' does not exist");
    }
  }

  @Test
  public void testCompensateEventDefintionReferencesActivityInDifferentScope() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("userTask")
      .subProcess()
        .embeddedSubProcess()
        .startEvent()
        .userTask("subProcessTask")
        .endEvent()
        .subProcessDone()
      .endEvent("end")
      .done();

    UserTask userTask = modelInstance.getModelElementById("userTask");
    UserTaskBuilder userTaskBuilder = userTask.builder();

    try {
      userTaskBuilder
        .boundaryEvent("boundary")
        .compensateEventDefinition()
        .activityRef("subProcessTask")
        .done();
      fail("should fail");
    } catch (BpmnModelException e) {
      assertThat(e).hasMessageContaining("Activity with id 'subProcessTask' must be in the same scope as 'boundary'");
    }
  }

  @Test
  public void testConditionalEventDefinitionOrqueioExtensions() {
    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateCatchEvent()
      .conditionalEventDefinition(CONDITION_ID)
        .condition(TEST_CONDITION)
        .orqueioVariableEvents(TEST_CONDITIONAL_VARIABLE_EVENTS)
        .orqueioVariableEvents(TEST_CONDITIONAL_VARIABLE_EVENTS_LIST)
        .orqueioVariableName(TEST_CONDITIONAL_VARIABLE_NAME)
      .conditionalEventDefinitionDone()
      .endEvent()
      .done();

    ConditionalEventDefinition conditionalEventDef = modelInstance.getModelElementById(CONDITION_ID);
    assertThat(conditionalEventDef.getOrqueioVariableEvents()).isEqualTo(TEST_CONDITIONAL_VARIABLE_EVENTS);
    assertThat(conditionalEventDef.getOrqueioVariableEventsList()).containsAll(TEST_CONDITIONAL_VARIABLE_EVENTS_LIST);
    assertThat(conditionalEventDef.getOrqueioVariableName()).isEqualTo(TEST_CONDITIONAL_VARIABLE_NAME);
  }

  @Test
  public void testIntermediateConditionalEventDefinition() {

    modelInstance = Bpmn.createProcess()
      .startEvent()
      .intermediateCatchEvent(CATCH_ID)
        .conditionalEventDefinition(CONDITION_ID)
            .condition(TEST_CONDITION)
        .conditionalEventDefinitionDone()
      .endEvent()
      .done();

    ConditionalEventDefinition eventDefinition = assertAndGetSingleEventDefinition(CATCH_ID, ConditionalEventDefinition.class);
    assertThat(eventDefinition.getId()).isEqualTo(CONDITION_ID);
    assertThat(eventDefinition.getCondition().getTextContent()).isEqualTo(TEST_CONDITION);
  }

  @Test
  public void testIntermediateConditionalEventDefinitionShortCut() {

    modelInstance = Bpmn.createProcess()
      .startEvent()
        .intermediateCatchEvent(CATCH_ID)
        .condition(TEST_CONDITION)
      .endEvent()
      .done();

    ConditionalEventDefinition eventDefinition = assertAndGetSingleEventDefinition(CATCH_ID, ConditionalEventDefinition.class);
    assertThat(eventDefinition.getCondition().getTextContent()).isEqualTo(TEST_CONDITION);
  }

  @Test
  public void testBoundaryConditionalEventDefinition() {

    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask(USER_TASK_ID)
      .endEvent()
        .moveToActivity(USER_TASK_ID)
          .boundaryEvent(BOUNDARY_ID)
            .conditionalEventDefinition(CONDITION_ID)
              .condition(TEST_CONDITION)
            .conditionalEventDefinitionDone()
          .endEvent()
      .done();

    ConditionalEventDefinition eventDefinition = assertAndGetSingleEventDefinition(BOUNDARY_ID, ConditionalEventDefinition.class);
    assertThat(eventDefinition.getId()).isEqualTo(CONDITION_ID);
    assertThat(eventDefinition.getCondition().getTextContent()).isEqualTo(TEST_CONDITION);
  }

  @Test
  public void testEventSubProcessConditionalStartEvent() {

    modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask()
      .endEvent()
      .subProcess()
        .triggerByEvent()
        .embeddedSubProcess()
        .startEvent(START_EVENT_ID)
          .conditionalEventDefinition(CONDITION_ID)
            .condition(TEST_CONDITION)
          .conditionalEventDefinitionDone()
        .endEvent()
      .done();

    ConditionalEventDefinition eventDefinition = assertAndGetSingleEventDefinition(START_EVENT_ID, ConditionalEventDefinition.class);
    assertThat(eventDefinition.getId()).isEqualTo(CONDITION_ID);
    assertThat(eventDefinition.getCondition().getTextContent()).isEqualTo(TEST_CONDITION);
  }

  protected Message assertMessageEventDefinition(String elementId, String messageName) {
    MessageEventDefinition messageEventDefinition = assertAndGetSingleEventDefinition(elementId, MessageEventDefinition.class);
    Message message = messageEventDefinition.getMessage();
    assertThat(message).isNotNull();
    assertThat(message.getName()).isEqualTo(messageName);

    return message;
  }

  protected void assertOnlyOneMessageExists(String messageName) {
    Collection<Message> messages = modelInstance.getModelElementsByType(Message.class);
    assertThat(messages).extracting("name").containsOnlyOnce(messageName);
  }

  protected Signal assertSignalEventDefinition(String elementId, String signalName) {
    SignalEventDefinition signalEventDefinition = assertAndGetSingleEventDefinition(elementId, SignalEventDefinition.class);
    Signal signal = signalEventDefinition.getSignal();
    assertThat(signal).isNotNull();
    assertThat(signal.getName()).isEqualTo(signalName);

    return signal;
  }

  protected void assertOnlyOneSignalExists(String signalName) {
    Collection<Signal> signals = modelInstance.getModelElementsByType(Signal.class);
    assertThat(signals).extracting("name").containsOnlyOnce(signalName);
  }

  protected Error assertErrorEventDefinition(String elementId, String errorCode, String errorMessage) {
    ErrorEventDefinition errorEventDefinition = assertAndGetSingleEventDefinition(elementId, ErrorEventDefinition.class);
    Error error = errorEventDefinition.getError();
    assertThat(error).isNotNull();
    assertThat(error.getErrorCode()).isEqualTo(errorCode);
    assertThat(error.getOrqueioErrorMessage()).isEqualTo(errorMessage);

    return error;
  }

  protected void assertErrorEventDefinitionForErrorVariables(String elementId, String errorCodeVariable, String errorMessageVariable) {
    ErrorEventDefinition errorEventDefinition = assertAndGetSingleEventDefinition(elementId, ErrorEventDefinition.class);
    assertThat(errorEventDefinition).isNotNull();
    if(errorCodeVariable != null) {
      assertThat(errorEventDefinition.getOrqueioErrorCodeVariable()).isEqualTo(errorCodeVariable);
    }
    if(errorMessageVariable != null) {
      assertThat(errorEventDefinition.getOrqueioErrorMessageVariable()).isEqualTo(errorMessageVariable);
    }
  }

  protected void assertOnlyOneErrorExists(String errorCode) {
    Collection<Error> errors = modelInstance.getModelElementsByType(Error.class);
    assertThat(errors).extracting("errorCode").containsOnlyOnce(errorCode);
  }

  protected Escalation assertEscalationEventDefinition(String elementId, String escalationCode) {
    EscalationEventDefinition escalationEventDefinition = assertAndGetSingleEventDefinition(elementId, EscalationEventDefinition.class);
    Escalation escalation = escalationEventDefinition.getEscalation();
    assertThat(escalation).isNotNull();
    assertThat(escalation.getEscalationCode()).isEqualTo(escalationCode);

    return escalation;
  }

  protected void assertOnlyOneEscalationExists(String escalationCode) {
    Collection<Escalation> escalations = modelInstance.getModelElementsByType(Escalation.class);
    assertThat(escalations).extracting("escalationCode").containsOnlyOnce(escalationCode);
  }

  protected void assertCompensationEventDefinition(String elementId) {
    assertAndGetSingleEventDefinition(elementId, CompensateEventDefinition.class);
  }

  protected void assertOrqueioInputOutputParameter(BaseElement element) {
    OrqueioInputOutput orqueioInputOutput = element.getExtensionElements().getElementsQuery().filterByType(OrqueioInputOutput.class).singleResult();
    assertThat(orqueioInputOutput).isNotNull();

    List<OrqueioInputParameter> orqueioInputParameters = new ArrayList<>(orqueioInputOutput.getOrqueioInputParameters());
    assertThat(orqueioInputParameters).hasSize(2);

    OrqueioInputParameter orqueioInputParameter = orqueioInputParameters.get(0);
    assertThat(orqueioInputParameter.getOrqueioName()).isEqualTo("foo");
    assertThat(orqueioInputParameter.getTextContent()).isEqualTo("bar");

    orqueioInputParameter = orqueioInputParameters.get(1);
    assertThat(orqueioInputParameter.getOrqueioName()).isEqualTo("yoo");
    assertThat(orqueioInputParameter.getTextContent()).isEqualTo("hoo");

    List<OrqueioOutputParameter> orqueioOutputParameters = new ArrayList<>(orqueioInputOutput.getOrqueioOutputParameters());
    assertThat(orqueioOutputParameters).hasSize(2);

    OrqueioOutputParameter orqueioOutputParameter = orqueioOutputParameters.get(0);
    assertThat(orqueioOutputParameter.getOrqueioName()).isEqualTo("one");
    assertThat(orqueioOutputParameter.getTextContent()).isEqualTo("two");

    orqueioOutputParameter = orqueioOutputParameters.get(1);
    assertThat(orqueioOutputParameter.getOrqueioName()).isEqualTo("three");
    assertThat(orqueioOutputParameter.getTextContent()).isEqualTo("four");
  }

  protected void assertTimerWithDate(String elementId, String timerDate) {
    TimerEventDefinition timerEventDefinition = assertAndGetSingleEventDefinition(elementId, TimerEventDefinition.class);
    TimeDate timeDate = timerEventDefinition.getTimeDate();
    assertThat(timeDate).isNotNull();
    assertThat(timeDate.getTextContent()).isEqualTo(timerDate);
  }

  protected void assertTimerWithDuration(String elementId, String timerDuration) {
    TimerEventDefinition timerEventDefinition = assertAndGetSingleEventDefinition(elementId, TimerEventDefinition.class);
    TimeDuration timeDuration = timerEventDefinition.getTimeDuration();
    assertThat(timeDuration).isNotNull();
    assertThat(timeDuration.getTextContent()).isEqualTo(timerDuration);
  }

  protected void assertTimerWithCycle(String elementId, String timerCycle) {
    TimerEventDefinition timerEventDefinition = assertAndGetSingleEventDefinition(elementId, TimerEventDefinition.class);
    TimeCycle timeCycle = timerEventDefinition.getTimeCycle();
    assertThat(timeCycle).isNotNull();
    assertThat(timeCycle.getTextContent()).isEqualTo(timerCycle);
  }

  @SuppressWarnings("unchecked")
  protected <T extends EventDefinition> T assertAndGetSingleEventDefinition(String elementId, Class<T> eventDefinitionType) {
    BpmnModelElementInstance element = modelInstance.getModelElementById(elementId);
    assertThat(element).isNotNull();
    Collection<EventDefinition> eventDefinitions = element.getChildElementsByType(EventDefinition.class);
    assertThat(eventDefinitions).hasSize(1);

    EventDefinition eventDefinition = eventDefinitions.iterator().next();
    assertThat(eventDefinition)
      .isNotNull()
      .isInstanceOf(eventDefinitionType);
    return (T) eventDefinition;
  }

  protected void assertOrqueioFormField(BaseElement element) {
    assertThat(element.getExtensionElements()).isNotNull();

    OrqueioFormData orqueioFormData = element.getExtensionElements().getElementsQuery().filterByType(OrqueioFormData.class).singleResult();
    assertThat(orqueioFormData).isNotNull();

    List<OrqueioFormField> orqueioFormFields = new ArrayList<>(orqueioFormData.getOrqueioFormFields());
    assertThat(orqueioFormFields).hasSize(2);

    OrqueioFormField orqueioFormField = orqueioFormFields.get(0);
    assertThat(orqueioFormField.getOrqueioId()).isEqualTo("myFormField_1");
    assertThat(orqueioFormField.getOrqueioLabel()).isEqualTo("Form Field One");
    assertThat(orqueioFormField.getOrqueioType()).isEqualTo("string");
    assertThat(orqueioFormField.getOrqueioDefaultValue()).isEqualTo("myDefaultVal_1");

    orqueioFormField = orqueioFormFields.get(1);
    assertThat(orqueioFormField.getOrqueioId()).isEqualTo("myFormField_2");
    assertThat(orqueioFormField.getOrqueioLabel()).isEqualTo("Form Field Two");
    assertThat(orqueioFormField.getOrqueioType()).isEqualTo("integer");
    assertThat(orqueioFormField.getOrqueioDefaultValue()).isEqualTo("myDefaultVal_2");

  }

  protected void assertOrqueioFailedJobRetryTimeCycle(BaseElement element) {
    assertThat(element.getExtensionElements()).isNotNull();

    OrqueioFailedJobRetryTimeCycle orqueioFailedJobRetryTimeCycle = element.getExtensionElements().getElementsQuery().filterByType(OrqueioFailedJobRetryTimeCycle.class).singleResult();
    assertThat(orqueioFailedJobRetryTimeCycle).isNotNull();
    assertThat(orqueioFailedJobRetryTimeCycle.getTextContent()).isEqualTo(FAILED_JOB_RETRY_TIME_CYCLE);
  }

  @Test
  public void testCreateEventSubProcess() {
    ProcessBuilder process = Bpmn.createProcess();
    modelInstance = process
      .startEvent()
      .sendTask()
      .endEvent()
      .done();

    EventSubProcessBuilder eventSubProcess = process.eventSubProcess();
    eventSubProcess
      .startEvent()
      .userTask()
      .endEvent();

    SubProcess subProcess = eventSubProcess.getElement();

    // no input or output from the sub process
    assertThat(subProcess.getIncoming().isEmpty());
    assertThat(subProcess.getOutgoing().isEmpty());

    // subProcess was triggered by event
    assertThat(eventSubProcess.getElement().triggeredByEvent());

    // subProcess contains startEvent, sendTask and endEvent
    assertThat(subProcess.getChildElementsByType(StartEvent.class)).isNotNull();
    assertThat(subProcess.getChildElementsByType(UserTask.class)).isNotNull();
    assertThat(subProcess.getChildElementsByType(EndEvent.class)).isNotNull();
  }


  @Test
  public void testCreateEventSubProcessInSubProcess() {
    ProcessBuilder process = Bpmn.createProcess();
    modelInstance = process
      .startEvent()
      .subProcess("mysubprocess")
        .embeddedSubProcess()
        .startEvent()
        .userTask()
        .endEvent()
        .subProcessDone()
      .userTask()
      .endEvent()
      .done();

    SubProcess subprocess = modelInstance.getModelElementById("mysubprocess");
    subprocess
      .builder()
      .embeddedSubProcess()
        .eventSubProcess("myeventsubprocess")
        .startEvent()
        .userTask()
        .endEvent()
        .subProcessDone();

    SubProcess eventSubProcess = modelInstance.getModelElementById("myeventsubprocess");

    // no input or output from the sub process
    assertThat(eventSubProcess.getIncoming().isEmpty());
    assertThat(eventSubProcess.getOutgoing().isEmpty());

    // subProcess was triggered by event
    assertThat(eventSubProcess.triggeredByEvent());

    // subProcess contains startEvent, sendTask and endEvent
    assertThat(eventSubProcess.getChildElementsByType(StartEvent.class)).isNotNull();
    assertThat(eventSubProcess.getChildElementsByType(UserTask.class)).isNotNull();
    assertThat(eventSubProcess.getChildElementsByType(EndEvent.class)).isNotNull();
  }

  @Test
  public void testCreateEventSubProcessError() {
    ProcessBuilder process = Bpmn.createProcess();
    modelInstance = process
      .startEvent()
      .sendTask()
      .endEvent()
      .done();

    EventSubProcessBuilder eventSubProcess = process.eventSubProcess();
    eventSubProcess
      .startEvent()
      .userTask()
      .endEvent();

    try {
      eventSubProcess.subProcessDone();
      fail("eventSubProcess has returned a builder after completion");
    } catch (BpmnModelException e) {
      assertThat(e).hasMessageContaining("Unable to find a parent subProcess.");

    }
  }

  @Test
  public void testSetIdAsDefaultNameForFlowElements() {
    BpmnModelInstance instance = Bpmn.createExecutableProcess("process")
        .startEvent("start")
        .userTask("user")
        .endEvent("end")
          .name("name")
        .done();

    String startName = ((FlowElement) instance.getModelElementById("start")).getName();
    assertEquals("start", startName);
    String userName = ((FlowElement) instance.getModelElementById("user")).getName();
    assertEquals("user", userName);
    String endName = ((FlowElement) instance.getModelElementById("end")).getName();
    assertEquals("name", endName);
  }

}
