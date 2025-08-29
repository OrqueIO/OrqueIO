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
import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.DMN_ATTRIBUTE_URI;
import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.DMN_ELEMENT_BUSINESS_CONTEXT_ELEMENT;

import io.orqueio.bpm.model.dmn.instance.BusinessContextElement;
import io.orqueio.bpm.model.dmn.instance.NamedElement;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;

public abstract class BusinessContextElementImpl extends NamedElementImpl implements BusinessContextElement {

  protected static Attribute<String> uriAttribute;

  public BusinessContextElementImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getUri() {
    return uriAttribute.getValue(this);
  }

  public void setUri(String uri) {
    uriAttribute.setValue(this, uri);
  }

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(BusinessContextElement.class, DMN_ELEMENT_BUSINESS_CONTEXT_ELEMENT)
      .namespaceUri(LATEST_DMN_NS)
      .extendsType(NamedElement.class)
      .abstractType();

    uriAttribute = typeBuilder.stringAttribute(DMN_ATTRIBUTE_URI)
      .build();

    typeBuilder.build();
  }

}
