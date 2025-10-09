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

import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.builder.ServiceTaskBuilder;
import io.orqueio.bpm.model.bpmn.instance.Operation;
import io.orqueio.bpm.model.bpmn.instance.ServiceTask;
import io.orqueio.bpm.model.bpmn.instance.Task;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.reference.AttributeReference;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.*;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN serviceTask element
 *
 * @author Sebastian Menski
 */
public class ServiceTaskImpl extends TaskImpl implements ServiceTask {

  protected static Attribute<String> implementationAttribute;
  protected static AttributeReference<Operation> operationRefAttribute;

  /** orqueio extensions */

  protected static Attribute<String> orqueioClassAttribute;
  protected static Attribute<String> orqueioDelegateExpressionAttribute;
  protected static Attribute<String> orqueioExpressionAttribute;
  protected static Attribute<String> orqueioResultVariableAttribute;
  protected static Attribute<String> orqueioTopicAttribute;
  protected static Attribute<String> orqueioTypeAttribute;
  protected static Attribute<String> orqueioTaskPriorityAttribute;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(ServiceTask.class, BPMN_ELEMENT_SERVICE_TASK)
      .namespaceUri(BPMN20_NS)
      .extendsType(Task.class)
      .instanceProvider(new ModelTypeInstanceProvider<ServiceTask>() {
        public ServiceTask newInstance(ModelTypeInstanceContext instanceContext) {
          return new ServiceTaskImpl(instanceContext);
        }
      });

    implementationAttribute = typeBuilder.stringAttribute(BPMN_ATTRIBUTE_IMPLEMENTATION)
      .defaultValue("##WebService")
      .build();

    operationRefAttribute = typeBuilder.stringAttribute(BPMN_ATTRIBUTE_OPERATION_REF)
      .qNameAttributeReference(Operation.class)
      .build();

    /** orqueio extensions */

    orqueioClassAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_CLASS)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioDelegateExpressionAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_DELEGATE_EXPRESSION)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioExpressionAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_EXPRESSION)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioResultVariableAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_RESULT_VARIABLE)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioTopicAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_TOPIC)
        .namespace(CAMUNDA_NS)
        .build();

    orqueioTypeAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_TYPE)
      .namespace(CAMUNDA_NS)
      .build();
    
    orqueioTaskPriorityAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_TASK_PRIORITY)
      .namespace(CAMUNDA_NS)
      .build();

    typeBuilder.build();
  }

  public ServiceTaskImpl(ModelTypeInstanceContext context) {
    super(context);
  }

  @Override
  public ServiceTaskBuilder builder() {
    return new ServiceTaskBuilder((BpmnModelInstance) modelInstance, this);
  }

  public String getImplementation() {
    return implementationAttribute.getValue(this);
  }

  public void setImplementation(String implementation) {
    implementationAttribute.setValue(this, implementation);
  }

  public Operation getOperation() {
    return operationRefAttribute.getReferenceTargetElement(this);
  }

  public void setOperation(Operation operation) {
    operationRefAttribute.setReferenceTargetElement(this, operation);
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

  @Override
  public String getOrqueioTaskPriority() {
    return orqueioTaskPriorityAttribute.getValue(this);
  }

  @Override
  public void setOrqueioTaskPriority(String taskPriority) {
    orqueioTaskPriorityAttribute.setValue(this, taskPriority);
  }
}
