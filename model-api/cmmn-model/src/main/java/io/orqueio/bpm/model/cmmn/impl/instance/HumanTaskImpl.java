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
package io.orqueio.bpm.model.cmmn.impl.instance;

import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_ASSIGNEE;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_CANDIDATE_GROUPS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_CANDIDATE_USERS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_DUE_DATE;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_FOLLOW_UP_DATE;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_FORM_KEY;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_PRIORITY;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_NS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN11_NS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN_ATTRIBUTE_PERFORMER_REF;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN_ELEMENT_HUMAN_TASK;

import java.util.Collection;
import java.util.List;

import io.orqueio.bpm.model.cmmn.instance.HumanTask;
import io.orqueio.bpm.model.cmmn.instance.PlanningTable;
import io.orqueio.bpm.model.cmmn.instance.Role;
import io.orqueio.bpm.model.cmmn.instance.Task;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.impl.util.StringUtil;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.ChildElementCollection;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;
import io.orqueio.bpm.model.xml.type.reference.AttributeReference;

/**
 * @author Roman Smirnov
 *
 */
public class HumanTaskImpl extends TaskImpl implements HumanTask {

  protected static AttributeReference<Role> performerRefAttribute;

  // cmmn 1.0
  @Deprecated
  protected static ChildElementCollection<PlanningTable> planningTableCollection;

  // cmmn 1.1
  protected static ChildElement<PlanningTable> planningTableChild;

  /** orqueio extensions */
  protected static Attribute<String> orqueioAssigneeAttribute;
  protected static Attribute<String> orqueioCandidateGroupsAttribute;
  protected static Attribute<String> orqueioCandidateUsersAttribute;
  protected static Attribute<String> orqueioDueDateAttribute;
  protected static Attribute<String> orqueioFollowUpDateAttribute;
  protected static Attribute<String> orqueioFormKeyAttribute;
  protected static Attribute<String> orqueioPriorityAttribute;

  public HumanTaskImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public Role getPerformer() {
    return performerRefAttribute.getReferenceTargetElement(this);
  }

  public void setPerformer(Role performer) {
    performerRefAttribute.setReferenceTargetElement(this, performer);
  }

  public Collection<PlanningTable> getPlanningTables() {
    return planningTableCollection.get(this);
  }

  public PlanningTable getPlanningTable() {
    return planningTableChild.getChild(this);
  }

  public void setPlanningTable(PlanningTable planningTable) {
    planningTableChild.setChild(this, planningTable);
  }

  /** orqueio extensions */

  public String getOrqueioAssignee() {
    return orqueioAssigneeAttribute.getValue(this);
  }

  public void setOrqueioAssignee(String orqueioAssignee) {
    orqueioAssigneeAttribute.setValue(this, orqueioAssignee);
  }

  public String getOrqueioCandidateGroups() {
    return orqueioCandidateGroupsAttribute.getValue(this);
  }

  public void setOrqueioCandidateGroups(String orqueioCandidateGroups) {
    orqueioCandidateGroupsAttribute.setValue(this, orqueioCandidateGroups);
  }

  public List<String> getOrqueioCandidateGroupsList() {
    String candidateGroups = orqueioCandidateGroupsAttribute.getValue(this);
    return StringUtil.splitCommaSeparatedList(candidateGroups);
  }

  public void setOrqueioCandidateGroupsList(List<String> orqueioCandidateGroupsList) {
    String candidateGroups = StringUtil.joinCommaSeparatedList(orqueioCandidateGroupsList);
    orqueioCandidateGroupsAttribute.setValue(this, candidateGroups);
  }

  public String getOrqueioCandidateUsers() {
    return orqueioCandidateUsersAttribute.getValue(this);
  }

  public void setOrqueioCandidateUsers(String orqueioCandidateUsers) {
    orqueioCandidateUsersAttribute.setValue(this, orqueioCandidateUsers);
  }

  public List<String> getOrqueioCandidateUsersList() {
    String candidateUsers = orqueioCandidateUsersAttribute.getValue(this);
    return StringUtil.splitCommaSeparatedList(candidateUsers);
  }

  public void setOrqueioCandidateUsersList(List<String> orqueioCandidateUsersList) {
    String candidateUsers = StringUtil.joinCommaSeparatedList(orqueioCandidateUsersList);
    orqueioCandidateUsersAttribute.setValue(this, candidateUsers);
  }

  public String getOrqueioDueDate() {
    return orqueioDueDateAttribute.getValue(this);
  }

  public void setOrqueioDueDate(String orqueioDueDate) {
    orqueioDueDateAttribute.setValue(this, orqueioDueDate);
  }

  public String getOrqueioFollowUpDate() {
    return orqueioFollowUpDateAttribute.getValue(this);
  }

  public void setOrqueioFollowUpDate(String orqueioFollowUpDate) {
    orqueioFollowUpDateAttribute.setValue(this, orqueioFollowUpDate);
  }

  public String getOrqueioFormKey() {
    return orqueioFormKeyAttribute.getValue(this);
  }

  public void setOrqueioFormKey(String orqueioFormKey) {
    orqueioFormKeyAttribute.setValue(this, orqueioFormKey);
  }

  public String getOrqueioPriority() {
    return orqueioPriorityAttribute.getValue(this);
  }

  public void setOrqueioPriority(String orqueioPriority) {
    orqueioPriorityAttribute.setValue(this, orqueioPriority);
  }

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(HumanTask.class, CMMN_ELEMENT_HUMAN_TASK)
        .namespaceUri(CMMN11_NS)
        .extendsType(Task.class)
        .instanceProvider(new ModelTypeInstanceProvider<HumanTask>() {
          public HumanTask newInstance(ModelTypeInstanceContext instanceContext) {
            return new HumanTaskImpl(instanceContext);
          }
        });

    performerRefAttribute = typeBuilder.stringAttribute(CMMN_ATTRIBUTE_PERFORMER_REF)
        .idAttributeReference(Role.class)
        .build();

    /** orqueio extensions */

    orqueioAssigneeAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_ASSIGNEE)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioCandidateGroupsAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_CANDIDATE_GROUPS)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioCandidateUsersAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_CANDIDATE_USERS)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioDueDateAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_DUE_DATE)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioFollowUpDateAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_FOLLOW_UP_DATE)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioFormKeyAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_FORM_KEY)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioPriorityAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_PRIORITY)
      .namespace(ORQUEIO_NS)
      .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    planningTableCollection = sequenceBuilder.elementCollection(PlanningTable.class)
        .build();

    planningTableChild = sequenceBuilder.element(PlanningTable.class)
        .minOccurs(0)
        .maxOccurs(1)
        .build();

    typeBuilder.build();
  }

}
