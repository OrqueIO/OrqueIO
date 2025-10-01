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
import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.DMN_ELEMENT_ORGANIZATION_UNIT;

import java.util.Collection;

import io.orqueio.bpm.model.dmn.instance.BusinessContextElement;
import io.orqueio.bpm.model.dmn.instance.Decision;
import io.orqueio.bpm.model.dmn.instance.DecisionMadeReference;
import io.orqueio.bpm.model.dmn.instance.DecisionOwnedReference;
import io.orqueio.bpm.model.dmn.instance.OrganizationUnit;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;
import io.orqueio.bpm.model.xml.type.reference.ElementReferenceCollection;

public class OrganizationUnitImpl extends BusinessContextElementImpl implements OrganizationUnit {

  protected static ElementReferenceCollection<Decision, DecisionMadeReference> decisionDecisionMadeRefCollection;
  protected static ElementReferenceCollection<Decision, DecisionOwnedReference> decisionDecisionOwnedRefCollection;

  public OrganizationUnitImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public Collection<Decision> getDecisionsMade() {
    return decisionDecisionMadeRefCollection.getReferenceTargetElements(this);
  }

  public Collection<Decision> getDecisionsOwned() {
    return decisionDecisionOwnedRefCollection.getReferenceTargetElements(this);
  }

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrganizationUnit.class, DMN_ELEMENT_ORGANIZATION_UNIT)
      .namespaceUri(LATEST_DMN_NS)
      .extendsType(BusinessContextElement.class)
      .instanceProvider(new ModelTypeInstanceProvider<OrganizationUnit>() {
        public OrganizationUnit newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrganizationUnitImpl(instanceContext);
        }
      });

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    decisionDecisionMadeRefCollection = sequenceBuilder.elementCollection(DecisionMadeReference.class)
      .uriElementReferenceCollection(Decision.class)
      .build();

    decisionDecisionOwnedRefCollection = sequenceBuilder.elementCollection(DecisionOwnedReference.class)
      .uriElementReferenceCollection(Decision.class)
      .build();

    typeBuilder.build();
  }

}
