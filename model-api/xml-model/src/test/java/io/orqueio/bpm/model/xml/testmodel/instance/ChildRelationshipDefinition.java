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
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

import static io.orqueio.bpm.model.xml.testmodel.TestModelConstants.MODEL_NAMESPACE;
import static io.orqueio.bpm.model.xml.testmodel.TestModelConstants.TYPE_NAME_CHILD_RELATIONSHIP_DEFINITION;

/**
 * @author Sebastian Menski
 */
public class ChildRelationshipDefinition extends RelationshipDefinition {

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(ChildRelationshipDefinition.class, TYPE_NAME_CHILD_RELATIONSHIP_DEFINITION)
      .namespaceUri(MODEL_NAMESPACE)
      .extendsType(RelationshipDefinition.class)
      .instanceProvider(new ModelTypeInstanceProvider<ChildRelationshipDefinition>() {

        public ChildRelationshipDefinition newInstance(ModelTypeInstanceContext instanceContext) {
          return new ChildRelationshipDefinition(instanceContext);
        }
      });

    typeBuilder.build();
  }

  public ChildRelationshipDefinition(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }
}
