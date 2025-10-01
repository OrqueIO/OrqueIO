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
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ATTRIBUTE_IMPLEMENTATION;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ELEMENT_BUSINESS_RULE_TASK;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_CLASS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_DECISION_REF;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_DECISION_REF_BINDING;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_DECISION_REF_VERSION;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_DELEGATE_EXPRESSION;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.*;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_MAP_DECISION_RESULT;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_RESULT_VARIABLE;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_TOPIC;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_TYPE;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;

import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.builder.BusinessRuleTaskBuilder;
import io.orqueio.bpm.model.bpmn.instance.BusinessRuleTask;
import io.orqueio.bpm.model.bpmn.instance.Rendering;
import io.orqueio.bpm.model.bpmn.instance.Task;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.ChildElementCollection;

/**
 * The BPMN businessRuleTask element
 *
 * @author Sebastian Menski
 */
public class BusinessRuleTaskImpl extends TaskImpl implements BusinessRuleTask {

  protected static Attribute<String> implementationAttribute;
  protected static ChildElementCollection<Rendering> renderingCollection;

  /** orqueio extensions */

  protected static Attribute<String> orqueioClassAttribute;
  protected static Attribute<String> orqueioDelegateExpressionAttribute;
  protected static Attribute<String> orqueioExpressionAttribute;
  protected static Attribute<String> orqueioResultVariableAttribute;
  protected static Attribute<String> orqueioTopicAttribute;
  protected static Attribute<String> orqueioTypeAttribute;
  protected static Attribute<String> orqueioDecisionRefAttribute;
  protected static Attribute<String> orqueioDecisionRefBindingAttribute;
  protected static Attribute<String> orqueioDecisionRefVersionAttribute;
  protected static Attribute<String> orqueioDecisionRefVersionTagAttribute;
  protected static Attribute<String> orqueioDecisionRefTenantIdAttribute;
  protected static Attribute<String> orqueioMapDecisionResultAttribute;
  protected static Attribute<String> orqueioTaskPriorityAttribute;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(BusinessRuleTask.class, BPMN_ELEMENT_BUSINESS_RULE_TASK)
      .namespaceUri(BPMN20_NS)
      .extendsType(Task.class)
      .instanceProvider(new ModelTypeInstanceProvider<BusinessRuleTask>() {
        public BusinessRuleTask newInstance(ModelTypeInstanceContext instanceContext) {
          return new BusinessRuleTaskImpl(instanceContext);
        }
      });

    implementationAttribute = typeBuilder.stringAttribute(BPMN_ATTRIBUTE_IMPLEMENTATION)
      .defaultValue("##unspecified")
      .build();

    /** orqueio extensions */

    orqueioClassAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_CLASS)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioDelegateExpressionAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_DELEGATE_EXPRESSION)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioExpressionAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_EXPRESSION)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioResultVariableAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_RESULT_VARIABLE)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioTopicAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_TOPIC)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioTypeAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_TYPE)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioDecisionRefAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_DECISION_REF)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioDecisionRefBindingAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_DECISION_REF_BINDING)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioDecisionRefVersionAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_DECISION_REF_VERSION)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioDecisionRefVersionTagAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_DECISION_REF_VERSION_TAG)
        .namespace(ORQUEIO_NS)
        .build();

    orqueioDecisionRefTenantIdAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_DECISION_REF_TENANT_ID)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioMapDecisionResultAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_MAP_DECISION_RESULT)
        .namespace(ORQUEIO_NS)
        .build();

    orqueioTaskPriorityAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_TASK_PRIORITY)
      .namespace(ORQUEIO_NS)
      .build();

    typeBuilder.build();
  }

  public BusinessRuleTaskImpl(ModelTypeInstanceContext context) {
    super(context);
  }

  @Override
  public BusinessRuleTaskBuilder builder() {
    return new BusinessRuleTaskBuilder((BpmnModelInstance) modelInstance, this);
  }

  public String getImplementation() {
    return implementationAttribute.getValue(this);
  }

  public void setImplementation(String implementation) {
    implementationAttribute.setValue(this, implementation);
  }

  /** orqueio extensions */

  public String getOrqueioClass() {
    return orqueioClassAttribute.getValue(this);
  }

  public void setOrqueioClass(String orqueioClass) {
    orqueioClassAttribute.setValue(this, orqueioClass);
  }

  public String getOrqueioDelegateExpression() {
    return orqueioDelegateExpressionAttribute.getValue(this);
  }

  public void setOrqueioDelegateExpression(String orqueioExpression) {
    orqueioDelegateExpressionAttribute.setValue(this, orqueioExpression);
  }

  public String getOrqueioExpression() {
    return orqueioExpressionAttribute.getValue(this);
  }

  public void setOrqueioExpression(String orqueioExpression) {
    orqueioExpressionAttribute.setValue(this, orqueioExpression);
  }

  public String getOrqueioResultVariable() {
    return orqueioResultVariableAttribute.getValue(this);
  }

  public void setOrqueioResultVariable(String orqueioResultVariable) {
    orqueioResultVariableAttribute.setValue(this, orqueioResultVariable);
  }

  public String getOrqueioTopic() {
    return orqueioTopicAttribute.getValue(this);
  }

  public void setOrqueioTopic(String orqueioTopic) {
    orqueioTopicAttribute.setValue(this, orqueioTopic);
  }

  public String getOrqueioType() {
    return orqueioTypeAttribute.getValue(this);
  }

  public void setOrqueioType(String orqueioType) {
    orqueioTypeAttribute.setValue(this, orqueioType);
  }

  public String getOrqueioDecisionRef() {
    return orqueioDecisionRefAttribute.getValue(this);
  }

  public void setOrqueioDecisionRef(String orqueioDecisionRef) {
    orqueioDecisionRefAttribute.setValue(this, orqueioDecisionRef);
  }

  public String getOrqueioDecisionRefBinding() {
    return orqueioDecisionRefBindingAttribute.getValue(this);
  }

  public void setOrqueioDecisionRefBinding(String orqueioDecisionRefBinding) {
    orqueioDecisionRefBindingAttribute.setValue(this, orqueioDecisionRefBinding);
  }

  public String getOrqueioDecisionRefVersion() {
    return orqueioDecisionRefVersionAttribute.getValue(this);
  }

  public void setOrqueioDecisionRefVersion(String orqueioDecisionRefVersion) {
    orqueioDecisionRefVersionAttribute.setValue(this, orqueioDecisionRefVersion);
  }

  public String getOrqueioDecisionRefVersionTag() {
    return orqueioDecisionRefVersionTagAttribute.getValue(this);
  }

  public void setOrqueioDecisionRefVersionTag(String orqueioDecisionRefVersionTag) {
    orqueioDecisionRefVersionTagAttribute.setValue(this, orqueioDecisionRefVersionTag);
  }

  @Override
  public String getOrqueioMapDecisionResult() {
    return orqueioMapDecisionResultAttribute.getValue(this);
  }

  @Override
  public void setOrqueioMapDecisionResult(String orqueioMapDecisionResult) {
    orqueioMapDecisionResultAttribute.setValue(this, orqueioMapDecisionResult);
  }

  public String getOrqueioDecisionRefTenantId() {
    return orqueioDecisionRefTenantIdAttribute.getValue(this);
  }

  public void setOrqueioDecisionRefTenantId(String tenantId) {
    orqueioDecisionRefTenantIdAttribute.setValue(this, tenantId);
  }

  @Override
  public String getOrqueioTaskPriority() {
    return orqueioTaskPriorityAttribute.getValue(this);
  }

  @Override
  public void setOrqueioTaskPriority(String taskPriority) {
    orqueioTaskPriorityAttribute.setValue(this, taskPriority);
  }
}
