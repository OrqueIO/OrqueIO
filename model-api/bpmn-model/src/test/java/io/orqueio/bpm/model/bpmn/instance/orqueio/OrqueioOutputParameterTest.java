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
package io.orqueio.bpm.model.bpmn.instance.orqueio;

import java.util.Arrays;
import java.util.Collection;
import io.orqueio.bpm.model.bpmn.instance.BpmnModelElementInstanceTest;
import org.junit.Ignore;
import org.junit.Test;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_NS;
import static org.junit.Assert.fail;

/**
 * @author Sebastian Menski
 */
public class OrqueioOutputParameterTest extends BpmnModelElementInstanceTest {

  public TypeAssumption getTypeAssumption() {
    return new TypeAssumption(CAMUNDA_NS, false);
  }

  public Collection<ChildElementAssumption> getChildElementAssumptions() {
    return null;
  }

  public Collection<AttributeAssumption> getAttributesAssumptions() {
    return Arrays.asList(
      new AttributeAssumption(CAMUNDA_NS, "name", false, true)
    );
  }

  @Ignore("Test ignored. CAM-9441: Bug fix needed")
  @Test
  public void testOutputParameterScriptChildAssignment() {
    try {
      OrqueioOutputParameter outputParamElement = modelInstance.newInstance(OrqueioOutputParameter.class);
      outputParamElement.setOrqueioName("aVariable");

      OrqueioScript scriptElement = modelInstance.newInstance(OrqueioScript.class);
      scriptElement.setOrqueioScriptFormat("juel");
      scriptElement.setTextContent("${'a script'}");

      outputParamElement.addChildElement(scriptElement);
    } catch (Exception e) {
      fail("OrqueioScript should be accepted as a child element of OrqueioOutputParameter. Error: " + e.getMessage());
    }
  }

  @Ignore("Test ignored. CAM-9441: Bug fix needed")
  @Test
  public void testOutputParameterListChildAssignment() {
    try {
      OrqueioOutputParameter outputParamElement = modelInstance.newInstance(OrqueioOutputParameter.class);
      outputParamElement.setOrqueioName("aVariable");

      OrqueioList listElement = modelInstance.newInstance(OrqueioList.class);

      outputParamElement.addChildElement(listElement);
    } catch (Exception e) {
      fail("OrqueioList should be accepted as a child element of OrqueioOutputParameter. Error: " + e.getMessage());
    }
  }

  @Ignore("Test ignored. CAM-9441: Bug fix needed")
  @Test
  public void testOutputParameterMapChildAssignment() {
    try {
      OrqueioOutputParameter outputParamElement = modelInstance.newInstance(OrqueioOutputParameter.class);
      outputParamElement.setOrqueioName("aVariable");

      OrqueioMap listElement = modelInstance.newInstance(OrqueioMap.class);

      outputParamElement.addChildElement(listElement);
    } catch (Exception e) {
      fail("OrqueioMap should be accepted as a child element of OrqueioOutputParameter. Error: " + e.getMessage());
    }
  }
}
