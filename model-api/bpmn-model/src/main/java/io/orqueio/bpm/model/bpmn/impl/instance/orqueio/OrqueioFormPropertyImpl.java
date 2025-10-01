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
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioFormProperty;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioValue;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.ChildElementCollection;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

import java.util.Collection;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.*;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN formProperty orqueio extension element
 *
 * @author Sebastian Menski
 */
public class OrqueioFormPropertyImpl extends BpmnModelElementInstanceImpl implements OrqueioFormProperty {

  protected static Attribute<String> orqueioIdAttribute;
  protected static Attribute<String> orqueioNameAttribute;
  protected static Attribute<String> orqueioTypeAttribute;
  protected static Attribute<Boolean> orqueioRequiredAttribute;
  protected static Attribute<Boolean> orqueioReadableAttribute;
  protected static Attribute<Boolean> orqueioWriteableAttribute;
  protected static Attribute<String> orqueioVariableAttribute;
  protected static Attribute<String> orqueioExpressionAttribute;
  protected static Attribute<String> orqueioDatePatternAttribute;
  protected static Attribute<String> orqueioDefaultAttribute;
  protected static ChildElementCollection<OrqueioValue> orqueioValueCollection;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrqueioFormProperty.class, ORQUEIO_ELEMENT_FORM_PROPERTY)
      .namespaceUri(ORQUEIO_NS)
      .instanceProvider(new ModelTypeInstanceProvider<OrqueioFormProperty>() {
        public OrqueioFormProperty newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrqueioFormPropertyImpl(instanceContext);
        }
      });

    orqueioIdAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_ID)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioNameAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_NAME)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioTypeAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_TYPE)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioRequiredAttribute = typeBuilder.booleanAttribute(ORQUEIO_ATTRIBUTE_REQUIRED)
      .namespace(ORQUEIO_NS)
      .defaultValue(false)
      .build();

    orqueioReadableAttribute = typeBuilder.booleanAttribute(ORQUEIO_ATTRIBUTE_READABLE)
      .namespace(ORQUEIO_NS)
      .defaultValue(true)
      .build();

    orqueioWriteableAttribute = typeBuilder.booleanAttribute(ORQUEIO_ATTRIBUTE_WRITEABLE)
      .namespace(ORQUEIO_NS)
      .defaultValue(true)
      .build();

    orqueioVariableAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_VARIABLE)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioExpressionAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_EXPRESSION)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioDatePatternAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_DATE_PATTERN)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioDefaultAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_DEFAULT)
      .namespace(ORQUEIO_NS)
      .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    orqueioValueCollection = sequenceBuilder.elementCollection(OrqueioValue.class)
      .build();

    typeBuilder.build();
  }

  public OrqueioFormPropertyImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getOrqueioId() {
    return orqueioIdAttribute.getValue(this);
  }

  public void setOrqueioId(String orqueioId) {
    orqueioIdAttribute.setValue(this, orqueioId);
  }

  public String getOrqueioName() {
    return orqueioNameAttribute.getValue(this);
  }

  public void setOrqueioName(String orqueioName) {
    orqueioNameAttribute.setValue(this, orqueioName);
  }

  public String getOrqueioType() {
    return orqueioTypeAttribute.getValue(this);
  }

  public void setOrqueioType(String orqueioType) {
    orqueioTypeAttribute.setValue(this, orqueioType);
  }

  public boolean isOrqueioRequired() {
    return orqueioRequiredAttribute.getValue(this);
  }

  public void setOrqueioRequired(boolean isOrqueioRequired) {
    orqueioRequiredAttribute.setValue(this, isOrqueioRequired);
  }

  public boolean isOrqueioReadable() {
    return orqueioReadableAttribute.getValue(this);
  }

  public void setOrqueioReadable(boolean isOrqueioReadable) {
    orqueioReadableAttribute.setValue(this, isOrqueioReadable);
  }

  public boolean isOrqueioWriteable() {
    return orqueioWriteableAttribute.getValue(this);
  }

  public void setOrqueioWriteable(boolean isOrqueioWriteable) {
    orqueioWriteableAttribute.setValue(this, isOrqueioWriteable);
  }

  public String getOrqueioVariable() {
    return orqueioVariableAttribute.getValue(this);
  }

  public void setOrqueioVariable(String orqueioVariable) {
    orqueioVariableAttribute.setValue(this, orqueioVariable);
  }

  public String getOrqueioExpression() {
    return orqueioExpressionAttribute.getValue(this);
  }

  public void setOrqueioExpression(String orqueioExpression) {
    orqueioExpressionAttribute.setValue(this, orqueioExpression);
  }

  public String getOrqueioDatePattern() {
    return orqueioDatePatternAttribute.getValue(this);
  }

  public void setOrqueioDatePattern(String orqueioDatePattern) {
    orqueioDatePatternAttribute.setValue(this, orqueioDatePattern);
  }

  public String getOrqueioDefault() {
    return orqueioDefaultAttribute.getValue(this);
  }

  public void setOrqueioDefault(String orqueioDefault) {
    orqueioDefaultAttribute.setValue(this, orqueioDefault);
  }

  public Collection<OrqueioValue> getOrqueioValues() {
    return orqueioValueCollection.get(this);
  }
}
