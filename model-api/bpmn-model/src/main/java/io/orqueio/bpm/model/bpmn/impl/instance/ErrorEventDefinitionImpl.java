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
package io.orqueio.bpm.model.bpmn.impl.instance;

import io.orqueio.bpm.model.bpmn.instance.Error;
import io.orqueio.bpm.model.bpmn.instance.ErrorEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.EventDefinition;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.reference.AttributeReference;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN20_NS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ATTRIBUTE_ERROR_REF;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ELEMENT_ERROR_EVENT_DEFINITION;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_ERROR_CODE_VARIABLE;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_ERROR_MESSAGE_VARIABLE;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN errorEventDefinition element
 *
 * @author Sebastian Menski
 */
public class ErrorEventDefinitionImpl extends EventDefinitionImpl implements ErrorEventDefinition {

  protected static AttributeReference<Error> errorRefAttribute;

  protected static Attribute<String> orqueioErrorCodeVariableAttribute;

  protected static Attribute<String> orqueioErrorMessageVariableAttribute;
  
  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(ErrorEventDefinition.class, BPMN_ELEMENT_ERROR_EVENT_DEFINITION)
      .namespaceUri(BPMN20_NS)
      .extendsType(EventDefinition.class)
      .instanceProvider(new ModelTypeInstanceProvider<ErrorEventDefinition>() {
        public ErrorEventDefinition newInstance(ModelTypeInstanceContext instanceContext) {
          return new ErrorEventDefinitionImpl(instanceContext);
        }
      });

    errorRefAttribute = typeBuilder.stringAttribute(BPMN_ATTRIBUTE_ERROR_REF)
      .qNameAttributeReference(Error.class)
      .build();
    
    orqueioErrorCodeVariableAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_ERROR_CODE_VARIABLE)
        .namespace(ORQUEIO_NS)
        .build();

    orqueioErrorMessageVariableAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_ERROR_MESSAGE_VARIABLE)
      .namespace(ORQUEIO_NS)
      .build();
    
    typeBuilder.build();
  }

  public ErrorEventDefinitionImpl(ModelTypeInstanceContext context) {
    super(context);
  }

  public Error getError() {
    return errorRefAttribute.getReferenceTargetElement(this);
  }

  public void setError(Error error) {
    errorRefAttribute.setReferenceTargetElement(this, error);
  }

  @Override
  public void setOrqueioErrorCodeVariable(String orqueioErrorCodeVariable) {
    orqueioErrorCodeVariableAttribute.setValue(this, orqueioErrorCodeVariable);
  }

  @Override
  public String getOrqueioErrorCodeVariable() {
    return orqueioErrorCodeVariableAttribute.getValue(this);
  }

  @Override
  public void setOrqueioErrorMessageVariable(String orqueioErrorMessageVariable) {
    orqueioErrorMessageVariableAttribute.setValue(this, orqueioErrorMessageVariable);
  }

  @Override
  public String getOrqueioErrorMessageVariable() {
    return orqueioErrorMessageVariableAttribute.getValue(this);
  }
}
