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

import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.builder.ScriptTaskBuilder;
import io.orqueio.bpm.model.bpmn.instance.Script;
import io.orqueio.bpm.model.bpmn.instance.ScriptTask;
import io.orqueio.bpm.model.bpmn.instance.Task;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.*;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN scriptTask element
 *
 * @author Sebastian Menski
 */
public class ScriptTaskImpl extends TaskImpl implements ScriptTask {

  protected static Attribute<String> scriptFormatAttribute;
  protected static ChildElement<Script> scriptChild;

  /** orqueio extensions */

  protected static Attribute<String> orqueioResultVariableAttribute;
  protected static Attribute<String> orqueioResourceAttribute;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(ScriptTask.class, BPMN_ELEMENT_SCRIPT_TASK)
      .namespaceUri(BPMN20_NS)
      .extendsType(Task.class)
      .instanceProvider(new ModelTypeInstanceProvider<ScriptTask>() {
        public ScriptTask newInstance(ModelTypeInstanceContext instanceContext) {
          return new ScriptTaskImpl(instanceContext);
        }
      });

    scriptFormatAttribute = typeBuilder.stringAttribute(BPMN_ATTRIBUTE_SCRIPT_FORMAT)
      .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    scriptChild = sequenceBuilder.element(Script.class)
      .build();

    /** orqueio extensions */

    orqueioResultVariableAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_RESULT_VARIABLE)
      .namespace(CAMUNDA_NS)
      .build();

    orqueioResourceAttribute = typeBuilder.stringAttribute(CAMUNDA_ATTRIBUTE_RESOURCE)
      .namespace(CAMUNDA_NS)
      .build();

    typeBuilder.build();
  }

  public ScriptTaskImpl(ModelTypeInstanceContext context) {
    super(context);
  }

  @Override
  public ScriptTaskBuilder builder() {
    return new ScriptTaskBuilder((BpmnModelInstance) modelInstance, this);
  }

  public String getScriptFormat() {
    return scriptFormatAttribute.getValue(this);
  }

  public void setScriptFormat(String scriptFormat) {
    scriptFormatAttribute.setValue(this, scriptFormat);
  }

  public Script getScript() {
    return scriptChild.getChild(this);
  }

  public void setScript(Script script) {
    scriptChild.setChild(this, script);
  }

  /** orqueio extensions */

  public String getOrqueioResultVariable() {
    return orqueioResultVariableAttribute.getValue(this);
  }

  public void setOrqueioResultVariable(String orqueioResultVariable) {
    orqueioResultVariableAttribute.setValue(this, orqueioResultVariable);
  }

  public String getOrqueioResource() {
    return orqueioResourceAttribute.getValue(this);
  }

  public void setOrqueioResource(String orqueioResource) {
    orqueioResourceAttribute.setValue(this, orqueioResource);
  }

}
