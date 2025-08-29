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

import io.orqueio.bpm.model.bpmn.instance.*;
import io.orqueio.bpm.model.bpmn.instance.bpmndi.BpmnEdge;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.ChildElementCollection;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;
import io.orqueio.bpm.model.xml.type.reference.ElementReference;
import io.orqueio.bpm.model.xml.type.reference.ElementReferenceCollection;

import java.util.Collection;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN20_NS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ELEMENT_DATA_ASSOCIATION;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN dataAssociation element
 *
 * @author Sebastian Menski
 */
public class DataAssociationImpl extends BaseElementImpl implements DataAssociation {

  protected static ElementReferenceCollection<ItemAwareElement, SourceRef> sourceRefCollection;
  protected static ElementReference<ItemAwareElement, TargetRef> targetRefChild;
  protected static ChildElement<Transformation> transformationChild;
  protected static ChildElementCollection<Assignment> assignmentCollection;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(DataAssociation.class, BPMN_ELEMENT_DATA_ASSOCIATION)
      .namespaceUri(BPMN20_NS)
      .extendsType(BaseElement.class)
      .instanceProvider(new ModelTypeInstanceProvider<DataAssociation>() {
        public DataAssociation newInstance(ModelTypeInstanceContext instanceContext) {
          return new DataAssociationImpl(instanceContext);
        }
      });

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    sourceRefCollection = sequenceBuilder.elementCollection(SourceRef.class)
      .idElementReferenceCollection(ItemAwareElement.class)
      .build();

    targetRefChild = sequenceBuilder.element(TargetRef.class)
      .required()
      .idElementReference(ItemAwareElement.class)
      .build();

    transformationChild = sequenceBuilder.element(Transformation.class)
      .build();

    assignmentCollection = sequenceBuilder.elementCollection(Assignment.class)
      .build();

    typeBuilder.build();
  }

  public DataAssociationImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public Collection<ItemAwareElement> getSources() {
    return sourceRefCollection.getReferenceTargetElements(this);
  }

  public ItemAwareElement getTarget() {
    return targetRefChild.getReferenceTargetElement(this);
  }

  public void setTarget(ItemAwareElement target) {
    targetRefChild.setReferenceTargetElement(this, target);
  }

  public FormalExpression getTransformation() {
    return transformationChild.getChild(this);
  }

  public void setTransformation(Transformation transformation) {
    transformationChild.setChild(this, transformation);
  }

  public Collection<Assignment> getAssignments() {
    return assignmentCollection.get(this);
  }

  public BpmnEdge getDiagramElement() {
    return (BpmnEdge) super.getDiagramElement();
  }
}
