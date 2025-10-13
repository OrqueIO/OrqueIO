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

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN20_NS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ATTRIBUTE_CALLED_ELEMENT;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ELEMENT_CALL_ACTIVITY;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_ASYNC;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_CALLED_ELEMENT_BINDING;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_CALLED_ELEMENT_TENANT_ID;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_CALLED_ELEMENT_VERSION;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_CALLED_ELEMENT_VERSION_TAG;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_CASE_BINDING;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_CASE_REF;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_CASE_TENANT_ID;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_CASE_VERSION;

import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.builder.CallActivityBuilder;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_VARIABLE_MAPPING_CLASS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_VARIABLE_MAPPING_DELEGATE_EXPRESSION;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_NS;
import io.orqueio.bpm.model.bpmn.instance.Activity;
import io.orqueio.bpm.model.bpmn.instance.CallActivity;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;

/**
 * The BPMN callActivity element
 *
 * @author Sebastian Menski
 */
public class CallActivityImpl extends ActivityImpl implements CallActivity {

  protected static Attribute<String> calledElementAttribute;


  /** orqueio extensions */

  protected static Attribute<Boolean> orqueioAsyncAttribute;
  protected static Attribute<String> orqueioCalledElementBindingAttribute;
  protected static Attribute<String> orqueioCalledElementVersionAttribute;
  protected static Attribute<String> orqueioCalledElementVersionTagAttribute;
  protected static Attribute<String> orqueioCalledElementTenantIdAttribute;

  protected static Attribute<String> orqueioCaseRefAttribute;
  protected static Attribute<String> orqueioCaseBindingAttribute;
  protected static Attribute<String> orqueioCaseVersionAttribute;
  protected static Attribute<String> orqueioCaseTenantIdAttribute;
  protected static Attribute<String> orqueioVariableMappingClassAttribute;
  protected static Attribute<String> orqueioVariableMappingDelegateExpressionAttribute;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(CallActivity.class, BPMN_ELEMENT_CALL_ACTIVITY)
      .namespaceUri(BPMN20_NS)
      .extendsType(Activity.class)
      .instanceProvider(new ModelTypeInstanceProvider<CallActivity>() {
        public CallActivity newInstance(ModelTypeInstanceContext instanceContext) {
          return new CallActivityImpl(instanceContext);
        }
      });

    calledElementAttribute = typeBuilder.stringAttribute(BPMN_ATTRIBUTE_CALLED_ELEMENT)
      .build();

    /** orqueio extensions */

    orqueioAsyncAttribute = typeBuilder.booleanAttribute(CAMUNDA_ATTRIBUTE_ASYNC)
      .namespace(CAMUNDA_NS)
      .defaultValue(false)
      .build();

    orqueioCalledElementBindingAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_CALLED_ELEMENT_BINDING)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioCalledElementVersionAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_CALLED_ELEMENT_VERSION)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioCalledElementVersionTagAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_CALLED_ELEMENT_VERSION_TAG)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioCaseRefAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_CASE_REF)
       .namespace(CAMUNDA_NS)
       .build();

    orqueioCaseBindingAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_CASE_BINDING)
        .namespace(CAMUNDA_NS)
        .build();

    orqueioCaseVersionAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_CASE_VERSION)
        .namespace(CAMUNDA_NS)
        .build();

    orqueioCalledElementTenantIdAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_CALLED_ELEMENT_TENANT_ID)
        .namespace(CAMUNDA_NS)
        .build();

    orqueioCaseTenantIdAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_CASE_TENANT_ID)
        .namespace(CAMUNDA_NS)
        .build();

    orqueioVariableMappingClassAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_VARIABLE_MAPPING_CLASS)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioVariableMappingDelegateExpressionAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_VARIABLE_MAPPING_DELEGATE_EXPRESSION)
      .namespace(CAMUNDA_NS)
      .build();


    typeBuilder.build();
  }

  public CallActivityImpl(ModelTypeInstanceContext context) {
    super(context);
  }

  @Override
  public CallActivityBuilder builder() {
    return new CallActivityBuilder((BpmnModelInstance) modelInstance, this);
  }

  public String getCalledElement() {
    return calledElementAttribute.getValue(this);
  }

  public void setCalledElement(String calledElement) {
    calledElementAttribute.setValue(this, calledElement);
  }

  /**
   * @deprecated use isOrqueioAsyncBefore() instead.
   */
  @Deprecated
  public boolean isOrqueioAsync() {
    return orqueioAsyncAttribute.getValue(this);
  }

  /**
   * @deprecated use setOrqueioAsyncBefore() instead.
   */
  @Deprecated
  public void setOrqueioAsync(boolean isOrqueioAsync) {
    orqueioAsyncAttribute.setValue(this, isOrqueioAsync);
  }

  public String getOrqueioCalledElementBinding() {
    return orqueioCalledElementBindingAttribute.getValue(this);
  }

  public void setOrqueioCalledElementBinding(String orqueioCalledElementBinding) {
    orqueioCalledElementBindingAttribute.setValue(this, orqueioCalledElementBinding);
  }

  public String getOrqueioCalledElementVersion() {
    return orqueioCalledElementVersionAttribute.getValue(this);
  }

  public void setOrqueioCalledElementVersion(String orqueioCalledElementVersion) {
    orqueioCalledElementVersionAttribute.setValue(this, orqueioCalledElementVersion);
  }

  public String getOrqueioCalledElementVersionTag() {
    return orqueioCalledElementVersionTagAttribute.getValue(this);
  }

  public void setOrqueioCalledElementVersionTag(String orqueioCalledElementVersionTag) {
    orqueioCalledElementVersionTagAttribute.setValue(this, orqueioCalledElementVersionTag);
  }

  public String getOrqueioCaseRef() {
    return orqueioCaseRefAttribute.getValue(this);
  }

  public void setOrqueioCaseRef(String orqueioCaseRef) {
    orqueioCaseRefAttribute.setValue(this, orqueioCaseRef);
  }

  public String getOrqueioCaseBinding() {
    return orqueioCaseBindingAttribute.getValue(this);
  }

  public void setOrqueioCaseBinding(String orqueioCaseBinding) {
    orqueioCaseBindingAttribute.setValue(this, orqueioCaseBinding);
  }

  public String getOrqueioCaseVersion() {
    return orqueioCaseVersionAttribute.getValue(this);
  }

  public void setOrqueioCaseVersion(String orqueioCaseVersion) {
    orqueioCaseVersionAttribute.setValue(this, orqueioCaseVersion);
  }

  public String getOrqueioCalledElementTenantId() {
    return orqueioCalledElementTenantIdAttribute.getValue(this);
  }

  public void setOrqueioCalledElementTenantId(String tenantId) {
    orqueioCalledElementTenantIdAttribute.setValue(this, tenantId);
  }

  public String getOrqueioCaseTenantId() {
    return orqueioCaseTenantIdAttribute.getValue(this);
  }

  public void setOrqueioCaseTenantId(String tenantId) {
    orqueioCaseTenantIdAttribute.setValue(this, tenantId);
  }

  @Override
  public String getOrqueioVariableMappingClass() {
    return orqueioVariableMappingClassAttribute.getValue(this);
  }

  @Override
  public void setOrqueioVariableMappingClass(String orqueioClass) {
    orqueioVariableMappingClassAttribute.setValue(this, orqueioClass);
  }

  @Override
  public String getOrqueioVariableMappingDelegateExpression() {
    return orqueioVariableMappingDelegateExpressionAttribute.getValue(this);
  }

  @Override
  public void setOrqueioVariableMappingDelegateExpression(String orqueioExpression) {
    orqueioVariableMappingDelegateExpressionAttribute.setValue(this, orqueioExpression);
  }
}
