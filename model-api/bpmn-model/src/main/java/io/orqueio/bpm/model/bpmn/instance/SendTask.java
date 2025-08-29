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
package io.orqueio.bpm.model.bpmn.instance;

import io.orqueio.bpm.model.bpmn.builder.SendTaskBuilder;

/**
 * The BPMN sendTask element
 *
 * @author Sebastian Menski
 */
public interface SendTask extends Task {

  SendTaskBuilder builder();

  String getImplementation();

  void setImplementation(String implementation);

  Message getMessage();

  void setMessage(Message message);

  Operation getOperation();

  void setOperation(Operation operation);

  /** orqueio extensions */

  String getOrqueioClass();

  void setOrqueioClass(String orqueioClass);

  String getOrqueioDelegateExpression();

  void setOrqueioDelegateExpression(String orqueioExpression);

  String getOrqueioExpression();

  void setOrqueioExpression(String orqueioExpression);

  String getOrqueioResultVariable();

  void setOrqueioResultVariable(String orqueioResultVariable);

  String getOrqueioType();

  void setOrqueioType(String orqueioType);

  String getOrqueioTopic();

  void setOrqueioTopic(String orqueioTopic);
  
  String getOrqueioTaskPriority();
  
  void setOrqueioTaskPriority(String taskPriority);
}
