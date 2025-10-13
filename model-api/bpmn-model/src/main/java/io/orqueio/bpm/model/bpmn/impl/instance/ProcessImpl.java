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
package io.orqueio.bpm.model.bpmn.impl.instance;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN20_NS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ATTRIBUTE_IS_CLOSED;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ATTRIBUTE_IS_EXECUTABLE;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ATTRIBUTE_PROCESS_TYPE;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ELEMENT_PROCESS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_CANDIDATE_STARTER_GROUPS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_CANDIDATE_STARTER_USERS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_HISTORY_TIME_TO_LIVE;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_IS_STARTABLE_IN_TASKLIST;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_JOB_PRIORITY;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_TASK_PRIORITY;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_VERSION_TAG;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_NS;

import java.util.Collection;
import java.util.List;
import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.ProcessType;
import io.orqueio.bpm.model.bpmn.builder.ProcessBuilder;
import io.orqueio.bpm.model.bpmn.instance.Artifact;
import io.orqueio.bpm.model.bpmn.instance.Auditing;
import io.orqueio.bpm.model.bpmn.instance.CallableElement;
import io.orqueio.bpm.model.bpmn.instance.CorrelationSubscription;
import io.orqueio.bpm.model.bpmn.instance.FlowElement;
import io.orqueio.bpm.model.bpmn.instance.LaneSet;
import io.orqueio.bpm.model.bpmn.instance.Monitoring;
import io.orqueio.bpm.model.bpmn.instance.Process;
import io.orqueio.bpm.model.bpmn.instance.Property;
import io.orqueio.bpm.model.bpmn.instance.ResourceRole;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.impl.util.StringUtil;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.ChildElementCollection;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;
import io.orqueio.bpm.model.xml.type.reference.ElementReferenceCollection;

/**
 * The BPMN process element
 *
 * @author Daniel Meyer
 * @author Sebastian Menski
 */
public class ProcessImpl extends CallableElementImpl implements Process {

  public static final String DEFAULT_HISTORY_TIME_TO_LIVE = "P180D";

  protected static Attribute<ProcessType> processTypeAttribute;
  protected static Attribute<Boolean> isClosedAttribute;
  protected static Attribute<Boolean> isExecutableAttribute;
  // TODO: definitionalCollaborationRef
  protected static ChildElement<Auditing> auditingChild;
  protected static ChildElement<Monitoring> monitoringChild;
  protected static ChildElementCollection<Property> propertyCollection;
  protected static ChildElementCollection<LaneSet> laneSetCollection;
  protected static ChildElementCollection<FlowElement> flowElementCollection;
  protected static ChildElementCollection<Artifact> artifactCollection;
  protected static ChildElementCollection<ResourceRole> resourceRoleCollection;
  protected static ChildElementCollection<CorrelationSubscription> correlationSubscriptionCollection;
  protected static ElementReferenceCollection<Process, Supports> supportsCollection;

  /** orqueio extensions */

  protected static Attribute<String> orqueioCandidateStarterGroupsAttribute;
  protected static Attribute<String> orqueioCandidateStarterUsersAttribute;
  protected static Attribute<String> orqueioJobPriorityAttribute;
  protected static Attribute<String> orqueioTaskPriorityAttribute;
  protected static Attribute<String> orqueioHistoryTimeToLiveAttribute;
  protected static Attribute<Boolean> orqueioIsStartableInTasklistAttribute;
  protected static Attribute<String> orqueioVersionTagAttribute;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(Process.class, BPMN_ELEMENT_PROCESS)
      .namespaceUri(BPMN20_NS)
      .extendsType(CallableElement.class)
      .instanceProvider(new ModelTypeInstanceProvider<Process>() {
        public Process newInstance(ModelTypeInstanceContext instanceContext) {
          return new ProcessImpl(instanceContext);
        }
      });

    processTypeAttribute = typeBuilder.enumAttribute(BPMN_ATTRIBUTE_PROCESS_TYPE, ProcessType.class)
      .defaultValue(ProcessType.None)
      .build();

