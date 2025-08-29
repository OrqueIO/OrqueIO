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

import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.builder.ParallelGatewayBuilder;
import io.orqueio.bpm.model.bpmn.instance.Gateway;
import io.orqueio.bpm.model.bpmn.instance.ParallelGateway;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN20_NS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ELEMENT_PARALLEL_GATEWAY;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_ASYNC;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_EXCLUSIVE;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN parallelGateway element
 *
 * @author Sebastian Menski
 */
public class ParallelGatewayImpl extends GatewayImpl implements ParallelGateway {

  protected static Attribute<Boolean> orqueioAsyncAttribute;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(ParallelGateway.class, BPMN_ELEMENT_PARALLEL_GATEWAY)
      .namespaceUri(BPMN20_NS)
      .extendsType(Gateway.class)
      .instanceProvider(new ModelTypeInstanceProvider<ParallelGateway>() {
        public ParallelGateway newInstance(ModelTypeInstanceContext instanceContext) {
          return new ParallelGatewayImpl(instanceContext);
        }
      });

    /** orqueio extensions */

    orqueioAsyncAttribute = typeBuilder.booleanAttribute(ORQUEIO_ATTRIBUTE_ASYNC)
      .namespace(ORQUEIO_NS)
      .defaultValue(false)
      .build();

    typeBuilder.build();
  }

  @Override
  public ParallelGatewayBuilder builder() {
    return new ParallelGatewayBuilder((BpmnModelInstance) modelInstance, this);
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

  public ParallelGatewayImpl(ModelTypeInstanceContext context) {
    super(context);
  }

}
