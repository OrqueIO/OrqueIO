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
package io.orqueio.bpm.model.bpmn.impl.instance;

import io.orqueio.bpm.model.bpmn.instance.BaseElement;
import io.orqueio.bpm.model.bpmn.instance.DataInput;
import io.orqueio.bpm.model.bpmn.instance.InputSet;
import io.orqueio.bpm.model.bpmn.instance.OutputSet;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;
import io.orqueio.bpm.model.xml.type.reference.ElementReferenceCollection;

import java.util.Collection;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN20_NS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ELEMENT_INPUT_SET;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN inputSet element
 *
 * @author Sebastian Menski
 */
public class InputSetImpl extends BaseElementImpl implements InputSet {

  protected static Attribute<String> nameAttribute;
  protected static ElementReferenceCollection<DataInput, DataInputRefs> dataInputDataInputRefsCollection;
  protected static ElementReferenceCollection<DataInput, OptionalInputRefs> optionalInputRefsCollection;
  protected static ElementReferenceCollection<DataInput, WhileExecutingInputRefs> whileExecutingInputRefsCollection;
  protected static ElementReferenceCollection<OutputSet, OutputSetRefs> outputSetOutputSetRefsCollection;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(InputSet.class, BPMN_ELEMENT_INPUT_SET)
      .namespaceUri(BPMN20_NS)
      .extendsType(BaseElement.class)
      .instanceProvider(new ModelTypeInstanceProvider<InputSet>() {
        public InputSet newInstance(ModelTypeInstanceContext instanceContext) {
          return new InputSetImpl(instanceContext);
        }
      });

    nameAttribute = typeBuilder.stringAttribute("name")
      .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    dataInputDataInputRefsCollection = sequenceBuilder.elementCollection(DataInputRefs.class)
      .idElementReferenceCollection(DataInput.class)
      .build();

    optionalInputRefsCollection = sequenceBuilder.elementCollection(OptionalInputRefs.class)
      .idElementReferenceCollection(DataInput.class)
      .build();

    whileExecutingInputRefsCollection = sequenceBuilder.elementCollection(WhileExecutingInputRefs.class)
      .idElementReferenceCollection(DataInput.class)
      .build();

    outputSetOutputSetRefsCollection = sequenceBuilder.elementCollection(OutputSetRefs.class)
      .idElementReferenceCollection(OutputSet.class)
      .build();

    typeBuilder.build();
  }

  public InputSetImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getName() {
    return nameAttribute.getValue(this);
  }

  public void setName(String name) {
    nameAttribute.setValue(this, name);
  }

  public Collection<DataInput> getDataInputs() {
    return dataInputDataInputRefsCollection.getReferenceTargetElements(this);
  }

  public Collection<DataInput> getOptionalInputs() {
    return optionalInputRefsCollection.getReferenceTargetElements(this);
  }

  public Collection<DataInput> getWhileExecutingInput() {
    return whileExecutingInputRefsCollection.getReferenceTargetElements(this);
  }

  public Collection<OutputSet> getOutputSets() {
    return outputSetOutputSetRefsCollection.getReferenceTargetElements(this);
  }
}
