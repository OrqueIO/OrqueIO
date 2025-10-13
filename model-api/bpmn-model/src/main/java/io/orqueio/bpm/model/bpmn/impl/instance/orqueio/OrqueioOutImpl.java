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

import io.orqueio.bpm.model.bpmn.impl.instance.BpmnModelElementInstanceImpl;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioOut;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.*;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN out orqueio extension element
 *
 * @author Sebastian Menski
 */
public class OrqueioOutImpl extends BpmnModelElementInstanceImpl implements OrqueioOut {

  protected static Attribute<String> orqueioSourceAttribute;
  protected static Attribute<String> orqueioSourceExpressionAttribute;
  protected static Attribute<String> orqueioVariablesAttribute;
  protected static Attribute<String> orqueioTargetAttribute;
  protected static Attribute<Boolean> orqueioLocalAttribute;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrqueioOut.class, CAMUNDA_ELEMENT_OUT)
      .namespaceUri(CAMUNDA_NS)
      .instanceProvider(new ModelTypeInstanceProvider<OrqueioOut>() {
        public OrqueioOut newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrqueioOutImpl(instanceContext);
        }
      });

    orqueioSourceAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_SOURCE)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioSourceExpressionAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_SOURCE_EXPRESSION)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioVariablesAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_VARIABLES)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioTargetAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_TARGET)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioLocalAttribute = typeBuilder.booleanAttribute(CAMUNDA_ATTRIBUTE_LOCAL)
      .namespace(CAMUNDA_NS)
      .build();

    typeBuilder.build();
  }

  public OrqueioOutImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getOrqueioSource() {
    return orqueioSourceAttribute.getValue(this);
  }

  public void setOrqueioSource(String orqueioSource) {
    orqueioSourceAttribute.setValue(this, orqueioSource);
  }

  public String getOrqueioSourceExpression() {
    return orqueioSourceExpressionAttribute.getValue(this);
  }

  public void setOrqueioSourceExpression(String orqueioSourceExpression) {
    orqueioSourceExpressionAttribute.setValue(this, orqueioSourceExpression);
  }

  public String getOrqueioVariables() {
    return orqueioVariablesAttribute.getValue(this);
  }

  public void setOrqueioVariables(String orqueioVariables) {
    orqueioVariablesAttribute.setValue(this, orqueioVariables);
  }

  public String getOrqueioTarget() {
    return orqueioTargetAttribute.getValue(this);
  }

  public void setOrqueioTarget(String orqueioTarget) {
    orqueioTargetAttribute.setValue(this, orqueioTarget);
  }

  public boolean getOrqueioLocal() {
    return orqueioLocalAttribute.getValue(this);
  }

  public void setOrqueioLocal(boolean orqueioLocal) {
    orqueioLocalAttribute.setValue(this, orqueioLocal);
  }

}
