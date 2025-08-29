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
package io.orqueio.bpm.model.bpmn.impl.instance.orqueio;

import java.util.Collection;

import io.orqueio.bpm.model.bpmn.impl.instance.BpmnModelElementInstanceImpl;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioExecutionListener;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioField;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioScript;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.ChildElementCollection;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_CLASS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_DELEGATE_EXPRESSION;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_EVENT;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_EXPRESSION;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ELEMENT_EXECUTION_LISTENER;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN executionListener orqueio extension element
 *
 * @author Sebastian Menski
 */
public class OrqueioExecutionListenerImpl extends BpmnModelElementInstanceImpl implements OrqueioExecutionListener {

  protected static Attribute<String> orqueioEventAttribute;
  protected static Attribute<String> orqueioClassAttribute;
  protected static Attribute<String> orqueioExpressionAttribute;
  protected static Attribute<String> orqueioDelegateExpressionAttribute;
  protected static ChildElementCollection<OrqueioField> orqueioFieldCollection;
  protected static ChildElement<OrqueioScript> orqueioScriptChild;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrqueioExecutionListener.class, ORQUEIO_ELEMENT_EXECUTION_LISTENER)
      .namespaceUri(ORQUEIO_NS)
      .instanceProvider(new ModelTypeInstanceProvider<OrqueioExecutionListener>() {
        public OrqueioExecutionListener newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrqueioExecutionListenerImpl(instanceContext);
        }
      });

    orqueioEventAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_EVENT)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioClassAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_CLASS)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioExpressionAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_EXPRESSION)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioDelegateExpressionAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_DELEGATE_EXPRESSION)
      .namespace(ORQUEIO_NS)
      .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    orqueioFieldCollection = sequenceBuilder.elementCollection(OrqueioField.class)
      .build();

    orqueioScriptChild = sequenceBuilder.element(OrqueioScript.class)
      .build();

    typeBuilder.build();
  }

  public OrqueioExecutionListenerImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getOrqueioEvent() {
    return orqueioEventAttribute.getValue(this);
  }

  public void setOrqueioEvent(String orqueioEvent) {
    orqueioEventAttribute.setValue(this, orqueioEvent);
  }

  public String getOrqueioClass() {
    return orqueioClassAttribute.getValue(this);
  }

  public void setOrqueioClass(String orqueioClass) {
    orqueioClassAttribute.setValue(this, orqueioClass);
  }

  public String getOrqueioExpression() {
    return orqueioExpressionAttribute.getValue(this);
  }

  public void setOrqueioExpression(String orqueioExpression) {
    orqueioExpressionAttribute.setValue(this, orqueioExpression);
  }

  public String getOrqueioDelegateExpression() {
    return orqueioDelegateExpressionAttribute.getValue(this);
  }

  public void setOrqueioDelegateExpression(String orqueioDelegateExpression) {
    orqueioDelegateExpressionAttribute.setValue(this, orqueioDelegateExpression);
  }

  public Collection<OrqueioField> getOrqueioFields() {
    return orqueioFieldCollection.get(this);
  }

  public OrqueioScript getOrqueioScript() {
    return orqueioScriptChild.getChild(this);
  }

  public void setOrqueioScript(OrqueioScript orqueioScript) {
    orqueioScriptChild.setChild(this, orqueioScript);
  }

}
