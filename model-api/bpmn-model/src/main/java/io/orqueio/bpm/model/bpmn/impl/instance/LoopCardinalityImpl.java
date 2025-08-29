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
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ELEMENT_LOOP_CARDINALITY;

import io.orqueio.bpm.model.bpmn.instance.Expression;
import io.orqueio.bpm.model.bpmn.instance.LoopCardinality;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The loopCardinality element from the tMultiInstanceLoopCharacteristics
 * complex type
 * 
 * @author Filip Hrisafov
 */
public class LoopCardinalityImpl extends ExpressionImpl implements LoopCardinality {

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder
      .defineType(LoopCardinality.class, BPMN_ELEMENT_LOOP_CARDINALITY)
      .namespaceUri(BPMN20_NS)
      .extendsType(Expression.class)
      .instanceProvider(new ModelTypeInstanceProvider<LoopCardinality>() {
        public LoopCardinality newInstance(ModelTypeInstanceContext instanceContext) {
          return new LoopCardinalityImpl(instanceContext);
        }
      });

    typeBuilder.build();
  }

  public LoopCardinalityImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

}
