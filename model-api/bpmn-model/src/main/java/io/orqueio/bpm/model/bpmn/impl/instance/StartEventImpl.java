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

import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.builder.StartEventBuilder;
import io.orqueio.bpm.model.bpmn.instance.CatchEvent;
import io.orqueio.bpm.model.bpmn.instance.StartEvent;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.*;

/**
 * The BPMN startEvent element
 *
 * @author Sebastian Menski
 */
public class StartEventImpl extends CatchEventImpl implements StartEvent {

  protected static Attribute<Boolean> isInterruptingAttribute;

  /** orqueio extensions */

  protected static Attribute<Boolean> orqueioAsyncAttribute;
  protected static Attribute<String> orqueioFormHandlerClassAttribute;
  protected static Attribute<String> orqueioFormKeyAttribute;
  protected static Attribute<String> orqueioFormRefAttribute;
  protected static Attribute<String> orqueioFormRefBindingAttribute;
  protected static Attribute<String> orqueioFormRefVersionAttribute;
  protected static Attribute<String> orqueioInitiatorAttribute;

  public static void registerType(ModelBuilder modelBuilder) {

    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(StartEvent.class, BPMN_ELEMENT_START_EVENT)
      .namespaceUri(BPMN20_NS)
      .extendsType(CatchEvent.class)
      .instanceProvider(new ModelElementTypeBuilder.ModelTypeInstanceProvider<StartEvent>() {
        public StartEvent newInstance(ModelTypeInstanceContext instanceContext) {
          return new StartEventImpl(instanceContext);
        }
      });

    isInterruptingAttribute = typeBuilder.booleanAttribute(BPMN_ATTRIBUTE_IS_INTERRUPTING)
      .defaultValue(true)
      .build();

    /** orqueio extensions */

    orqueioAsyncAttribute = typeBuilder.booleanAttribute(ORQUEIO_ATTRIBUTE_ASYNC)
      .namespace(ORQUEIO_NS)
      .defaultValue(false)
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

    orqueioInitiatorAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_INITIATOR)
      .namespace(ORQUEIO_NS)
      .build();

    typeBuilder.build();
  }

  public StartEventImpl(ModelTypeInstanceContext context) {
    super(context);
  }

  @Override
  public StartEventBuilder builder() {
    return new StartEventBuilder((BpmnModelInstance) modelInstance, this);
  }

  public boolean isInterrupting() {
    return isInterruptingAttribute.getValue(this);
  }

  public void setInterrupting(boolean isInterrupting) {
    isInterruptingAttribute.setValue(this, isInterrupting);
  }

  /** orqueio extensions */

  /**
   * @deprecated use isOrqueioAsyncBefore() instead.
   */
  @Deprecated
  public boolean isOrqueioAsync() {
    return orqueioAsyncAttribute.getValue(this);
  }

  /**
   * @deprecated use setOrqueioAsyncBefore(isOrqueioAsyncBefore) instead.
   */
  @Deprecated
  public void setOrqueioAsync(boolean isOrqueioAsync) {
    orqueioAsyncAttribute.setValue(this, isOrqueioAsync);
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

  public String getOrqueioInitiator() {
    return orqueioInitiatorAttribute.getValue(this);
  }

  public void setOrqueioInitiator(String orqueioInitiator) {
    orqueioInitiatorAttribute.setValue(this, orqueioInitiator);
  }
}
