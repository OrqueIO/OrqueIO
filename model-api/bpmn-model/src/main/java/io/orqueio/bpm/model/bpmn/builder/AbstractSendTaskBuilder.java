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
package io.orqueio.bpm.model.bpmn.builder;

import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.instance.Message;
import io.orqueio.bpm.model.bpmn.instance.Operation;
import io.orqueio.bpm.model.bpmn.instance.SendTask;

/**
 * @author Sebastian Menski
 */
public abstract class AbstractSendTaskBuilder<B extends AbstractSendTaskBuilder<B>> extends AbstractTaskBuilder<B, SendTask> {

  protected AbstractSendTaskBuilder(BpmnModelInstance modelInstance, SendTask element, Class<?> selfType) {
    super(modelInstance, element, selfType);
  }

  /**
   * Sets the implementation of the send task.
   *
   * @param implementation  the implementation to set
   * @return the builder object
   */
  public B implementation(String implementation) {
    element.setImplementation(implementation);
    return myself;
  }

  /**
   * Sets the message of the send task.
   * @param message  the message to set
   * @return the builder object
   */
  public B message(Message message) {
    element.setMessage(message);
    return myself;
  }

  /**
   * Sets the message with the given message name. If already a message
   * with this name exists it will be used, otherwise a new message is created.
   *
   * @param messageName the name of the message
   * @return the builder object
   */
  public B message(String messageName) {
    Message message = findMessageForName(messageName);
    return message(message);
  }

  /**
   * Sets the operation of the send task.
   *
   * @param operation  the operation to set
   * @return the builder object
   */
  public B operation(Operation operation) {
    element.setOperation(operation);
    return myself;
  }

  /** orqueio extensions */

  /**
   * Sets the orqueio class attribute.
   *
   * @param orqueioClass  the class name to set
   * @return the builder object
   */
  public B orqueioClass(Class delegateClass) {
    return orqueioClass(delegateClass.getName());
  }

  /**
   * Sets the orqueio class attribute.
   *
   * @param orqueioClass  the class name to set
   * @return the builder object
   */
  public B orqueioClass(String fullQualifiedClassName) {
    element.setOrqueioClass(fullQualifiedClassName);
    return myself;
  }

  /**
   * Sets the orqueio delegateExpression attribute.
   *
   * @param orqueioExpression  the delegateExpression to set
   * @return the builder object
   */
  public B orqueioDelegateExpression(String orqueioExpression) {
    element.setOrqueioDelegateExpression(orqueioExpression);
    return myself;
  }

  /**
   * Sets the orqueio expression attribute.
   *
   * @param orqueioExpression  the expression to set
   * @return the builder object
   */
  public B orqueioExpression(String orqueioExpression) {
    element.setOrqueioExpression(orqueioExpression);
    return myself;
  }

  /**
   * Sets the orqueio resultVariable attribute.
   *
   * @param orqueioResultVariable  the name of the process variable
   * @return the builder object
   */
  public B orqueioResultVariable(String orqueioResultVariable) {
    element.setOrqueioResultVariable(orqueioResultVariable);
    return myself;
  }

  /**
   * Sets the orqueio topic attribute.
   *
   * @param orqueioTopic  the topic to set
   * @return the builder object
   */
  public B orqueioTopic(String orqueioTopic) {
    element.setOrqueioTopic(orqueioTopic);
    return myself;
  }

  /**
   * Sets the orqueio type attribute.
   *
   * @param orqueioType  the type of the service task
   * @return the builder object
   */
  public B orqueioType(String orqueioType) {
    element.setOrqueioType(orqueioType);
    return myself;
  }

  /**
   * Set the orqueio task priority attribute.
   * The priority is only used for service tasks which have as type value
   * <code>external</code>
   * 
   * @param taskPriority the task priority which should used for the external tasks
   * @return the builder object
   */
  public B orqueioTaskPriority(String taskPriority) {
    element.setOrqueioTaskPriority(taskPriority);
    return myself;
  }
}
