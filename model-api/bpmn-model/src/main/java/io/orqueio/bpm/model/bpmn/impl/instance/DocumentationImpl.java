/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. Camunda licenses this file to you under the Apache License,
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

import io.orqueio.bpm.model.bpmn.instance.Documentation;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.*;

/**
 * The BPMN documentation element
 *
 * @author Daniel Meyer
 * @author Sebastian Menski
 */
public class DocumentationImpl extends BpmnModelElementInstanceImpl implements Documentation {

  protected static Attribute<String> idAttribute;
  protected static Attribute<String> textFormatAttribute;

  public static void registerType(ModelBuilder modelBuilder) {

    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(Documentation.class, BPMN_ELEMENT_DOCUMENTATION)
      .namespaceUri(BPMN20_NS)
      .instanceProvider(new ModelTypeInstanceProvider<Documentation>() {
        public Documentation newInstance(ModelTypeInstanceContext instanceContext) {
          return new DocumentationImpl(instanceContext);
        }
      });

    idAttribute = typeBuilder.stringAttribute(BPMN_ATTRIBUTE_ID)
      .idAttribute()
      .build();

    textFormatAttribute = typeBuilder.stringAttribute(BPMN_ATTRIBUTE_TEXT_FORMAT)
      .defaultValue("text/plain")
      .build();

    typeBuilder.build();
  }

  public DocumentationImpl(ModelTypeInstanceContext context) {
    super(context);
  }

  public String getId() {
    return idAttribute.getValue(this);
  }

  public void setId(String id) {
    idAttribute.setValue(this, id);
  }

  public String getTextFormat() {
    return textFormatAttribute.getValue(this);
  }

  public void setTextFormat(String textFormat) {
    textFormatAttribute.setValue(this, textFormat);
  }

}
