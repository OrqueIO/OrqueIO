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

import io.orqueio.bpm.model.bpmn.instance.Expression;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN20_NS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ELEMENT_FROM;

/**
 * The BPMN from element of the BPMN tAssignment type
 *
 * @author Sebastian Menski
 */
public class From extends ExpressionImpl {

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(From.class, BPMN_ELEMENT_FROM)
      .namespaceUri(BPMN20_NS)
      .extendsType(Expression.class)
      .instanceProvider(new ModelElementTypeBuilder.ModelTypeInstanceProvider<From>() {
        public From newInstance(ModelTypeInstanceContext instanceContext) {
          return new From(instanceContext);
        }
      });

    typeBuilder.build();
  }

  public From(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }
}
