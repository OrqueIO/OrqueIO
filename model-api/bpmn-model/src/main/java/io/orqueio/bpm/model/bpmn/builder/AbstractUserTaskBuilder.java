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

import java.util.List;

import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants;
import io.orqueio.bpm.model.bpmn.instance.TimerEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.UserTask;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioFormData;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioFormField;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioTaskListener;

/**
 * @author Sebastian Menski
 */
public abstract class AbstractUserTaskBuilder<B extends AbstractUserTaskBuilder<B>> extends AbstractTaskBuilder<B, UserTask> {

  protected AbstractUserTaskBuilder(BpmnModelInstance modelInstance, UserTask element, Class<?> selfType) {
    super(modelInstance, element, selfType);
  }

  /**
   * Sets the implementation of the build user task.
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
   * Sets the orqueio attribute assignee.
   *
   * @param orqueioAssignee  the assignee to set
   * @return the builder object
   */
  public B orqueioAssignee(String orqueioAssignee) {
    element.setOrqueioAssignee(orqueioAssignee);
    return myself;
  }

  /**
   * Sets the orqueio candidate groups attribute.
   *
   * @param orqueioCandidateGroups  the candidate groups to set
   * @return the builder object
   */
  public B orqueioCandidateGroups(String orqueioCandidateGroups) {
    element.setOrqueioCandidateGroups(orqueioCandidateGroups);
    return myself;
  }

  /**
   * Sets the orqueio candidate groups attribute.
   *
   * @param orqueioCandidateGroups  the candidate groups to set
   * @return the builder object
   */
  public B orqueioCandidateGroups(List<String> orqueioCandidateGroups) {
    element.setOrqueioCandidateGroupsList(orqueioCandidateGroups);
    return myself;
  }

  /**
   * Sets the orqueio candidate users attribute.
   *
   * @param orqueioCandidateUsers  the candidate users to set
   * @return the builder object
   */
  public B orqueioCandidateUsers(String orqueioCandidateUsers) {
    element.setOrqueioCandidateUsers(orqueioCandidateUsers);
    return myself;
  }

  /**
   * Sets the orqueio candidate users attribute.
   *
   * @param orqueioCandidateUsers  the candidate users to set
   * @return the builder object
   */
  public B orqueioCandidateUsers(List<String> orqueioCandidateUsers) {
    element.setOrqueioCandidateUsersList(orqueioCandidateUsers);
    return myself;
  }

  /**
   * Sets the orqueio due date attribute.
   *
   * @param orqueioDueDate  the due date of the user task
   * @return the builder object
   */
  public B orqueioDueDate(String orqueioDueDate) {
    element.setOrqueioDueDate(orqueioDueDate);
    return myself;
  }

  /**
   * Sets the orqueio follow up date attribute.
   *
   * @param orqueioFollowUpDate  the follow up date of the user task
   * @return the builder object
   */
  public B orqueioFollowUpDate(String orqueioFollowUpDate) {
    element.setOrqueioFollowUpDate(orqueioFollowUpDate);
    return myself;
  }

  /**
   * Sets the orqueio form handler class attribute.
   *
   * @param orqueioFormHandlerClass  the class name of the form handler
   * @return the builder object
   */
  @SuppressWarnings("rawtypes")
  public B orqueioFormHandlerClass(Class orqueioFormHandlerClass) {
    return orqueioFormHandlerClass(orqueioFormHandlerClass.getName());
  }

