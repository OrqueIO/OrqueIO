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
package io.orqueio.bpm.model.bpmn.impl.instance.orqueio;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ELEMENT_CONNECTOR;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;

import io.orqueio.bpm.model.bpmn.impl.instance.BpmnModelElementInstanceImpl;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioConnector;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioConnectorId;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioInputOutput;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

/**
 * The BPMN connector orqueio extension element
 *
 * @author Sebastian Menski
 */
public class OrqueioConnectorImpl extends BpmnModelElementInstanceImpl implements OrqueioConnector {

  protected static ChildElement<OrqueioConnectorId> orqueioConnectorIdChild;
  protected static ChildElement<OrqueioInputOutput> orqueioInputOutputChild;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrqueioConnector.class, ORQUEIO_ELEMENT_CONNECTOR)
      .namespaceUri(ORQUEIO_NS)
      .instanceProvider(new ModelTypeInstanceProvider<OrqueioConnector>() {
        public OrqueioConnector newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrqueioConnectorImpl(instanceContext);
        }
      });

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    orqueioConnectorIdChild = sequenceBuilder.element(OrqueioConnectorId.class)
      .required()
      .build();

    orqueioInputOutputChild = sequenceBuilder.element(OrqueioInputOutput.class)
      .build();

    typeBuilder.build();
  }

  public OrqueioConnectorImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public OrqueioConnectorId getOrqueioConnectorId() {
    return orqueioConnectorIdChild.getChild(this);
  }

  public void setOrqueioConnectorId(OrqueioConnectorId orqueioConnectorId) {
    orqueioConnectorIdChild.setChild(this, orqueioConnectorId);
  }

  public OrqueioInputOutput getOrqueioInputOutput() {
    return orqueioInputOutputChild.getChild(this);
  }

  public void setOrqueioInputOutput(OrqueioInputOutput orqueioInputOutput) {
    orqueioInputOutputChild.setChild(this, orqueioInputOutput);
  }

}
