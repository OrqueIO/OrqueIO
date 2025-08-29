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

import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.instance.Event;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioInputOutput;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioInputParameter;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioOutputParameter;

/**
 * @author Sebastian Menski
 */
public abstract class AbstractEventBuilder<B extends  AbstractEventBuilder<B, E>, E extends Event> extends AbstractFlowNodeBuilder<B, E> {

  protected AbstractEventBuilder(BpmnModelInstance modelInstance, E element, Class<?> selfType) {
    super(modelInstance, element, selfType);
  }

  /**
   * Creates a new orqueio input parameter extension element with the
   * given name and value.
   *
   * @param name the name of the input parameter
   * @param value the value of the input parameter
   * @return the builder object
   */
  public B orqueioInputParameter(String name, String value) {
    OrqueioInputOutput orqueioInputOutput = getCreateSingleExtensionElement(OrqueioInputOutput.class);

    OrqueioInputParameter orqueioInputParameter = createChild(orqueioInputOutput, OrqueioInputParameter.class);
    orqueioInputParameter.setOrqueioName(name);
    orqueioInputParameter.setTextContent(value);

    return myself;
  }

  /**
   * Creates a new orqueio output parameter extension element with the
   * given name and value.
   *
   * @param name the name of the output parameter
   * @param value the value of the output parameter
   * @return the builder object
   */
  public B orqueioOutputParameter(String name, String value) {
    OrqueioInputOutput orqueioInputOutput = getCreateSingleExtensionElement(OrqueioInputOutput.class);

    OrqueioOutputParameter orqueioOutputParameter = createChild(orqueioInputOutput, OrqueioOutputParameter.class);
    orqueioOutputParameter.setOrqueioName(name);
    orqueioOutputParameter.setTextContent(value);

    return myself;
  }

}
