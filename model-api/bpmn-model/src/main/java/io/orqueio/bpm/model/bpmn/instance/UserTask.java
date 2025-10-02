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

import java.util.Collection;
import java.util.List;

import io.orqueio.bpm.model.bpmn.builder.UserTaskBuilder;

/**
 * The BPMN userTask element
 *
 * @author Sebastian Menski
 */
public interface UserTask extends Task {

  UserTaskBuilder builder();

  String getImplementation();

  void setImplementation(String implementation);

  Collection<Rendering> getRenderings();

  /** orqueio extensions */

  String getOrqueioAssignee();

  void setOrqueioAssignee(String orqueioAssignee);

  String getOrqueioCandidateGroups();

  void setOrqueioCandidateGroups(String orqueioCandidateGroups);

  List<String> getOrqueioCandidateGroupsList();

  void setOrqueioCandidateGroupsList(List<String> orqueioCandidateGroupsList);

  String getOrqueioCandidateUsers();

  void setOrqueioCandidateUsers(String orqueioCandidateUsers);

  List<String> getOrqueioCandidateUsersList();

  void setOrqueioCandidateUsersList(List<String> orqueioCandidateUsersList);

  String getOrqueioDueDate();

  void setOrqueioDueDate(String orqueioDueDate);

  String getOrqueioFollowUpDate();

  void setOrqueioFollowUpDate(String orqueioFollowUpDate);

  String getOrqueioFormHandlerClass();

  void setOrqueioFormHandlerClass(String orqueioFormHandlerClass);

  String getOrqueioFormKey();

  void setOrqueioFormKey(String orqueioFormKey);

  String getOrqueioFormRef();

  void setOrqueioFormRef(String orqueioFormRef);

  String getOrqueioFormRefBinding();

  void setOrqueioFormRefBinding(String orqueioFormRefBinding);

  String getOrqueioFormRefVersion();

  void setOrqueioFormRefVersion(String orqueioFormRefVersion);

  String getOrqueioPriority();

  void setOrqueioPriority(String orqueioPriority);
}
