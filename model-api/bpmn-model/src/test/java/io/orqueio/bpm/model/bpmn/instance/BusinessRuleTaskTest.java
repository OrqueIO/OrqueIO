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
package io.orqueio.bpm.model.bpmn.instance;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;

import java.util.Arrays;
import java.util.Collection;

/**
 * @author Sebastian Menski
 */
public class BusinessRuleTaskTest extends BpmnModelElementInstanceTest {

  @Override
  public TypeAssumption getTypeAssumption() {
    return new TypeAssumption(Task.class, false);
  }

  @Override
  public Collection<ChildElementAssumption> getChildElementAssumptions() {
    return null;
  }

  @Override
  public Collection<AttributeAssumption> getAttributesAssumptions() {
    return Arrays.asList(
      new AttributeAssumption("implementation", false, false, "##unspecified"),
      /** camunda extensions */
      new AttributeAssumption(ORQUEIO_NS, "class"),
      new AttributeAssumption(ORQUEIO_NS, "delegateExpression"),
      new AttributeAssumption(ORQUEIO_NS, "expression"),
      new AttributeAssumption(ORQUEIO_NS, "resultVariable"),
      new AttributeAssumption(ORQUEIO_NS, "topic"),
      new AttributeAssumption(ORQUEIO_NS, "type"),
      new AttributeAssumption(ORQUEIO_NS, "decisionRef"),
      new AttributeAssumption(ORQUEIO_NS, "decisionRefBinding"),
      new AttributeAssumption(ORQUEIO_NS, "decisionRefVersion"),
      new AttributeAssumption(ORQUEIO_NS, "decisionRefVersionTag"),
      new AttributeAssumption(ORQUEIO_NS, "decisionRefTenantId"),
      new AttributeAssumption(ORQUEIO_NS, "mapDecisionResult"),
      new AttributeAssumption(ORQUEIO_NS, "taskPriority")
    );
  }

}
