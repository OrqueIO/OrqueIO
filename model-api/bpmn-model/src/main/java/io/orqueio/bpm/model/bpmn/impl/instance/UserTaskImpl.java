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
package io.orqueio.bpm.model.bpmn.impl.instance;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN20_NS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ATTRIBUTE_IMPLEMENTATION;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ELEMENT_USER_TASK;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_ASSIGNEE;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_CANDIDATE_GROUPS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_CANDIDATE_USERS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_DUE_DATE;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_FOLLOW_UP_DATE;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_FORM_HANDLER_CLASS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_FORM_KEY;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_FORM_REF;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_FORM_REF_BINDING;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_FORM_REF_VERSION;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_PRIORITY;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;

import java.util.Collection;
import java.util.List;

import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.builder.UserTaskBuilder;
import io.orqueio.bpm.model.bpmn.instance.Rendering;
import io.orqueio.bpm.model.bpmn.instance.Task;
import io.orqueio.bpm.model.bpmn.instance.UserTask;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.impl.util.StringUtil;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.ChildElementCollection;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

/**
 * The BPMN userTask element
 *
 * @author Sebastian Menski
 */
public class UserTaskImpl extends TaskImpl implements UserTask {

  protected static Attribute<String> implementationAttribute;
  protected static ChildElementCollection<Rendering> renderingCollection;

  /** orqueio extensions */

  protected static Attribute<String> orqueioAssigneeAttribute;
  protected static Attribute<String> orqueioCandidateGroupsAttribute;
  protected static Attribute<String> orqueioCandidateUsersAttribute;
  protected static Attribute<String> orqueioDueDateAttribute;
  protected static Attribute<String> orqueioFollowUpDateAttribute;
  protected static Attribute<String> orqueioFormHandlerClassAttribute;
  protected static Attribute<String> orqueioFormKeyAttribute;
  protected static Attribute<String> orqueioFormRefAttribute;
  protected static Attribute<String> orqueioFormRefBindingAttribute;
  protected static Attribute<String> orqueioFormRefVersionAttribute;
  protected static Attribute<String> orqueioPriorityAttribute;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(UserTask.class, BPMN_ELEMENT_USER_TASK)
      .namespaceUri(BPMN20_NS)
      .extendsType(Task.class)
      .instanceProvider(new ModelTypeInstanceProvider<UserTask>() {
        public UserTask newInstance(ModelTypeInstanceContext instanceContext) {
          return new UserTaskImpl(instanceContext);
        }
      });

    implementationAttribute = typeBuilder.stringAttribute(BPMN_ATTRIBUTE_IMPLEMENTATION)
      .defaultValue("##unspecified")
      .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    renderingCollection = sequenceBuilder.elementCollection(Rendering.class)
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

    orqueioFormHandlerClassAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_FORM_HANDLER_CLASS)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioFormKeyAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_FORM_KEY)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioFormRefAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_FORM_REF)
        .namespace(ORQUEIO_NS)
        .build();

    orqueioFormRefBindingAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_FORM_REF_BINDING)
        .namespace(ORQUEIO_NS)
        .build();

    orqueioFormRefVersionAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_FORM_REF_VERSION)
        .namespace(ORQUEIO_NS)
        .build();

    orqueioPriorityAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_PRIORITY)
      .namespace(ORQUEIO_NS)
      .build();

    typeBuilder.build();
  }

  public UserTaskImpl(ModelTypeInstanceContext context) {
    super(context);
  }

  @Override
  public UserTaskBuilder builder() {
    return new UserTaskBuilder((BpmnModelInstance) modelInstance, this);
  }

  public String getImplementation() {
    return implementationAttribute.getValue(this);
  }

  public void setImplementation(String implementation) {
    implementationAttribute.setValue(this, implementation);
  }

  public Collection<Rendering> getRenderings() {
    return renderingCollection.get(this);
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

  public String getOrqueioFormHandlerClass() {
    return orqueioFormHandlerClassAttribute.getValue(this);
  }

  public void setOrqueioFormHandlerClass(String orqueioFormHandlerClass) {
    orqueioFormHandlerClassAttribute.setValue(this, orqueioFormHandlerClass);
  }

  public String getOrqueioFormKey() {
    return orqueioFormKeyAttribute.getValue(this);
  }

  public void setOrqueioFormKey(String orqueioFormKey) {
    orqueioFormKeyAttribute.setValue(this, orqueioFormKey);
  }

  public String getOrqueioFormRef() {
    return orqueioFormRefAttribute.getValue(this);
  }

  public void setOrqueioFormRef(String orqueioFormRef) {
    orqueioFormRefAttribute.setValue(this, orqueioFormRef);
  }

  public String getOrqueioFormRefBinding() {
    return orqueioFormRefBindingAttribute.getValue(this);
  }

  public void setOrqueioFormRefBinding(String orqueioFormRefBinding) {
    orqueioFormRefBindingAttribute.setValue(this, orqueioFormRefBinding);
  }

  public String getOrqueioFormRefVersion() {
    return orqueioFormRefVersionAttribute.getValue(this);
  }

  public void setOrqueioFormRefVersion(String orqueioFormRefVersion) {
    orqueioFormRefVersionAttribute.setValue(this, orqueioFormRefVersion);
  }

  public String getOrqueioPriority() {
    return orqueioPriorityAttribute.getValue(this);
  }

  public void setOrqueioPriority(String orqueioPriority) {
    orqueioPriorityAttribute.setValue(this, orqueioPriority);
  }
}
