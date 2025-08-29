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

import static io.orqueio.bpm.model.xml.testmodel.TestModelConstants.NEWER_NAMESPACE;
import static io.orqueio.bpm.model.xml.testmodel.TestModelConstants.TYPE_NAME_WINGS;

import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelElementInstanceImpl;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * @author Ronny Bräunlich
 *
 */
public class Wings extends ModelElementInstanceImpl{

  /**
   * @param instanceContext
   */
  public Wings(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public static void registerType(ModelBuilder modelBuilder) {

    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(Wings.class, TYPE_NAME_WINGS)
      .namespaceUri(NEWER_NAMESPACE)
      .instanceProvider(new ModelTypeInstanceProvider<Wings>() {
        @Override
        public Wings newInstance(ModelTypeInstanceContext instanceContext) {
          return new Wings(instanceContext);
        }
      });

    typeBuilder.build();
  }

}
