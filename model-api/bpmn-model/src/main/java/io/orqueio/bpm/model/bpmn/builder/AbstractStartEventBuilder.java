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
import io.orqueio.bpm.model.bpmn.instance.CompensateEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.ErrorEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.EscalationEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.StartEvent;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioFormData;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioFormField;

/**
 * @author Sebastian Menski
 */
public abstract class AbstractStartEventBuilder<B extends AbstractStartEventBuilder<B>> extends AbstractCatchEventBuilder<B, StartEvent> {

  protected AbstractStartEventBuilder(BpmnModelInstance modelInstance, StartEvent element, Class<?> selfType) {
    super(modelInstance, element, selfType);
  }

  /** orqueio extensions */

  /**
   * @deprecated use orqueioAsyncBefore() instead.
   *
   * Sets the orqueio async attribute to true.
   *
   * @return the builder object
   */
  @Deprecated
  public B orqueioAsync() {
    element.setOrqueioAsyncBefore(true);
    return myself;
  }

  /**
   * @deprecated use orqueioAsyncBefore(isOrqueioAsyncBefore) instead.
   *
   * Sets the orqueio async attribute.
   *
   * @param isOrqueioAsync  the async state of the task
   * @return the builder object
   */
  @Deprecated
  public B orqueioAsync(boolean isOrqueioAsync) {
    element.setOrqueioAsyncBefore(isOrqueioAsync);
    return myself;
  }

  /**
   * Sets the orqueio form handler class attribute.
   *
   * @param orqueioFormHandlerClass  the class name of the form handler
   * @return the builder object
   */
  public B orqueioFormHandlerClass(String orqueioFormHandlerClass) {
    element.setOrqueioFormHandlerClass(orqueioFormHandlerClass);
    return myself;
  }

  /**
   * Sets the orqueio form key attribute.
   *
   * @param orqueioFormKey  the form key to set
   * @return the builder object
   */
  public B orqueioFormKey(String orqueioFormKey) {
    element.setOrqueioFormKey(orqueioFormKey);
    return myself;
  }

  /**
   * Sets the orqueio form ref attribute.
   *
   * @param orqueioFormRef the form ref to set
   * @return the builder object
   */
  public B orqueioFormRef(String orqueioFormRef) {
    element.setOrqueioFormRef(orqueioFormRef);
    return myself;
  }

  /**
   * Sets the orqueio form ref binding attribute.
   *
   * @param orqueioFormRef the form ref binding to set
   * @return the builder object
   */
  public B orqueioFormRefBinding(String orqueioFormRefBinding) {
    element.setOrqueioFormRefBinding(orqueioFormRefBinding);
    return myself;
  }

  /**
   * Sets the orqueio form ref version attribute.
   *
   * @param orqueioFormRef the form ref version to set
   * @return the builder object
   */
  public B orqueioFormRefVersion(String orqueioFormRefVersion) {
    element.setOrqueioFormRefVersion(orqueioFormRefVersion);
    return myself;
  }

  /**
   * Sets the orqueio initiator attribute.
   *
   * @param orqueioInitiator  the initiator to set
   * @return the builder object
   */
  public B orqueioInitiator(String orqueioInitiator) {
    element.setOrqueioInitiator(orqueioInitiator);
    return myself;
  }

  /**
   * Creates a new orqueio form field extension element.
   *
   * @return the builder object
   */
  public OrqueioStartEventFormFieldBuilder orqueioFormField() {
    OrqueioFormData orqueioFormData = getCreateSingleExtensionElement(OrqueioFormData.class);
    OrqueioFormField orqueioFormField = createChild(orqueioFormData, OrqueioFormField.class);
    return new OrqueioStartEventFormFieldBuilder(modelInstance, element, orqueioFormField);
  }

  /**
   * Sets a catch all error definition.
   *
   * @return the builder object
   */
  public B error() {
    ErrorEventDefinition errorEventDefinition = createInstance(ErrorEventDefinition.class);
    element.getEventDefinitions().add(errorEventDefinition);

    return myself;
  }

  /**
   * Sets an error definition for the given error code. If already an error
   * with this code exists it will be used, otherwise a new error is created.
   *
   * @param errorCode the code of the error
   * @return the builder object
   */
  public B error(String errorCode) {
    return error(errorCode, null);
  }

  /**
   * Sets an error definition for the given error code. If already an error
   * with this code exists it will be used, otherwise a new error is created
   * with the given errorMessage.
   *
   * @param errorCode the code of the error
   * @param errorMessage the error message that is used when a new error needs
   *        to be created
   * @return the builder object
   */
  public B error(String errorCode, String errorMessage) {
    ErrorEventDefinition errorEventDefinition = createErrorEventDefinition(errorCode, errorMessage);
    element.getEventDefinitions().add(errorEventDefinition);

    return myself;
  }

  /**
   * Creates an error event definition with an unique id
   * and returns a builder for the error event definition.
   *
   * @return the error event definition builder object
   */
  public ErrorEventDefinitionBuilder errorEventDefinition(String id) {
    ErrorEventDefinition errorEventDefinition = createEmptyErrorEventDefinition();
    if (id != null) {
      errorEventDefinition.setId(id);
    }

    element.getEventDefinitions().add(errorEventDefinition);
    return new ErrorEventDefinitionBuilder(modelInstance, errorEventDefinition);
  }

  /**
   * Creates an error event definition
   * and returns a builder for the error event definition.
   *
   * @return the error event definition builder object
   */
  public ErrorEventDefinitionBuilder errorEventDefinition() {
    ErrorEventDefinition errorEventDefinition = createEmptyErrorEventDefinition();
    element.getEventDefinitions().add(errorEventDefinition);
    return new ErrorEventDefinitionBuilder(modelInstance, errorEventDefinition);
  }

  /**
   * Sets a catch all escalation definition.
   *
   * @return the builder object
   */
  public B escalation() {
    EscalationEventDefinition escalationEventDefinition = createInstance(EscalationEventDefinition.class);
    element.getEventDefinitions().add(escalationEventDefinition);

    return myself;
  }

  /**
   * Sets an escalation definition for the given escalation code. If already an escalation
   * with this code exists it will be used, otherwise a new escalation is created.
   *
   * @param escalationCode the code of the escalation
   * @return the builder object
   */
  public B escalation(String escalationCode) {
    EscalationEventDefinition escalationEventDefinition = createEscalationEventDefinition(escalationCode);
    element.getEventDefinitions().add(escalationEventDefinition);

    return myself;
  }

  /**
   * Sets a catch compensation definition.
   *
   * @return the builder object
   */
  public B compensation() {
    CompensateEventDefinition compensateEventDefinition = createCompensateEventDefinition();
    element.getEventDefinitions().add(compensateEventDefinition);

    return myself;
  }

  /**
   * Sets whether the start event is interrupting or not.
   */
  public B interrupting(boolean interrupting) {
    element.setInterrupting(interrupting);

    return myself;
  }

}
