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
import io.orqueio.bpm.model.bpmn.builder.IntermediateThrowEventBuilder;
import io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants;
import io.orqueio.bpm.model.bpmn.instance.IntermediateThrowEvent;
import io.orqueio.bpm.model.bpmn.instance.ThrowEvent;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ELEMENT_INTERMEDIATE_THROW_EVENT;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN intermediateThrowEvent element
 *
 * @author Sebastian Menski
 */
public class IntermediateThrowEventImpl extends ThrowEventImpl implements IntermediateThrowEvent {
  
  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(IntermediateThrowEvent.class, BPMN_ELEMENT_INTERMEDIATE_THROW_EVENT)
      .namespaceUri(BpmnModelConstants.BPMN20_NS)
      .extendsType(ThrowEvent.class)
      .instanceProvider(new ModelTypeInstanceProvider<IntermediateThrowEvent>() {
        public IntermediateThrowEvent newInstance(ModelTypeInstanceContext instanceContext) {
          return new IntermediateThrowEventImpl(instanceContext);
        }
      });

    typeBuilder.build();
  }

  public IntermediateThrowEventImpl(ModelTypeInstanceContext context) {
    super(context);
  }

  @Override
  public IntermediateThrowEventBuilder builder() {
    return new IntermediateThrowEventBuilder((BpmnModelInstance) modelInstance, this);
  }
}
