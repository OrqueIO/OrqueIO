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

import io.orqueio.bpm.model.bpmn.instance.ItemDefinition;
import io.orqueio.bpm.model.bpmn.instance.RootElement;
import io.orqueio.bpm.model.bpmn.instance.Signal;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.reference.AttributeReference;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.*;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN signal element
 *
 * @author Sebastian Menski
 */
public class SignalImpl extends BaseElementImpl implements Signal {

  protected static Attribute<String> nameAttribute;
  protected static AttributeReference<ItemDefinition> structureRefAttribute;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(Signal.class, BPMN_ELEMENT_SIGNAL)
      .namespaceUri(BPMN20_NS)
      .extendsType(RootElement.class)
      .instanceProvider(new ModelTypeInstanceProvider<Signal>() {
        public Signal newInstance(ModelTypeInstanceContext instanceContext) {
          return new SignalImpl(instanceContext);
        }
      });

    nameAttribute = typeBuilder.stringAttribute(BPMN_ATTRIBUTE_NAME)
      .build();

    structureRefAttribute = typeBuilder.stringAttribute(BPMN_ATTRIBUTE_STRUCTURE_REF)
      .qNameAttributeReference(ItemDefinition.class)
      .build();

    typeBuilder.build();
  }

  public SignalImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getName() {
    return nameAttribute.getValue(this);
  }

  public void setName(String name) {
    nameAttribute.setValue(this, name);
  }

  public ItemDefinition getStructure() {
    return structureRefAttribute.getReferenceTargetElement(this);
  }

  public void setStructure(ItemDefinition structure) {
    structureRefAttribute.setReferenceTargetElement(this, structure);
  }

}
