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
package io.orqueio.bpm.model.cmmn.impl.instance.orqueio;

import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_VARIABLE_NAME;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ELEMENT_VARIABLE_ON_PART;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_NS;

import io.orqueio.bpm.model.cmmn.VariableTransition;
import io.orqueio.bpm.model.cmmn.impl.instance.CmmnModelElementInstanceImpl;
import io.orqueio.bpm.model.cmmn.instance.orqueio.OrqueioVariableOnPart;
import io.orqueio.bpm.model.cmmn.instance.orqueio.OrqueioVariableTransitionEvent;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

public class OrqueioVariableOnPartImpl extends CmmnModelElementInstanceImpl implements OrqueioVariableOnPart {

  protected static Attribute<String> orqueioVariableNameAttribute;
  protected static ChildElement<OrqueioVariableTransitionEvent> orqueioVariableEventChild; 
  
  public OrqueioVariableOnPartImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public static void registerType(ModelBuilder modelBuilder) {

    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrqueioVariableOnPart.class, ORQUEIO_ELEMENT_VARIABLE_ON_PART)
      .namespaceUri(ORQUEIO_NS)
      .instanceProvider(new ModelTypeInstanceProvider<OrqueioVariableOnPart>() {
        public OrqueioVariableOnPart newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrqueioVariableOnPartImpl(instanceContext);
      }
    });

    orqueioVariableNameAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_VARIABLE_NAME)
      .namespace(ORQUEIO_NS)
      .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    orqueioVariableEventChild = sequenceBuilder.element(OrqueioVariableTransitionEvent.class)
      .build();

    typeBuilder.build();
  }

  public String getVariableName() {
    return orqueioVariableNameAttribute.getValue(this);
  }

  public void setVariableName(String name) {
    orqueioVariableNameAttribute.setValue(this, name);
  }


  public VariableTransition getVariableEvent() {
    OrqueioVariableTransitionEvent child = orqueioVariableEventChild.getChild(this);
    return child.getValue();
  }

  public void setVariableEvent(VariableTransition variableTransition) {
    OrqueioVariableTransitionEvent child = orqueioVariableEventChild.getChild(this);
    child.setValue(variableTransition);
  }

}
