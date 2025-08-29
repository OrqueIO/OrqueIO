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
import io.orqueio.bpm.model.bpmn.instance.CallActivity;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioIn;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioOut;

/**
 * @author Sebastian Menski
 */
public class AbstractCallActivityBuilder<B extends AbstractCallActivityBuilder<B>> extends AbstractActivityBuilder<B, CallActivity> {

  protected AbstractCallActivityBuilder(BpmnModelInstance modelInstance, CallActivity element, Class<?> selfType) {
    super(modelInstance, element, selfType);
  }

  /**
   * Sets the called element
   *
   * @param calledElement  the process to call
   * @return the builder object
   */
  public B calledElement(String calledElement) {
    element.setCalledElement(calledElement);
    return myself;
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
   * @deprecated use orqueioAsyncBefore(isOrqueioAsyncBefore) instead
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
   * Sets the orqueio calledElementBinding attribute
   *
   * @param orqueioCalledElementBinding  the element binding to use
   * @return the builder object
   */
  public B orqueioCalledElementBinding(String orqueioCalledElementBinding) {
    element.setOrqueioCalledElementBinding(orqueioCalledElementBinding);
    return myself;
  }

  /**
   * Sets the orqueio calledElementVersion attribute
   *
   * @param orqueioCalledElementVersion  the element version to use
   * @return the builder object
   */
  public B orqueioCalledElementVersion(String orqueioCalledElementVersion) {
    element.setOrqueioCalledElementVersion(orqueioCalledElementVersion);
    return myself;
  }

  /**
   * Sets the orqueio calledElementVersionTag attribute
   *
   * @param orqueioCalledElementVersionTag  the element version to use
   * @return the builder object
   */
  public B orqueioCalledElementVersionTag(String orqueioCalledElementVersionTag) {
    element.setOrqueioCalledElementVersionTag(orqueioCalledElementVersionTag);
    return myself;
  }

  /**
   * Sets the orqueio calledElementTenantId attribute
   * @param orqueioCalledElementTenantId the called element tenant id
   * @return the builder object
   */
  public B orqueioCalledElementTenantId(String orqueioCalledElementTenantId) {
    element.setOrqueioCalledElementTenantId(orqueioCalledElementTenantId);
    return myself;
  }

  /**
   * Sets the orqueio caseRef attribute
   *
   * @param caseRef the case to call
   * @return the builder object
   */
  public B orqueioCaseRef(String caseRef) {
    element.setOrqueioCaseRef(caseRef);
    return myself;
  }

  /**
   * Sets the orqueio caseBinding attribute
   *
   * @param orqueioCaseBinding  the case binding to use
   * @return the builder object
   */
  public B orqueioCaseBinding(String orqueioCaseBinding) {
    element.setOrqueioCaseBinding(orqueioCaseBinding);
    return myself;
  }

  /**
   * Sets the orqueio caseVersion attribute
   *
   * @param orqueioCaseVersion  the case version to use
   * @return the builder object
   */
  public B orqueioCaseVersion(String orqueioCaseVersion) {
    element.setOrqueioCaseVersion(orqueioCaseVersion);
    return myself;
  }

  /**
   * Sets the caseTenantId
   * @param tenantId the tenant id to set
   * @return the builder object
   */
  public B orqueioCaseTenantId(String tenantId) {
    element.setOrqueioCaseTenantId(tenantId);
    return myself;
  }

  /**
   * Sets a "orqueio in" parameter to pass a business key from the super process instance to the sub process instance
   * @param businessKey the business key to set
   * @return the builder object
   */
  public B orqueioInBusinessKey(String businessKey) {
    OrqueioIn param = modelInstance.newInstance(OrqueioIn.class);
    param.setOrqueioBusinessKey(businessKey);
    addExtensionElement(param);
    return myself;
  }

  /**
   * Sets a "orqueio in" parameter to pass a variable from the super process instance to the sub process instance
   *
   * @param source the name of variable in the super process instance
   * @param target the name of the variable in the sub process instance
   * @return the builder object
   */
  public B orqueioIn(String source, String target) {
    OrqueioIn param = modelInstance.newInstance(OrqueioIn.class);
    param.setOrqueioSource(source);
    param.setOrqueioTarget(target);
    addExtensionElement(param);
    return myself;
  }

  /**
   * Sets a "orqueio out" parameter to pass a variable from a sub process instance to the super process instance
   *
   * @param source the name of variable in the sub process instance
   * @param target the name of the variable in the super process instance
   * @return the builder object
   */
  public B orqueioOut(String source, String target) {
    OrqueioOut param = modelInstance.newInstance(OrqueioOut.class);
    param.setOrqueioSource(source);
    param.setOrqueioTarget(target);
    addExtensionElement(param);
    return myself;
  }

  /**
   * Sets the orqueio variableMappingClass attribute. It references on a class which implements the
   * {@link DelegateVariableMapping} interface.
   * Is used to delegate the variable in- and output mapping to the given class.
   *
   * @param orqueioVariableMappingClass                  the class name to set
   * @return                              the builder object
   */
  @SuppressWarnings("rawtypes")
  public B orqueioVariableMappingClass(Class orqueioVariableMappingClass) {
    return orqueioVariableMappingClass(orqueioVariableMappingClass.getName());
  }

  /**
   * Sets the orqueio variableMappingClass attribute. It references on a class which implements the
   * {@link DelegateVariableMapping} interface.
   * Is used to delegate the variable in- and output mapping to the given class.
   *
   * @param orqueioVariableMappingClass                  the class name to set
   * @return                              the builder object
   */
  public B orqueioVariableMappingClass(String fullQualifiedClassName) {
    element.setOrqueioVariableMappingClass(fullQualifiedClassName);
    return myself;
  }

  /**
   * Sets the orqueio variableMappingDelegateExpression attribute. The expression when is resolved
   * references to an object of a class, which implements the {@link DelegateVariableMapping} interface.
   * Is used to delegate the variable in- and output mapping to the given class.
   *
   * @param orqueioVariableMappingDelegateExpression     the expression which references a delegate object
   * @return                              the builder object
   */
  public B orqueioVariableMappingDelegateExpression(String orqueioVariableMappingDelegateExpression) {
    element.setOrqueioVariableMappingDelegateExpression(orqueioVariableMappingDelegateExpression);
    return myself;
  }
}
