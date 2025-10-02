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
package io.orqueio.bpm.model.bpmn.impl.instance.orqueio;

import io.orqueio.bpm.model.bpmn.impl.instance.BpmnModelElementInstanceImpl;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioScript;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_RESOURCE;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ATTRIBUTE_SCRIPT_FORMAT;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ELEMENT_SCRIPT;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;

/**
 * The BPMN script orqueio extension element
 *
 * @author Sebastian Menski
 */
public class OrqueioScriptImpl extends BpmnModelElementInstanceImpl implements OrqueioScript {

  protected static Attribute<String> orqueioScriptFormatAttribute;
  protected static Attribute<String> orqueioResourceAttribute;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrqueioScript.class, ORQUEIO_ELEMENT_SCRIPT)
      .namespaceUri(ORQUEIO_NS)
      .instanceProvider(new ModelTypeInstanceProvider<OrqueioScript>() {
        public OrqueioScript newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrqueioScriptImpl(instanceContext);
        }
      });

    orqueioScriptFormatAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_SCRIPT_FORMAT)
      .required()
      .build();

    orqueioResourceAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_RESOURCE)
      .build();

    typeBuilder.build();
  }

  public OrqueioScriptImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getOrqueioScriptFormat() {
    return orqueioScriptFormatAttribute.getValue(this);
  }

  public void setOrqueioScriptFormat(String orqueioScriptFormat) {
    orqueioScriptFormatAttribute.setValue(this, orqueioScriptFormat);
  }

  public String getOrqueioResource() {
    return orqueioResourceAttribute.getValue(this);
  }

  public void setOrqueioResource(String orqueioResource) {
    orqueioResourceAttribute.setValue(this, orqueioResource);
  }
}
