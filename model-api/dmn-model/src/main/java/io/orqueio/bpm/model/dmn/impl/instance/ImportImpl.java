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
import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.DMN_ATTRIBUTE_IMPORT_TYPE;
import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.DMN_ATTRIBUTE_LOCATION_URI;
import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.DMN_ATTRIBUTE_NAMESPACE;
import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.DMN_ELEMENT_IMPORT;

import io.orqueio.bpm.model.dmn.instance.Import;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;

public class ImportImpl extends DmnModelElementInstanceImpl implements Import {

  protected static Attribute<String> namespaceAttribute;
  protected static Attribute<String> locationUriAttribute;
  protected static Attribute<String> importTypeAttribute;

  public ImportImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getNamespace() {
    return namespaceAttribute.getValue(this);
  }

  public void setNamespace(String namespace) {
    namespaceAttribute.setValue(this, namespace);
  }

  public String getLocationUri() {
    return locationUriAttribute.getValue(this);
  }

  public void setLocationUri(String locationUri) {
    locationUriAttribute.setValue(this, locationUri);
  }

  public String getImportType() {
    return importTypeAttribute.getValue(this);
  }

  public void setImportType(String importType) {
    importTypeAttribute.setValue(this, importType);
  }

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(Import.class, DMN_ELEMENT_IMPORT)
      .namespaceUri(LATEST_DMN_NS)
      .instanceProvider(new ModelTypeInstanceProvider<Import>() {
        public Import newInstance(ModelTypeInstanceContext instanceContext) {
          return new ImportImpl(instanceContext);
        }
      });

    namespaceAttribute = typeBuilder.stringAttribute(DMN_ATTRIBUTE_NAMESPACE)
      .required()
      .build();

    locationUriAttribute = typeBuilder.stringAttribute(DMN_ATTRIBUTE_LOCATION_URI)
      .build();

    importTypeAttribute = typeBuilder.stringAttribute(DMN_ATTRIBUTE_IMPORT_TYPE)
      .required()
      .build();

    typeBuilder.build();
  }

}
