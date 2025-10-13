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

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_NAME;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ELEMENT_OUTPUT_PARAMETER;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_NS;

import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioOutputParameter;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;

/**
 * The BPMN outputParameter orqueio extension element
 *
 * @author Sebastian Menski
 */
public class OrqueioOutputParameterImpl extends OrqueioGenericValueElementImpl implements OrqueioOutputParameter {

  protected static Attribute<String> orqueioNameAttribute;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrqueioOutputParameter.class, CAMUNDA_ELEMENT_OUTPUT_PARAMETER)
      .namespaceUri(CAMUNDA_NS)
      .instanceProvider(new ModelTypeInstanceProvider<OrqueioOutputParameter>() {
        public OrqueioOutputParameter newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrqueioOutputParameterImpl(instanceContext);
        }
      });

    orqueioNameAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_NAME)
      .namespace(CAMUNDA_NS)
      .required()
      .build();

    typeBuilder.build();
  }

  public OrqueioOutputParameterImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getOrqueioName() {
    return orqueioNameAttribute.getValue(this);
  }

  public void setOrqueioName(String orqueioName) {
    orqueioNameAttribute.setValue(this, orqueioName);
  }
}
