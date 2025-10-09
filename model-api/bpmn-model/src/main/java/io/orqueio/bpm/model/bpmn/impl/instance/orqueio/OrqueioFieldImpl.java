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
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioExpression;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioField;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioString;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.*;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN field orqueio extension element
 *
 * @author Sebastian Menski
 */
public class OrqueioFieldImpl extends BpmnModelElementInstanceImpl implements OrqueioField {

  protected static Attribute<String> orqueioNameAttribute;
  protected static Attribute<String> orqueioExpressionAttribute;
  protected static Attribute<String> orqueioStringValueAttribute;
  protected static ChildElement<OrqueioExpression> orqueioExpressionChild;
  protected static ChildElement<OrqueioString> orqueioStringChild;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrqueioField.class, CAMUNDA_ELEMENT_FIELD)
      .namespaceUri(CAMUNDA_NS)
      .instanceProvider(new ModelTypeInstanceProvider<OrqueioField>() {
        public OrqueioField newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrqueioFieldImpl(instanceContext);
        }
      });

    orqueioNameAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_NAME)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioExpressionAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_EXPRESSION)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioStringValueAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_STRING_VALUE)
      .namespace(CAMUNDA_NS)
      .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    orqueioExpressionChild = sequenceBuilder.element(OrqueioExpression.class)
      .build();

    orqueioStringChild = sequenceBuilder.element(OrqueioString.class)
      .build();

    typeBuilder.build();
  }

  public OrqueioFieldImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getOrqueioName() {
    return orqueioNameAttribute.getValue(this);
  }

  public void setOrqueioName(String orqueioName) {
    orqueioNameAttribute.setValue(this, orqueioName);
  }

  public String getOrqueioExpression() {
    return orqueioExpressionAttribute.getValue(this);
  }

  public void setOrqueioExpression(String orqueioExpression) {
    orqueioExpressionAttribute.setValue(this, orqueioExpression);
  }

  public String getOrqueioStringValue() {
    return orqueioStringValueAttribute.getValue(this);
  }

  public void setOrqueioStringValue(String orqueioStringValue) {
    orqueioStringValueAttribute.setValue(this, orqueioStringValue);
  }

  public OrqueioString getOrqueioString() {
    return orqueioStringChild.getChild(this);
  }

  public void setOrqueioString(OrqueioString orqueioString) {
    orqueioStringChild.setChild(this, orqueioString);
  }

  public OrqueioExpression getOrqueioExpressionChild() {
    return orqueioExpressionChild.getChild(this);
  }

  public void setOrqueioExpressionChild(OrqueioExpression orqueioExpression) {
    orqueioExpressionChild.setChild(this, orqueioExpression);
  }
}
