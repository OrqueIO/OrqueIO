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
package io.orqueio.bpm.model.bpmn.instance.orqueio;

import io.orqueio.bpm.model.bpmn.instance.BpmnModelElementInstance;

import java.util.Collection;

/**
 * The BPMN formProperty orqueio extension element
 *
 * @author Sebastian Menski
 */
public interface OrqueioFormProperty extends BpmnModelElementInstance {

  String getOrqueioId();

  void setOrqueioId(String orqueioId);

  String getOrqueioName();

  void setOrqueioName(String orqueioName);

  String getOrqueioType();

  void setOrqueioType(String orqueioType);

  boolean isOrqueioRequired();

  void setOrqueioRequired(boolean isOrqueioRequired);

  boolean isOrqueioReadable();

  void setOrqueioReadable(boolean isOrqueioReadable);

  boolean isOrqueioWriteable();

  void setOrqueioWriteable(boolean isOrqueioWriteable);

  String getOrqueioVariable();

  void setOrqueioVariable(String orqueioVariable);

  String getOrqueioExpression();

  void setOrqueioExpression(String orqueioExpression);

  String getOrqueioDatePattern();

  void setOrqueioDatePattern(String orqueioDatePattern);

  String getOrqueioDefault();

  void setOrqueioDefault(String orqueioDefault);

  Collection<OrqueioValue> getOrqueioValues();

}
