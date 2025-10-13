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
package io.orqueio.bpm.model.cmmn.impl.instance.orqueio;

import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CAMUNDA_ATTRIBUTE_CLASS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CAMUNDA_ATTRIBUTE_DELEGATE_EXPRESSION;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CAMUNDA_ATTRIBUTE_EVENT;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CAMUNDA_ATTRIBUTE_EXPRESSION;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CAMUNDA_ELEMENT_VARIABLE_LISTENER;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CAMUNDA_NS;

import java.util.Collection;

import io.orqueio.bpm.model.cmmn.impl.instance.CmmnModelElementInstanceImpl;
import io.orqueio.bpm.model.cmmn.instance.orqueio.OrqueioField;
import io.orqueio.bpm.model.cmmn.instance.orqueio.OrqueioScript;
import io.orqueio.bpm.model.cmmn.instance.orqueio.OrqueioVariableListener;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.ChildElementCollection;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

/**
 * @author Thorben Lindhauer
 */
public class OrqueioVariableListenerImpl extends CmmnModelElementInstanceImpl implements OrqueioVariableListener {

  protected static Attribute<String> orqueioEventAttribute;
  protected static Attribute<String> orqueioClassAttribute;
  protected static Attribute<String> orqueioExpressionAttribute;
  protected static Attribute<String> orqueioDelegateExpressionAttribute;
  protected static ChildElementCollection<OrqueioField> orqueioFieldCollection;
  protected static ChildElement<OrqueioScript> orqueioScriptChild;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrqueioVariableListener.class, CAMUNDA_ELEMENT_VARIABLE_LISTENER)
      .namespaceUri(CAMUNDA_NS)
      .instanceProvider(new ModelTypeInstanceProvider<OrqueioVariableListener>() {
        public OrqueioVariableListener newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrqueioVariableListenerImpl(instanceContext);
        }
      });

    orqueioEventAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_EVENT)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioClassAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_CLASS)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioExpressionAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_EXPRESSION)
        .namespace(CAMUNDA_NS)
        .build();

    orqueioDelegateExpressionAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_DELEGATE_EXPRESSION)
      .namespace(CAMUNDA_NS)
      .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    orqueioFieldCollection = sequenceBuilder.elementCollection(OrqueioField.class)
      .build();

    orqueioScriptChild = sequenceBuilder.element(OrqueioScript.class)
      .build();

    typeBuilder.build();
  }

  public OrqueioVariableListenerImpl(ModelTypeInstanceContext instanceContext) {
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

  public OrqueioScript getOrqueioScript() {
    return orqueioScriptChild.getChild(this);
  }

  public void setOrqueioScript(OrqueioScript orqueioScript) {
    orqueioScriptChild.setChild(this, orqueioScript);
  }

  public Collection<OrqueioField> getOrqueioFields() {
    return orqueioFieldCollection.get(this);
  }

}
