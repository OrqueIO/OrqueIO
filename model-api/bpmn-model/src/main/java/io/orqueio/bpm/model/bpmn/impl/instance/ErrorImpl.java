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
package io.orqueio.bpm.model.bpmn.impl.instance;

import io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants;
import io.orqueio.bpm.model.bpmn.instance.Error;
import io.orqueio.bpm.model.bpmn.instance.ItemDefinition;
import io.orqueio.bpm.model.bpmn.instance.RootElement;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.reference.AttributeReference;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.*;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * @author Sebastian Menski
 */
public class ErrorImpl extends RootElementImpl implements Error {

  protected static Attribute<String> nameAttribute;
  protected static Attribute<String> errorCodeAttribute;
  protected static Attribute<String> orqueioErrorMessageAttribute;
  
  protected static AttributeReference<ItemDefinition> structureRefAttribute;
  
  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(Error.class, BPMN_ELEMENT_ERROR)
      .namespaceUri(BpmnModelConstants.BPMN20_NS)
      .extendsType(RootElement.class)
      .instanceProvider(new ModelTypeInstanceProvider<Error>() {
        public Error newInstance(ModelTypeInstanceContext instanceContext) {
          return new ErrorImpl(instanceContext);
        }
      });

    nameAttribute = typeBuilder.stringAttribute(BPMN_ATTRIBUTE_NAME)
      .build();

    errorCodeAttribute = typeBuilder.stringAttribute(BPMN_ATTRIBUTE_ERROR_CODE)
      .build();

    orqueioErrorMessageAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_ERROR_MESSAGE).namespace(ORQUEIO_NS)
        .build();

    structureRefAttribute = typeBuilder.stringAttribute(BPMN_ATTRIBUTE_STRUCTURE_REF)
      .qNameAttributeReference(ItemDefinition.class)
      .build();
  
    typeBuilder.build();
  }

  public ErrorImpl(ModelTypeInstanceContext context) {
    super(context);
  }

  public String getName() {
    return nameAttribute.getValue(this);
  }

  public void setName(String name) {
    nameAttribute.setValue(this, name);
  }

  public String getErrorCode() {
    return errorCodeAttribute.getValue(this);
  }

  public void setErrorCode(String errorCode) {
    errorCodeAttribute.setValue(this, errorCode);
  }

  public String getOrqueioErrorMessage() {
    return orqueioErrorMessageAttribute.getValue(this);
  }

  public void setOrqueioErrorMessage(String orqueioErrorMessage) {
    orqueioErrorMessageAttribute.setValue(this, orqueioErrorMessage);
  }

  public ItemDefinition getStructure() {
    return structureRefAttribute.getReferenceTargetElement(this);
  }

  public void setStructure(ItemDefinition structure) {
    structureRefAttribute.setReferenceTargetElement(this, structure);
  }
}
