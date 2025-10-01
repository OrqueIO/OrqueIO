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
package io.orqueio.bpm.model.bpmn.impl.instance.orqueio;

import java.util.Collection;
import io.orqueio.bpm.model.bpmn.impl.instance.BpmnModelElementInstanceImpl;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioInputOutput;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioInputParameter;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioOutputParameter;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.child.ChildElementCollection;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ELEMENT_INPUT_OUTPUT;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;

/**
 * The BPMN inputOutput orqueio extension element
 *
 * @author Sebastian Menski
 */
public class OrqueioInputOutputImpl extends BpmnModelElementInstanceImpl implements OrqueioInputOutput {

  protected static ChildElementCollection<OrqueioInputParameter> orqueioInputParameterCollection;
  protected static ChildElementCollection<OrqueioOutputParameter> orqueioOutputParameterCollection;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrqueioInputOutput.class, ORQUEIO_ELEMENT_INPUT_OUTPUT)
      .namespaceUri(ORQUEIO_NS)
      .instanceProvider(new ModelTypeInstanceProvider<OrqueioInputOutput>() {
        public OrqueioInputOutput newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrqueioInputOutputImpl(instanceContext);
        }
      });

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    orqueioInputParameterCollection = sequenceBuilder.elementCollection(OrqueioInputParameter.class)
      .build();

    orqueioOutputParameterCollection = sequenceBuilder.elementCollection(OrqueioOutputParameter.class)
      .build();

    typeBuilder.build();
  }

  public OrqueioInputOutputImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public Collection<OrqueioInputParameter> getOrqueioInputParameters() {
    return orqueioInputParameterCollection.get(this);
  }

  public Collection<OrqueioOutputParameter> getOrqueioOutputParameters() {
    return orqueioOutputParameterCollection.get(this);
  }
}
