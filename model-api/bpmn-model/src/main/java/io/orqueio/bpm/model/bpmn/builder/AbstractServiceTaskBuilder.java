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
package io.orqueio.bpm.model.bpmn.builder;

import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.instance.ErrorEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.ServiceTask;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioErrorEventDefinition;

/**
 * @author Sebastian Menski
 */
public abstract class AbstractServiceTaskBuilder<B extends AbstractServiceTaskBuilder<B>> extends AbstractTaskBuilder<B, ServiceTask> {

  protected AbstractServiceTaskBuilder(BpmnModelInstance modelInstance, ServiceTask element, Class<?> selfType) {
    super(modelInstance, element, selfType);
  }

  /**
   * Sets the implementation of the build service task.
   *
   * @param implementation  the implementation to set
   * @return the builder object
   */
  public B implementation(String implementation) {
    element.setImplementation(implementation);
    return myself;
  }

  /** orqueio extensions */

  /**
   * Sets the orqueio class attribute.
   *
   * @param orqueioClass  the class name to set
   * @return the builder object
   */
  @SuppressWarnings("rawtypes")
  public B orqueioClass(Class orqueioClass) {
    return orqueioClass(orqueioClass.getName());
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
   * Sets the orqueio topic attribute. This is only meaningful when
   * the {@link #orqueioType(String)} attribute has the value <code>external</code>.
   *
   * @param orqueioTopic the topic to set
   * @return the build object
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
   * Sets the orqueio topic attribute and the orqueio type attribute to the
   * value <code>external</code. Reduces two calls to {@link #orqueioType(String)} and {@link #orqueioTopic(String)}.
   *
   * @param orqueioTopic the topic to set
   * @return the build object
   */
  public B orqueioExternalTask(String orqueioTopic) {
    this.orqueioType("external");
    this.orqueioTopic(orqueioTopic);
    return myself;
  }

  /**
   * Sets the orqueio task priority attribute. This is only meaningful when
   * the {@link #orqueioType(String)} attribute has the value <code>external</code>.
   *
   *
   * @param taskPriority the priority for the external task
   * @return the builder object
   */
  public B orqueioTaskPriority(String taskPriority) {
    element.setOrqueioTaskPriority(taskPriority);
    return myself;
  }

  /**
   * Creates an error event definition for this service task and returns a builder for the error event definition.
   * This is only meaningful when the {@link #orqueioType(String)} attribute has the value <code>external</code>.
   *
   * @return the error event definition builder object
   */
  public OrqueioErrorEventDefinitionBuilder orqueioErrorEventDefinition() {
    ErrorEventDefinition orqueioErrorEventDefinition = createInstance(OrqueioErrorEventDefinition.class);
    addExtensionElement(orqueioErrorEventDefinition);
    return new OrqueioErrorEventDefinitionBuilder(modelInstance, orqueioErrorEventDefinition);
  }
}
