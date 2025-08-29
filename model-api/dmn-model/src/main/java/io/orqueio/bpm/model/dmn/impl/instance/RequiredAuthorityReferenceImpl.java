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
package io.orqueio.bpm.model.dmn.impl.instance;

import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.LATEST_DMN_NS;
import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.DMN_ELEMENT_REQUIRED_AUTHORITY;

import io.orqueio.bpm.model.dmn.instance.DmnElementReference;
import io.orqueio.bpm.model.dmn.instance.RequiredAuthorityReference;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

public class RequiredAuthorityReferenceImpl extends DmnElementReferenceImpl implements RequiredAuthorityReference {

  public RequiredAuthorityReferenceImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(RequiredAuthorityReference.class, DMN_ELEMENT_REQUIRED_AUTHORITY)
      .namespaceUri(LATEST_DMN_NS)
      .extendsType(DmnElementReference.class)
      .instanceProvider(new ModelTypeInstanceProvider<RequiredAuthorityReference>() {
        public RequiredAuthorityReference newInstance(ModelTypeInstanceContext instanceContext) {
          return new RequiredAuthorityReferenceImpl(instanceContext);
        }
      });

    typeBuilder.build();
  }

}
