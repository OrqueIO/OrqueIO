/*
 * Copyright TOADDLATERCCS and/or licensed to TOADDLATERCCS
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. TOADDLATERCCS this file to you under the Apache License,
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
package io.orqueio.bpm.model.xml.testmodel.instance;

import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelElementInstanceImpl;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.reference.AttributeReference;

import static io.orqueio.bpm.model.xml.testmodel.TestModelConstants.*;

/**
 * @author Sebastian Menski
 */
public abstract class RelationshipDefinition extends ModelElementInstanceImpl {

  protected static Attribute<String> idAttr;
  protected static AttributeReference<Animal> animalRef;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(RelationshipDefinition.class, TYPE_NAME_RELATIONSHIP_DEFINITION)
      .namespaceUri(MODEL_NAMESPACE)
      .abstractType();

    idAttr = typeBuilder.stringAttribute(ATTRIBUTE_NAME_ID)
      .idAttribute()
      .build();

    animalRef = typeBuilder.stringAttribute(ATTRIBUTE_NAME_ANIMAL_REF)
      .idAttributeReference(Animal.class)
      .build();

    typeBuilder.build();
  }

  public RelationshipDefinition(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getId() {
    return idAttr.getValue(this);
  }

  public void setId(String id) {
    idAttr.setValue(this, id);
  }

  public void setAnimal(Animal animalInRelationshipWith) {
    animalRef.setReferenceTargetElement(this, animalInRelationshipWith);
  }

  public Animal getAnimal() {
    return animalRef.getReferenceTargetElement(this);
  }
}
