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
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioFormField;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioProperties;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioValidation;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioValue;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.ChildElementCollection;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

import java.util.Collection;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.*;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN formField orqueio extension element
 *
 * @author Sebastian Menski
 */
public class OrqueioFormFieldImpl extends BpmnModelElementInstanceImpl implements OrqueioFormField {

  protected static Attribute<String> orqueioIdAttribute;
  protected static Attribute<String> orqueioLabelAttribute;
  protected static Attribute<String> orqueioTypeAttribute;
  protected static Attribute<String> orqueioDatePatternAttribute;
  protected static Attribute<String> orqueioDefaultValueAttribute;
  protected static ChildElement<OrqueioProperties> orqueioPropertiesChild;
  protected static ChildElement<OrqueioValidation> orqueioValidationChild;
  protected static ChildElementCollection<OrqueioValue> orqueioValueCollection;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrqueioFormField.class, ORQUEIO_ELEMENT_FORM_FIELD)
      .namespaceUri(ORQUEIO_NS)
      .instanceProvider(new ModelTypeInstanceProvider<OrqueioFormField>() {
        public OrqueioFormField newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrqueioFormFieldImpl(instanceContext);
        }
      });

    orqueioIdAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_ID)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioLabelAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_LABEL)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioTypeAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_TYPE)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioDatePatternAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_DATE_PATTERN)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioDefaultValueAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_DEFAULT_VALUE)
      .namespace(ORQUEIO_NS)
      .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    orqueioPropertiesChild = sequenceBuilder.element(OrqueioProperties.class)
      .build();

    orqueioValidationChild = sequenceBuilder.element(OrqueioValidation.class)
      .build();

    orqueioValueCollection = sequenceBuilder.elementCollection(OrqueioValue.class)
      .build();

    typeBuilder.build();
  }

  public OrqueioFormFieldImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getOrqueioId() {
    return orqueioIdAttribute.getValue(this);
  }

  public void setOrqueioId(String orqueioId) {
    orqueioIdAttribute.setValue(this, orqueioId);
  }

  public String getOrqueioLabel() {
    return orqueioLabelAttribute.getValue(this);
  }

  public void setOrqueioLabel(String orqueioLabel) {
    orqueioLabelAttribute.setValue(this, orqueioLabel);
  }

  public String getOrqueioType() {
    return orqueioTypeAttribute.getValue(this);
  }

  public void setOrqueioType(String orqueioType) {
    orqueioTypeAttribute.setValue(this, orqueioType);
  }

  public String getOrqueioDatePattern() {
    return orqueioDatePatternAttribute.getValue(this);
  }

  public void setOrqueioDatePattern(String orqueioDatePattern) {
    orqueioDatePatternAttribute.setValue(this, orqueioDatePattern);
  }

  public String getOrqueioDefaultValue() {
    return orqueioDefaultValueAttribute.getValue(this);
  }

  public void setOrqueioDefaultValue(String orqueioDefaultValue) {
    orqueioDefaultValueAttribute.setValue(this, orqueioDefaultValue);
  }

  public OrqueioProperties getOrqueioProperties() {
    return orqueioPropertiesChild.getChild(this);
  }

  public void setOrqueioProperties(OrqueioProperties orqueioProperties) {
    orqueioPropertiesChild.setChild(this, orqueioProperties);
  }

  public OrqueioValidation getOrqueioValidation() {
    return orqueioValidationChild.getChild(this);
  }

  public void setOrqueioValidation(OrqueioValidation orqueioValidation) {
    orqueioValidationChild.setChild(this, orqueioValidation);
  }

  public Collection<OrqueioValue> getOrqueioValues() {
    return orqueioValueCollection.get(this);
  }
}
