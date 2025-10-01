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

import io.orqueio.bpm.model.bpmn.impl.instance.ErrorEventDefinitionImpl;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioErrorEventDefinition;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_EXPRESSION;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ELEMENT_ERROR_EVENT_DEFINITION;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

public class OrqueioErrorEventDefinitionImpl extends ErrorEventDefinitionImpl implements OrqueioErrorEventDefinition {

  protected static Attribute<String> orqueioExpressionAttribute;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrqueioErrorEventDefinition.class, ORQUEIO_ELEMENT_ERROR_EVENT_DEFINITION)
      .namespaceUri(ORQUEIO_NS)
      .instanceProvider(new ModelTypeInstanceProvider<OrqueioErrorEventDefinition>() {
        public OrqueioErrorEventDefinition newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrqueioErrorEventDefinitionImpl(instanceContext);
        }
      });

    orqueioExpressionAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_EXPRESSION)
        .namespace(ORQUEIO_NS)
        .build();

    typeBuilder.build();
  }

  public OrqueioErrorEventDefinitionImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getOrqueioExpression() {
    return orqueioExpressionAttribute.getValue(this);
  }

  public void setOrqueioExpression(String orqueioExpression) {
    orqueioExpressionAttribute.setValue(this, orqueioExpression);
  }
}
