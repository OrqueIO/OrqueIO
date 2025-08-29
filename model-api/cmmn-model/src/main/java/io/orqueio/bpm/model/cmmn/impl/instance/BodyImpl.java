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
package io.orqueio.bpm.model.cmmn.impl.instance;

import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN10_NS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN_ELEMENT_BODY;

import io.orqueio.bpm.model.cmmn.instance.Body;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;


/**
 * @author Roman Smirnov
 *
 */
public class BodyImpl extends CmmnModelElementInstanceImpl implements Body {

  public BodyImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(Body.class, CMMN_ELEMENT_BODY)
      .namespaceUri(CMMN10_NS)
      .instanceProvider(new ModelTypeInstanceProvider<Body>() {
        public Body newInstance(ModelTypeInstanceContext instanceContext) {
          return new BodyImpl(instanceContext);
        }
      });

    typeBuilder.build();
  }



}