    isClosedAttribute = typeBuilder.booleanAttribute(BPMN_ATTRIBUTE_IS_CLOSED)
      .defaultValue(false)
      .build();

    isExecutableAttribute = typeBuilder.booleanAttribute(BPMN_ATTRIBUTE_IS_EXECUTABLE)
      .build();

    // TODO: definitionalCollaborationRef

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    auditingChild = sequenceBuilder.element(Auditing.class)
      .build();

    monitoringChild = sequenceBuilder.element(Monitoring.class)
      .build();

    propertyCollection = sequenceBuilder.elementCollection(Property.class)
      .build();

    laneSetCollection = sequenceBuilder.elementCollection(LaneSet.class)
      .build();

    flowElementCollection = sequenceBuilder.elementCollection(FlowElement.class)
      .build();

    artifactCollection = sequenceBuilder.elementCollection(Artifact.class)
      .build();

    resourceRoleCollection = sequenceBuilder.elementCollection(ResourceRole.class)
      .build();

    correlationSubscriptionCollection = sequenceBuilder.elementCollection(CorrelationSubscription.class)
      .build();

    supportsCollection = sequenceBuilder.elementCollection(Supports.class)
      .qNameElementReferenceCollection(Process.class)
      .build();

    /** orqueio extensions */

    orqueioCandidateStarterGroupsAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_CANDIDATE_STARTER_GROUPS)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioCandidateStarterUsersAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_CANDIDATE_STARTER_USERS)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioJobPriorityAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_JOB_PRIORITY)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioTaskPriorityAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_TASK_PRIORITY)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioHistoryTimeToLiveAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_HISTORY_TIME_TO_LIVE)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioIsStartableInTasklistAttribute = typeBuilder.booleanAttribute(CAMUNDA_ATTRIBUTE_IS_STARTABLE_IN_TASKLIST)
      .defaultValue(true)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioVersionTagAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_VERSION_TAG)
      .namespace(CAMUNDA_NS)
      .build();

    typeBuilder.build();
  }

  public ProcessImpl(ModelTypeInstanceContext context) {
    super(context);
  }

  @Override
  public ProcessBuilder builder() {
    return new ProcessBuilder((BpmnModelInstance) modelInstance, this);
  }

  public ProcessType getProcessType() {
    return processTypeAttribute.getValue(this);
  }

  public void setProcessType(ProcessType processType) {
    processTypeAttribute.setValue(this, processType);
  }

  public boolean isClosed() {
    return isClosedAttribute.getValue(this);
  }

  public void setClosed(boolean closed) {
    isClosedAttribute.setValue(this, closed);
  }

  public boolean isExecutable() {
    return isExecutableAttribute.getValue(this);
  }

  public void setExecutable(boolean executable) {
    isExecutableAttribute.setValue(this, executable);
  }

  public Auditing getAuditing() {
    return auditingChild.getChild(this);
  }

  public void setAuditing(Auditing auditing) {
    auditingChild.setChild(this, auditing);
  }

  public Monitoring getMonitoring() {
    return monitoringChild.getChild(this);
  }

  public void setMonitoring(Monitoring monitoring) {
    monitoringChild.setChild(this, monitoring);
  }

  public Collection<Property> getProperties() {
    return propertyCollection.get(this);
  }

  public Collection<LaneSet> getLaneSets() {
    return laneSetCollection.get(this);
  }

  public Collection<FlowElement> getFlowElements() {
    return flowElementCollection.get(this);
  }

  public Collection<Artifact> getArtifacts() {
    return artifactCollection.get(this);
  }

  public Collection<CorrelationSubscription> getCorrelationSubscriptions() {
    return correlationSubscriptionCollection.get(this);
  }

  public Collection<ResourceRole> getResourceRoles() {
    return resourceRoleCollection.get(this);
  }

  public Collection<Process> getSupports() {
    return supportsCollection.getReferenceTargetElements(this);
  }

  /** orqueio extensions */

  public String getOrqueioCandidateStarterGroups() {
    return orqueioCandidateStarterGroupsAttribute.getValue(this);
  }

  public void setOrqueioCandidateStarterGroups(String orqueioCandidateStarterGroups) {
    orqueioCandidateStarterGroupsAttribute.setValue(this, orqueioCandidateStarterGroups);
  }

  public List<String> getOrqueioCandidateStarterGroupsList() {
    String groupsString = orqueioCandidateStarterGroupsAttribute.getValue(this);
    return StringUtil.splitCommaSeparatedList(groupsString);
  }

  public void setOrqueioCandidateStarterGroupsList(List<String> orqueioCandidateStarterGroupsList) {
    String candidateStarterGroups = StringUtil.joinCommaSeparatedList(orqueioCandidateStarterGroupsList);
    orqueioCandidateStarterGroupsAttribute.setValue(this, candidateStarterGroups);
  }

  public String getOrqueioCandidateStarterUsers() {
    return orqueioCandidateStarterUsersAttribute.getValue(this);
  }

  public void setOrqueioCandidateStarterUsers(String orqueioCandidateStarterUsers) {
    orqueioCandidateStarterUsersAttribute.setValue(this, orqueioCandidateStarterUsers);
  }

  public List<String> getOrqueioCandidateStarterUsersList() {
    String candidateStarterUsers = orqueioCandidateStarterUsersAttribute.getValue(this);
    return StringUtil.splitCommaSeparatedList(candidateStarterUsers);
  }

  public void setOrqueioCandidateStarterUsersList(List<String> orqueioCandidateStarterUsersList) {
    String candidateStarterUsers = StringUtil.joinCommaSeparatedList(orqueioCandidateStarterUsersList);
    orqueioCandidateStarterUsersAttribute.setValue(this, candidateStarterUsers);
  }

  public String getOrqueioJobPriority() {
    return orqueioJobPriorityAttribute.getValue(this);
  }

  public void setOrqueioJobPriority(String jobPriority) {
    orqueioJobPriorityAttribute.setValue(this, jobPriority);
  }

  @Override
  public String getOrqueioTaskPriority() {
    return orqueioTaskPriorityAttribute.getValue(this);
  }

  @Override
  public void setOrqueioTaskPriority(String taskPriority) {
    orqueioTaskPriorityAttribute.setValue(this, taskPriority);
  }

  @Override
  public Integer getOrqueioHistoryTimeToLive() {
    String ttl = getOrqueioHistoryTimeToLiveString();
    if (ttl != null) {
      return Integer.parseInt(ttl);
    }
    return null;
  }

  @Override
  public void setOrqueioHistoryTimeToLive(Integer historyTimeToLive) {
    var value = historyTimeToLive == null ? null : String.valueOf(historyTimeToLive);
    setOrqueioHistoryTimeToLiveString(value);
  }

  @Override
  public String getOrqueioHistoryTimeToLiveString() {
    return orqueioHistoryTimeToLiveAttribute.getValue(this);
  }

  @Override
  public void setOrqueioHistoryTimeToLiveString(String historyTimeToLive) {
    if (historyTimeToLive == null) {
      orqueioHistoryTimeToLiveAttribute.removeAttribute(this);
    } else {
      orqueioHistoryTimeToLiveAttribute.setValue(this, historyTimeToLive);
    }
  }

  @Override
  public Boolean isOrqueioStartableInTasklist() {
    return orqueioIsStartableInTasklistAttribute.getValue(this);
  }

  @Override
  public void setOrqueioIsStartableInTasklist(Boolean isStartableInTasklist) {
    orqueioIsStartableInTasklistAttribute.setValue(this, isStartableInTasklist);
  }

  @Override
  public String getOrqueioVersionTag() {
    return orqueioVersionTagAttribute.getValue(this);
  }

  @Override
  public void setOrqueioVersionTag(String versionTag) {
    orqueioVersionTagAttribute.setValue(this, versionTag);
  }
}
