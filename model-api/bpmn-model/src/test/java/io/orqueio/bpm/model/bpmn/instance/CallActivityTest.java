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
public class CallActivityTest extends BpmnModelElementInstanceTest {

  @Override
  public TypeAssumption getTypeAssumption() {
    return new TypeAssumption(Activity.class, false);
  }

  @Override
  public Collection<ChildElementAssumption> getChildElementAssumptions() {
    return null;
  }

  @Override
  public Collection<AttributeAssumption> getAttributesAssumptions() {
    return Arrays.asList(
      new AttributeAssumption("calledElement"),
      /** camunda extensions */
      new AttributeAssumption(ORQUEIO_NS, "async", false, false, false),
      new AttributeAssumption(ORQUEIO_NS, "calledElementBinding"),
      new AttributeAssumption(ORQUEIO_NS, "calledElementVersion"),
      new AttributeAssumption(ORQUEIO_NS, "calledElementVersionTag"),
      new AttributeAssumption(ORQUEIO_NS, "calledElementTenantId"),
      new AttributeAssumption(ORQUEIO_NS, "caseRef"),
      new AttributeAssumption(ORQUEIO_NS, "caseBinding"),
      new AttributeAssumption(ORQUEIO_NS, "caseVersion"),
      new AttributeAssumption(ORQUEIO_NS, "caseTenantId"),
      new AttributeAssumption(ORQUEIO_NS, "variableMappingClass"),
      new AttributeAssumption(ORQUEIO_NS, "variableMappingDelegateExpression")
    );
  }
}