  /**
   * Sets the orqueio form handler class attribute.
   *
   * @param orqueioFormHandlerClass  the class name of the form handler
   * @return the builder object
   */
  public B orqueioFormHandlerClass(String fullQualifiedClassName) {
    element.setOrqueioFormHandlerClass(fullQualifiedClassName);
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
   * Sets the orqueio priority attribute.
   *
   * @param orqueioPriority  the priority of the user task
   * @return the builder object
   */
  public B orqueioPriority(String orqueioPriority) {
    element.setOrqueioPriority(orqueioPriority);
    return myself;
  }

  /**
   * Creates a new orqueio form field extension element.
   *
   * @return the builder object
   */
  public OrqueioUserTaskFormFieldBuilder orqueioFormField() {
    OrqueioFormData orqueioFormData = getCreateSingleExtensionElement(OrqueioFormData.class);
    OrqueioFormField orqueioFormField = createChild(orqueioFormData, OrqueioFormField.class);
    return new OrqueioUserTaskFormFieldBuilder(modelInstance, element, orqueioFormField);
  }

  /**
   * Add a class based task listener with specified event name
   *
   * @param eventName - event names to listen to
   * @param fullQualifiedClassName - a string representing a class
   * @return the builder object
   */
  @SuppressWarnings("rawtypes")
  public B orqueioTaskListenerClass(String eventName, Class listenerClass) {
    return orqueioTaskListenerClass(eventName, listenerClass.getName());
  }

  /**
   * Add a class based task listener with specified event name
   *
   * @param eventName - event names to listen to
   * @param fullQualifiedClassName - a string representing a class
   * @return the builder object
   */
  public B orqueioTaskListenerClass(String eventName, String fullQualifiedClassName) {
    OrqueioTaskListener executionListener = createInstance(OrqueioTaskListener.class);
    executionListener.setOrqueioEvent(eventName);
    executionListener.setOrqueioClass(fullQualifiedClassName);

    addExtensionElement(executionListener);

    return myself;
  }

  public B orqueioTaskListenerExpression(String eventName, String expression) {
    OrqueioTaskListener executionListener = createInstance(OrqueioTaskListener.class);
    executionListener.setOrqueioEvent(eventName);
    executionListener.setOrqueioExpression(expression);

    addExtensionElement(executionListener);

    return myself;
  }

  public B orqueioTaskListenerDelegateExpression(String eventName, String delegateExpression) {
    OrqueioTaskListener executionListener = createInstance(OrqueioTaskListener.class);
    executionListener.setOrqueioEvent(eventName);
    executionListener.setOrqueioDelegateExpression(delegateExpression);

    addExtensionElement(executionListener);

    return myself;
  }

  @SuppressWarnings("rawtypes")
  public B orqueioTaskListenerClassTimeoutWithCycle(String id, Class listenerClass, String timerCycle) {
    return orqueioTaskListenerClassTimeoutWithCycle(id, listenerClass.getName(), timerCycle);
  }

  @SuppressWarnings("rawtypes")
  public B orqueioTaskListenerClassTimeoutWithDate(String id, Class listenerClass, String timerDate) {
    return orqueioTaskListenerClassTimeoutWithDate(id, listenerClass.getName(), timerDate);
  }

  @SuppressWarnings("rawtypes")
  public B orqueioTaskListenerClassTimeoutWithDuration(String id, Class listenerClass, String timerDuration) {
    return orqueioTaskListenerClassTimeoutWithDuration(id, listenerClass.getName(), timerDuration);
  }

  public B orqueioTaskListenerClassTimeoutWithCycle(String id, String fullQualifiedClassName, String timerCycle) {
    return createOrqueioTaskListenerClassTimeout(id, fullQualifiedClassName, createTimeCycle(timerCycle));
  }

  public B orqueioTaskListenerClassTimeoutWithDate(String id, String fullQualifiedClassName, String timerDate) {
    return createOrqueioTaskListenerClassTimeout(id, fullQualifiedClassName, createTimeDate(timerDate));
  }

  public B orqueioTaskListenerClassTimeoutWithDuration(String id, String fullQualifiedClassName, String timerDuration) {
    return createOrqueioTaskListenerClassTimeout(id, fullQualifiedClassName, createTimeDuration(timerDuration));
  }

  public B orqueioTaskListenerExpressionTimeoutWithCycle(String id, String expression, String timerCycle) {
    return createOrqueioTaskListenerExpressionTimeout(id, expression, createTimeCycle(timerCycle));
  }

  public B orqueioTaskListenerExpressionTimeoutWithDate(String id, String expression, String timerDate) {
    return createOrqueioTaskListenerExpressionTimeout(id, expression, createTimeDate(timerDate));
  }

  public B orqueioTaskListenerExpressionTimeoutWithDuration(String id, String expression, String timerDuration) {
    return createOrqueioTaskListenerExpressionTimeout(id, expression, createTimeDuration(timerDuration));
  }

  public B orqueioTaskListenerDelegateExpressionTimeoutWithCycle(String id, String delegateExpression, String timerCycle) {
    return createOrqueioTaskListenerDelegateExpressionTimeout(id, delegateExpression, createTimeCycle(timerCycle));
  }

  public B orqueioTaskListenerDelegateExpressionTimeoutWithDate(String id, String delegateExpression, String timerDate) {
    return createOrqueioTaskListenerDelegateExpressionTimeout(id, delegateExpression, createTimeDate(timerDate));
  }

  public B orqueioTaskListenerDelegateExpressionTimeoutWithDuration(String id, String delegateExpression, String timerDuration) {
    return createOrqueioTaskListenerDelegateExpressionTimeout(id, delegateExpression, createTimeDuration(timerDuration));
  }

  protected B createOrqueioTaskListenerClassTimeout(String id, String fullQualifiedClassName, TimerEventDefinition timerDefinition) {
    OrqueioTaskListener executionListener = createOrqueioTaskListenerTimeout(id, timerDefinition);
    executionListener.setOrqueioClass(fullQualifiedClassName);
    return myself;
  }

  protected B createOrqueioTaskListenerExpressionTimeout(String id, String expression, TimerEventDefinition timerDefinition) {
    OrqueioTaskListener executionListener = createOrqueioTaskListenerTimeout(id, timerDefinition);
    executionListener.setOrqueioExpression(expression);
    return myself;
  }

  protected B createOrqueioTaskListenerDelegateExpressionTimeout(String id, String delegateExpression, TimerEventDefinition timerDefinition) {
    OrqueioTaskListener executionListener = createOrqueioTaskListenerTimeout(id, timerDefinition);
    executionListener.setOrqueioDelegateExpression(delegateExpression);
    return myself;
  }

  protected OrqueioTaskListener createOrqueioTaskListenerTimeout(String id, TimerEventDefinition timerDefinition) {
    OrqueioTaskListener executionListener = createInstance(OrqueioTaskListener.class);
    executionListener.setAttributeValue(BpmnModelConstants.BPMN_ATTRIBUTE_ID, id, true);
    executionListener.setOrqueioEvent("timeout");
    executionListener.addChildElement(timerDefinition);
    addExtensionElement(executionListener);
    return executionListener;
  }
}
