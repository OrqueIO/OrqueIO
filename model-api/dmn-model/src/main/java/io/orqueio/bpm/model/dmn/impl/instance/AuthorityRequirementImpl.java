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
import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.DMN_ELEMENT_AUTHORITY_REQUIREMENT;

import io.orqueio.bpm.model.dmn.instance.AuthorityRequirement;
import io.orqueio.bpm.model.dmn.instance.Decision;
import io.orqueio.bpm.model.dmn.instance.InputData;
import io.orqueio.bpm.model.dmn.instance.KnowledgeSource;
import io.orqueio.bpm.model.dmn.instance.RequiredAuthorityReference;
import io.orqueio.bpm.model.dmn.instance.RequiredDecisionReference;
import io.orqueio.bpm.model.dmn.instance.RequiredInputReference;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;
import io.orqueio.bpm.model.xml.type.reference.ElementReference;

public class AuthorityRequirementImpl extends DmnModelElementInstanceImpl implements AuthorityRequirement {

  protected static ElementReference<Decision, RequiredDecisionReference> requiredDecisionRef;
  protected static ElementReference<InputData, RequiredInputReference> requiredInputRef;
  protected static ElementReference<KnowledgeSource, RequiredAuthorityReference> requiredAuthorityRef;

  public AuthorityRequirementImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public Decision getRequiredDecision() {
    return requiredDecisionRef.getReferenceTargetElement(this);
  }

  public void setRequiredDecision(Decision requiredDecision) {
    requiredDecisionRef.setReferenceTargetElement(this, requiredDecision);
  }

  public InputData getRequiredInput() {
    return requiredInputRef.getReferenceTargetElement(this);
  }

  public void setRequiredInput(InputData requiredInput) {
    requiredInputRef.setReferenceTargetElement(this, requiredInput);
  }

  public KnowledgeSource getRequiredAuthority() {
    return requiredAuthorityRef.getReferenceTargetElement(this);
  }

  public void setRequiredAuthority(KnowledgeSource requiredAuthority) {
    requiredAuthorityRef.setReferenceTargetElement(this, requiredAuthority);
  }

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(AuthorityRequirement.class, DMN_ELEMENT_AUTHORITY_REQUIREMENT)
      .namespaceUri(LATEST_DMN_NS)
      .instanceProvider(new ModelTypeInstanceProvider<AuthorityRequirement>() {
        public AuthorityRequirement newInstance(ModelTypeInstanceContext instanceContext) {
          return new AuthorityRequirementImpl(instanceContext);
        }
      });

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    requiredDecisionRef = sequenceBuilder.element(RequiredDecisionReference.class)
      .uriElementReference(Decision.class)
      .build();

    requiredInputRef = sequenceBuilder.element(RequiredInputReference.class)
      .uriElementReference(InputData.class)
      .build();

    requiredAuthorityRef = sequenceBuilder.element(RequiredAuthorityReference.class)
      .uriElementReference(KnowledgeSource.class)
      .build();

    typeBuilder.build();
  }

}
