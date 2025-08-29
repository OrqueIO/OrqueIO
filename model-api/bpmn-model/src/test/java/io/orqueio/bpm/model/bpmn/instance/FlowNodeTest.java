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
package io.orqueio.bpm.model.bpmn.instance;

import io.orqueio.bpm.model.bpmn.Bpmn;
import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.impl.instance.Incoming;
import io.orqueio.bpm.model.bpmn.impl.instance.Outgoing;
import org.junit.Test;

import java.util.Arrays;
import java.util.Collection;

import static org.assertj.core.api.Assertions.assertThat;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;

/**
 * @author Sebastian Menski
 */
public class FlowNodeTest extends BpmnModelElementInstanceTest {

  public TypeAssumption getTypeAssumption() {
    return new TypeAssumption(FlowElement.class, true);
  }

  public Collection<ChildElementAssumption> getChildElementAssumptions() {
    return Arrays.asList(
      new ChildElementAssumption(Incoming.class),
      new ChildElementAssumption(Outgoing.class)
    );
  }

  public Collection<AttributeAssumption> getAttributesAssumptions() {
    return Arrays.asList(
      new AttributeAssumption(ORQUEIO_NS, "asyncAfter", false, false, false),
      new AttributeAssumption(ORQUEIO_NS, "asyncBefore", false, false, false),
      new AttributeAssumption(ORQUEIO_NS, "exclusive", false, false, true),
      new AttributeAssumption(ORQUEIO_NS, "jobPriority")
    );
  }

  @Test
  public void testUpdateIncomingOutgoingChildElements() {
    BpmnModelInstance modelInstance = Bpmn.createProcess()
      .startEvent()
      .userTask("test")
      .endEvent()
      .done();

    // save current incoming and outgoing sequence flows
    UserTask userTask = modelInstance.getModelElementById("test");
    Collection<SequenceFlow> incoming = userTask.getIncoming();
    Collection<SequenceFlow> outgoing = userTask.getOutgoing();

    // create a new service task
    ServiceTask serviceTask = modelInstance.newInstance(ServiceTask.class);
    serviceTask.setId("new");

    // replace the user task with the new service task
    userTask.replaceWithElement(serviceTask);

    // assert that the new service task has the same incoming and outgoing sequence flows
    assertThat(serviceTask.getIncoming()).containsExactlyElementsOf(incoming);
    assertThat(serviceTask.getOutgoing()).containsExactlyElementsOf(outgoing);
  }

  @Test
    public void testOrqueioAsyncBefore() {
    Task task = modelInstance.newInstance(Task.class);
    assertThat(task.isOrqueioAsyncBefore()).isFalse();

    task.setOrqueioAsyncBefore(true);
    assertThat(task.isOrqueioAsyncBefore()).isTrue();
  }

  @Test
  public void testOrqueioAsyncAfter() {
    Task task = modelInstance.newInstance(Task.class);
    assertThat(task.isOrqueioAsyncAfter()).isFalse();

    task.setOrqueioAsyncAfter(true);
    assertThat(task.isOrqueioAsyncAfter()).isTrue();
  }

  @Test
  public void testOrqueioAsyncAfterAndBefore() {
    Task task = modelInstance.newInstance(Task.class);

    assertThat(task.isOrqueioAsyncAfter()).isFalse();
    assertThat(task.isOrqueioAsyncBefore()).isFalse();

    task.setOrqueioAsyncBefore(true);

    assertThat(task.isOrqueioAsyncAfter()).isFalse();
    assertThat(task.isOrqueioAsyncBefore()).isTrue();

    task.setOrqueioAsyncAfter(true);

    assertThat(task.isOrqueioAsyncAfter()).isTrue();
    assertThat(task.isOrqueioAsyncBefore()).isTrue();

    task.setOrqueioAsyncBefore(false);

    assertThat(task.isOrqueioAsyncAfter()).isTrue();
    assertThat(task.isOrqueioAsyncBefore()).isFalse();
  }

  @Test
  public void testOrqueioExclusive() {
    Task task = modelInstance.newInstance(Task.class);

    assertThat(task.isOrqueioExclusive()).isTrue();

    task.setOrqueioExclusive(false);

    assertThat(task.isOrqueioExclusive()).isFalse();
  }

  @Test
  public void testOrqueioJobPriority() {
    Task task = modelInstance.newInstance(Task.class);
    assertThat(task.getOrqueioJobPriority()).isNull();

    task.setOrqueioJobPriority("15");

    assertThat(task.getOrqueioJobPriority()).isEqualTo("15");
  }
}
