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

import java.util.Arrays;
import java.util.Collection;
import static org.assertj.core.api.Assertions.assertThat;
import io.orqueio.bpm.model.bpmn.BpmnTestConstants;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;
import static io.orqueio.bpm.model.xml.test.AbstractModelElementInstanceTest.modelInstance;
import org.junit.Test;

/**
 * @author Sebastian Menski
 */
public class ServiceTaskTest extends BpmnModelElementInstanceTest {

  public TypeAssumption getTypeAssumption() {
    return new TypeAssumption(Task.class, false);
  }

  public Collection<ChildElementAssumption> getChildElementAssumptions() {
    return null;
  }

  public Collection<AttributeAssumption> getAttributesAssumptions() {
    return Arrays.asList(
      new AttributeAssumption("implementation", false, false, "##WebService"),
      new AttributeAssumption("operationRef"),
      /** orqueio extensions */
      new AttributeAssumption(ORQUEIO_NS, "class"),
      new AttributeAssumption(ORQUEIO_NS, "delegateExpression"),
      new AttributeAssumption(ORQUEIO_NS, "expression"),
      new AttributeAssumption(ORQUEIO_NS, "resultVariable"),
      new AttributeAssumption(ORQUEIO_NS, "topic"),
      new AttributeAssumption(ORQUEIO_NS, "type"),
      new AttributeAssumption(ORQUEIO_NS, "taskPriority")
    );
  }
  
  
  @Test
  public void testOrqueioTaskPriority() {
    //given
    ServiceTask service = modelInstance.newInstance(ServiceTask.class);    
    assertThat(service.getOrqueioTaskPriority()).isNull();
    //when
    service.setOrqueioTaskPriority(BpmnTestConstants.TEST_PROCESS_TASK_PRIORITY);
    //then
    assertThat(service.getOrqueioTaskPriority()).isEqualTo(BpmnTestConstants.TEST_PROCESS_TASK_PRIORITY);    
  }
}
