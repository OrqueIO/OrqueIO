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
package io.orqueio.bpm.model.bpmn.impl.instance.camunda;

import java.util.Collection;

import io.orqueio.bpm.model.bpmn.impl.instance.BpmnModelElementInstanceImpl;
import io.orqueio.bpm.model.bpmn.instance.TimerEventDefinition;
import io.orqueio.bpm.model.bpmn.instance.camunda.CamundaField;
import io.orqueio.bpm.model.bpmn.instance.camunda.CamundaScript;
import io.orqueio.bpm.model.bpmn.instance.camunda.CamundaTaskListener;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.ChildElementCollection;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_CLASS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_DELEGATE_EXPRESSION;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_EVENT;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ATTRIBUTE_EXPRESSION;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.CAMUNDA_ELEMENT_TASK_LISTENER;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN taskListener camunda extension element
 *
 * @author Sebastian Menski
 */
public class CamundaTaskListenerImpl extends BpmnModelElementInstanceImpl implements CamundaTaskListener {

  protected static Attribute<String> camundaEventAttribute;
  protected static Attribute<String> camundaClassAttribute;
  protected static Attribute<String> camundaExpressionAttribute;
  protected static Attribute<String> camundaDelegateExpressionAttribute;
  protected static ChildElementCollection<CamundaField> camundaFieldCollection;
  protected static ChildElement<CamundaScript> camundaScriptChild;
  protected static ChildElementCollection<TimerEventDefinition> timeoutCollection;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(CamundaTaskListener.class, CAMUNDA_ELEMENT_TASK_LISTENER)
      .namespaceUri(ORQUEIO_NS)
      .instanceProvider(new ModelTypeInstanceProvider<CamundaTaskListener>() {
        public CamundaTaskListener newInstance(ModelTypeInstanceContext instanceContext) {
          return new CamundaTaskListenerImpl(instanceContext);
        }
      });

    camundaEventAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_EVENT)
      .namespace(ORQUEIO_NS)
      .build();

    camundaClassAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_CLASS)
      .namespace(ORQUEIO_NS)
      .build();

    camundaExpressionAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_EXPRESSION)
      .namespace(ORQUEIO_NS)
      .build();

    camundaDelegateExpressionAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_DELEGATE_EXPRESSION)
      .namespace(ORQUEIO_NS)
      .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    camundaFieldCollection = sequenceBuilder.elementCollection(CamundaField.class)
      .build();

    camundaScriptChild = sequenceBuilder.element(CamundaScript.class)
      .build();

    timeoutCollection = sequenceBuilder.element(TimerEventDefinition.class)
      .build();

    typeBuilder.build();
  }

  public CamundaTaskListenerImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getCamundaEvent() {
    return camundaEventAttribute.getValue(this);
  }

  public void setCamundaEvent(String camundaEvent) {
    camundaEventAttribute.setValue(this, camundaEvent);
  }

  public String getCamundaClass() {
    return camundaClassAttribute.getValue(this);
  }

  public void setCamundaClass(String camundaClass) {
    camundaClassAttribute.setValue(this, camundaClass);
  }

  public String getCamundaExpression() {
    return camundaExpressionAttribute.getValue(this);
  }

  public void setCamundaExpression(String camundaExpression) {
    camundaExpressionAttribute.setValue(this, camundaExpression);
  }

  public String getCamundaDelegateExpression() {
    return camundaDelegateExpressionAttribute.getValue(this);
  }

  public void setCamundaDelegateExpression(String camundaDelegateExpression) {
    camundaDelegateExpressionAttribute.setValue(this, camundaDelegateExpression);
  }

  public Collection<CamundaField> getCamundaFields() {
    return camundaFieldCollection.get(this);
  }

  public CamundaScript getCamundaScript() {
    return camundaScriptChild.getChild(this);
  }

  public void setCamundaScript(CamundaScript camundaScript) {
    camundaScriptChild.setChild(this, camundaScript);
  }

  public Collection<TimerEventDefinition> getTimeouts() {
    return timeoutCollection.get(this);
  }

}
