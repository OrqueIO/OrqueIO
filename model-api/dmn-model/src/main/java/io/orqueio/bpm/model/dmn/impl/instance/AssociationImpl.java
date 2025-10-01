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
package io.orqueio.bpm.model.dmn.impl.instance;

import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.LATEST_DMN_NS;
import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.DMN_ATTRIBUTE_ASSOCIATION_DIRECTION;
import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.DMN_ELEMENT_ASSOCIATION;

import io.orqueio.bpm.model.dmn.AssociationDirection;
import io.orqueio.bpm.model.dmn.instance.Artifact;
import io.orqueio.bpm.model.dmn.instance.Association;
import io.orqueio.bpm.model.dmn.instance.DmnElement;
import io.orqueio.bpm.model.dmn.instance.SourceRef;
import io.orqueio.bpm.model.dmn.instance.TargetRef;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;
import io.orqueio.bpm.model.xml.type.reference.ElementReference;

public class AssociationImpl extends ArtifactImpl implements Association {

  protected static Attribute<AssociationDirection> associationDirectionAttribute;

  protected static ElementReference<DmnElement, SourceRef> sourceRef;
  protected static ElementReference<DmnElement, TargetRef> targetRef;

  public AssociationImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public AssociationDirection getAssociationDirection() {
    return associationDirectionAttribute.getValue(this);
  }

  public void setAssociationDirection(AssociationDirection associationDirection) {
    associationDirectionAttribute.setValue(this, associationDirection);
  }

  public DmnElement getSource() {
    return sourceRef.getReferenceTargetElement(this);
  }

  public void setSource(DmnElement source) {
    sourceRef.setReferenceTargetElement(this, source);
  }

  public DmnElement getTarget() {
    return targetRef.getReferenceTargetElement(this);
  }

  public void setTarget(DmnElement target) {
    targetRef.setReferenceTargetElement(this, target);
  }

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(Association.class, DMN_ELEMENT_ASSOCIATION)
      .namespaceUri(LATEST_DMN_NS)
      .extendsType(Artifact.class)
      .instanceProvider(new ModelTypeInstanceProvider<Association>() {
        public Association newInstance(ModelTypeInstanceContext instanceContext) {
          return new AssociationImpl(instanceContext);
        }
      });

    associationDirectionAttribute = typeBuilder.enumAttribute(DMN_ATTRIBUTE_ASSOCIATION_DIRECTION, AssociationDirection.class)
      .defaultValue(AssociationDirection.None)
      .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    sourceRef = sequenceBuilder.element(SourceRef.class)
      .required()
      .uriElementReference(DmnElement.class)
      .build();

    targetRef = sequenceBuilder.element(TargetRef.class)
      .required()
      .uriElementReference(DmnElement.class)
      .build();

    typeBuilder.build();
  }

}
