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

import io.orqueio.bpm.model.bpmn.ProcessType;
import io.orqueio.bpm.model.bpmn.builder.ProcessBuilder;

import java.util.Collection;
import java.util.List;


/**
 * The BPMN process element
 *
 * @author Daniel Meyer
 * @author Sebastian Menski
 */
public interface Process extends CallableElement {

  ProcessBuilder builder();

  ProcessType getProcessType();

  void setProcessType(ProcessType processType);

  boolean isClosed();

  void setClosed(boolean closed);

  boolean isExecutable();

  void setExecutable(boolean executable);

  // TODO: collaboration ref

  Auditing getAuditing();

  void setAuditing(Auditing auditing);

  Monitoring getMonitoring();

  void setMonitoring(Monitoring monitoring);

  Collection<Property> getProperties();

  Collection<LaneSet> getLaneSets();

  Collection<FlowElement> getFlowElements();

  Collection<Artifact> getArtifacts();

  Collection<CorrelationSubscription> getCorrelationSubscriptions();

  Collection<ResourceRole> getResourceRoles();

  Collection<Process> getSupports();

  /** orqueio extensions */

  String getOrqueioCandidateStarterGroups();

  void setOrqueioCandidateStarterGroups(String orqueioCandidateStarterGroups);

  List<String> getOrqueioCandidateStarterGroupsList();

  void setOrqueioCandidateStarterGroupsList(List<String> orqueioCandidateStarterGroupsList);

  String getOrqueioCandidateStarterUsers();

  void setOrqueioCandidateStarterUsers(String orqueioCandidateStarterUsers);

  List<String> getOrqueioCandidateStarterUsersList();

  void setOrqueioCandidateStarterUsersList(List<String> orqueioCandidateStarterUsersList);

  String getOrqueioJobPriority();

  void setOrqueioJobPriority(String jobPriority);

  String getOrqueioTaskPriority();

  void setOrqueioTaskPriority(String taskPriority);

  @Deprecated
  Integer getOrqueioHistoryTimeToLive();

  @Deprecated
  void setOrqueioHistoryTimeToLive(Integer historyTimeToLive);

  String getOrqueioHistoryTimeToLiveString();

  void setOrqueioHistoryTimeToLiveString(String historyTimeToLive);

  Boolean isOrqueioStartableInTasklist();

  void setOrqueioIsStartableInTasklist(Boolean isStartableInTasklist);

  String getOrqueioVersionTag();

  void setOrqueioVersionTag(String versionTag);
}
