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

import java.util.List;
import io.orqueio.bpm.model.bpmn.instance.Condition;
import io.orqueio.bpm.model.bpmn.instance.ConditionalEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.EventDefinition;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN20_NS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ELEMENT_CONDITIONAL_EVENT_DEFINITION;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_VARIABLE_NAME;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;
import io.orqueio.bpm.model.xml.impl.util.StringUtil;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_VARIABLE_EVENTS;

/**
 * The BPMN conditionalEventDefinition element
 *
 * @author Sebastian Menski
 */
public class ConditionalEventDefinitionImpl extends EventDefinitionImpl implements ConditionalEventDefinition {

  protected static ChildElement<Condition> conditionChild;
  protected static Attribute<String> orqueioVariableName;
  protected static Attribute<String> orqueioVariableEvents;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(ConditionalEventDefinition.class, BPMN_ELEMENT_CONDITIONAL_EVENT_DEFINITION)
      .namespaceUri(BPMN20_NS)
      .extendsType(EventDefinition.class)
      .instanceProvider(new ModelTypeInstanceProvider<ConditionalEventDefinition>() {
        
        @Override
        public ConditionalEventDefinition newInstance(ModelTypeInstanceContext instanceContext) {
          return new ConditionalEventDefinitionImpl(instanceContext);
        }
      });

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    conditionChild = sequenceBuilder.element(Condition.class)
      .required()
      .build();

    /** orqueio extensions */

    orqueioVariableName = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_VARIABLE_NAME)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioVariableEvents = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_VARIABLE_EVENTS)
      .namespace(ORQUEIO_NS)
      .build();

    typeBuilder.build();
  }

  public ConditionalEventDefinitionImpl(ModelTypeInstanceContext context) {
    super(context);
  }

  @Override
  public Condition getCondition() {
    return conditionChild.getChild(this);
  }

  @Override
  public void setCondition(Condition condition) {
    conditionChild.setChild(this, condition);
  }

  @Override
  public String getOrqueioVariableName() {
    return orqueioVariableName.getValue(this);
  }

  @Override
  public void setOrqueioVariableName(String variableName) {
    orqueioVariableName.setValue(this, variableName);
  }

  @Override
  public String getOrqueioVariableEvents() {
    return orqueioVariableEvents.getValue(this);
  }

  @Override
  public void setOrqueioVariableEvents(String variableEvents) {
    orqueioVariableEvents.setValue(this, variableEvents);
  }

  @Override
  public List<String> getOrqueioVariableEventsList() {
    String variableEvents = orqueioVariableEvents.getValue(this);
    return StringUtil.splitCommaSeparatedList(variableEvents);
  }

  @Override
  public void setOrqueioVariableEventsList(List<String> variableEventsList) {
    String variableEvents = StringUtil.joinCommaSeparatedList(variableEventsList);
    orqueioVariableEvents.setValue(this, variableEvents);
  }
}
