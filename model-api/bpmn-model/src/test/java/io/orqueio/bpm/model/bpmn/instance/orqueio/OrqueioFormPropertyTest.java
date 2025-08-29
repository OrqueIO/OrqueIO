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
package io.orqueio.bpm.model.bpmn.instance.orqueio;

import io.orqueio.bpm.model.bpmn.instance.BpmnModelElementInstanceTest;

import java.util.Arrays;
import java.util.Collection;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;

/**
 * @author Sebastian Menski
 */
public class OrqueioFormPropertyTest extends BpmnModelElementInstanceTest {

  public TypeAssumption getTypeAssumption() {
    return new TypeAssumption(ORQUEIO_NS, false);
  }

  public Collection<ChildElementAssumption> getChildElementAssumptions() {
    return Arrays.asList(
      new ChildElementAssumption(ORQUEIO_NS, OrqueioValue.class)
    );
  }

  public Collection<AttributeAssumption> getAttributesAssumptions() {
    return Arrays.asList(
      new AttributeAssumption(ORQUEIO_NS, "id"),
      new AttributeAssumption(ORQUEIO_NS, "name"),
      new AttributeAssumption(ORQUEIO_NS, "type"),
      new AttributeAssumption(ORQUEIO_NS, "required", false, false, false),
      new AttributeAssumption(ORQUEIO_NS, "readable", false, false, true),
      new AttributeAssumption(ORQUEIO_NS, "writeable", false, false, true),
      new AttributeAssumption(ORQUEIO_NS, "variable"),
      new AttributeAssumption(ORQUEIO_NS, "expression"),
      new AttributeAssumption(ORQUEIO_NS, "datePattern"),
      new AttributeAssumption(ORQUEIO_NS, "default")
    );
  }
}
