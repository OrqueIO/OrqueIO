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

import io.orqueio.bpm.model.bpmn.builder.AbstractTaskBuilder;
import io.orqueio.bpm.model.bpmn.instance.Activity;
import io.orqueio.bpm.model.bpmn.instance.Task;
import io.orqueio.bpm.model.bpmn.instance.bpmndi.BpmnShape;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.impl.util.ModelTypeException;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.*;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN task element
 *
 * @author Sebastian Menski
 */
public class TaskImpl extends ActivityImpl implements Task {

  /** orqueio extensions */

  protected static Attribute<Boolean> orqueioAsyncAttribute;


  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(Task.class, BPMN_ELEMENT_TASK)
      .namespaceUri(BPMN20_NS)
      .extendsType(Activity.class)
      .instanceProvider(new ModelTypeInstanceProvider<Task>() {
        public Task newInstance(ModelTypeInstanceContext instanceContext) {
          return new TaskImpl(instanceContext);
        }
      });

    /** orqueio extensions */

    orqueioAsyncAttribute = typeBuilder.booleanAttribute(CAMUNDA_ATTRIBUTE_ASYNC)
      .namespace(CAMUNDA_NS)
      .defaultValue(false)
      .build();

    typeBuilder.build();
  }

  public TaskImpl(ModelTypeInstanceContext context) {
    super(context);
  }

  @SuppressWarnings("rawtypes")
  public AbstractTaskBuilder builder() {
    throw new ModelTypeException("No builder implemented.");
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


  public BpmnShape getDiagramElement() {
    return (BpmnShape) super.getDiagramElement();
  }

}
