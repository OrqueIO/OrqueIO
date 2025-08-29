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

import io.orqueio.bpm.model.bpmn.impl.instance.BpmnModelElementInstanceImpl;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioValue;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.*;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN value orqueio extension element
 *
 * @author Sebastian Menski
 */
public class OrqueioValueImpl extends BpmnModelElementInstanceImpl implements OrqueioValue {

  protected static Attribute<String> orqueioIdAttribute;
  protected static Attribute<String> orqueioNameAttribute;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrqueioValue.class, ORQUEIO_ELEMENT_VALUE)
      .namespaceUri(ORQUEIO_NS)
      .instanceProvider(new ModelTypeInstanceProvider<OrqueioValue>() {
        public OrqueioValue newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrqueioValueImpl(instanceContext);
        }
      });

    orqueioIdAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_ID)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioNameAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_NAME)
      .namespace(ORQUEIO_NS)
      .build();

    typeBuilder.build();
  }

  public OrqueioValueImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getOrqueioId() {
    return orqueioIdAttribute.getValue(this);
  }

  public void setOrqueioId(String orqueioId) {
    orqueioIdAttribute.setValue(this, orqueioId);
  }

  public String getOrqueioName() {
    return orqueioNameAttribute.getValue(this);
  }

  public void setOrqueioName(String orqueioName) {
    orqueioNameAttribute.setValue(this, orqueioName);
  }
}
