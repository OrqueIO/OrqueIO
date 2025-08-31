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
package io.orqueio.bpm.model.bpmn.instance;

import io.orqueio.bpm.model.bpmn.builder.CallActivityBuilder;

/**
 * The BPMN callActivity element
 *
 * @author Sebastian Menski
 */
public interface CallActivity extends Activity {

  CallActivityBuilder builder();

  String getCalledElement();

  void setCalledElement(String calledElement);

  /** orqueio extensions */

  /**
   * @deprecated use isOrqueioAsyncBefore() instead.
   */
  @Deprecated
  boolean isOrqueioAsync();

  /**
   * @deprecated use setOrqueioAsyncBefore(isOrqueioAsyncBefore) instead.
   */
  @Deprecated
  void setOrqueioAsync(boolean isOrqueioAsync);

  String getOrqueioCalledElementBinding();

  void setOrqueioCalledElementBinding(String orqueioCalledElementBinding);

  String getOrqueioCalledElementVersion();

  void setOrqueioCalledElementVersion(String orqueioCalledElementVersion);

  String getOrqueioCalledElementVersionTag();

  void setOrqueioCalledElementVersionTag(String orqueioCalledElementVersionTag);

  String getOrqueioCaseRef();

  void setOrqueioCaseRef(String orqueioCaseRef);

  String getOrqueioCaseBinding();

  void setOrqueioCaseBinding(String orqueioCaseBinding);

  String getOrqueioCaseVersion();

  void setOrqueioCaseVersion(String orqueioCaseVersion);

  String getOrqueioCalledElementTenantId();

  void setOrqueioCalledElementTenantId(String tenantId);

  String getOrqueioCaseTenantId();

  void setOrqueioCaseTenantId(String tenantId);

  String getOrqueioVariableMappingClass();

  void setOrqueioVariableMappingClass(String orqueioClass);

  String getOrqueioVariableMappingDelegateExpression();

  void setOrqueioVariableMappingDelegateExpression(String orqueioExpression);

}
