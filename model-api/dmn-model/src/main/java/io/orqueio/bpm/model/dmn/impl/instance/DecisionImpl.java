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

import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.ORQUEIO_ATTRIBUTE_HISTORY_TIME_TO_LIVE;
import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.ORQUEIO_ATTRIBUTE_VERSION_TAG;
import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.ORQUEIO_NS;
import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.LATEST_DMN_NS;
import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.DMN_ELEMENT_DECISION;

import java.util.Collection;

import io.orqueio.bpm.model.dmn.instance.AllowedAnswers;
import io.orqueio.bpm.model.dmn.instance.AuthorityRequirement;
import io.orqueio.bpm.model.dmn.instance.Decision;
import io.orqueio.bpm.model.dmn.instance.DecisionMakerReference;
import io.orqueio.bpm.model.dmn.instance.DecisionOwnerReference;
import io.orqueio.bpm.model.dmn.instance.DrgElement;
import io.orqueio.bpm.model.dmn.instance.Expression;
import io.orqueio.bpm.model.dmn.instance.ImpactedPerformanceIndicatorReference;
import io.orqueio.bpm.model.dmn.instance.InformationRequirement;
import io.orqueio.bpm.model.dmn.instance.KnowledgeRequirement;
import io.orqueio.bpm.model.dmn.instance.OrganizationUnit;
import io.orqueio.bpm.model.dmn.instance.PerformanceIndicator;
import io.orqueio.bpm.model.dmn.instance.Question;
import io.orqueio.bpm.model.dmn.instance.SupportedObjectiveReference;
import io.orqueio.bpm.model.dmn.instance.UsingProcessReference;
import io.orqueio.bpm.model.dmn.instance.UsingTaskReference;
import io.orqueio.bpm.model.dmn.instance.Variable;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.ChildElementCollection;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;
import io.orqueio.bpm.model.xml.type.reference.ElementReferenceCollection;

public class DecisionImpl extends DrgElementImpl implements Decision {

  protected static ChildElement<Question> questionChild;
  protected static ChildElement<AllowedAnswers> allowedAnswersChild;
  protected static ChildElement<Variable> variableChild;
  protected static ChildElementCollection<InformationRequirement> informationRequirementCollection;
  protected static ChildElementCollection<KnowledgeRequirement> knowledgeRequirementCollection;
  protected static ChildElementCollection<AuthorityRequirement> authorityRequirementCollection;
  protected static ChildElementCollection<SupportedObjectiveReference> supportedObjectiveChildElementCollection;
  protected static ElementReferenceCollection<PerformanceIndicator, ImpactedPerformanceIndicatorReference> impactedPerformanceIndicatorRefCollection;
  protected static ElementReferenceCollection<OrganizationUnit, DecisionMakerReference> decisionMakerRefCollection;
  protected static ElementReferenceCollection<OrganizationUnit, DecisionOwnerReference> decisionOwnerRefCollection;
  protected static ChildElementCollection<UsingProcessReference> usingProcessCollection;
  protected static ChildElementCollection<UsingTaskReference> usingTaskCollection;
  protected static ChildElement<Expression> expressionChild;

  // orqueio extensions
  protected static Attribute<String> orqueioHistoryTimeToLiveAttribute;
  protected static Attribute<String> orqueioVersionTag;

  public DecisionImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public Question getQuestion() {
    return questionChild.getChild(this);
  }

  public void setQuestion(Question question) {
    questionChild.setChild(this, question);
  }

  public AllowedAnswers getAllowedAnswers() {
    return allowedAnswersChild.getChild(this);
  }

  public void setAllowedAnswers(AllowedAnswers allowedAnswers) {
    allowedAnswersChild.setChild(this, allowedAnswers);
  }

  public Variable getVariable() {
    return variableChild.getChild(this);
  }

  public void setVariable(Variable variable) {
    variableChild.setChild(this, variable);
  }

  public Collection<InformationRequirement> getInformationRequirements() {
    return informationRequirementCollection.get(this);
  }

  public Collection<KnowledgeRequirement> getKnowledgeRequirements() {
    return knowledgeRequirementCollection.get(this);
  }

  public Collection<AuthorityRequirement> getAuthorityRequirements() {
    return authorityRequirementCollection.get(this);
  }

  public Collection<SupportedObjectiveReference> getSupportedObjectiveReferences() {
    return supportedObjectiveChildElementCollection.get(this);
  }

  public Collection<PerformanceIndicator> getImpactedPerformanceIndicators() {
    return impactedPerformanceIndicatorRefCollection.getReferenceTargetElements(this);
  }

  public Collection<OrganizationUnit> getDecisionMakers() {
    return decisionMakerRefCollection.getReferenceTargetElements(this);
  }

  public Collection<OrganizationUnit> getDecisionOwners() {
    return decisionOwnerRefCollection.getReferenceTargetElements(this);
  }

  public Collection<UsingProcessReference> getUsingProcessReferences() {
    return usingProcessCollection.get(this);
  }

  public Collection<UsingTaskReference> getUsingTaskReferences() {
    return usingTaskCollection.get(this);
  }

  public Expression getExpression() {
    return expressionChild.getChild(this);
  }

  public void setExpression(Expression expression) {
    expressionChild.setChild(this, expression);
  }

  // orqueio extensions
  @Override
  public Integer getOrqueioHistoryTimeToLive() {
    String ttl = getOrqueioHistoryTimeToLiveString();

    if (ttl != null) {
      return Integer.valueOf(ttl);
    }
    return null;
  }

  @Override
  public void setOrqueioHistoryTimeToLive(Integer historyTimeToLive) {
    setOrqueioHistoryTimeToLiveString(String.valueOf(historyTimeToLive));
  }

  @Override
  public String getOrqueioHistoryTimeToLiveString() {
    return orqueioHistoryTimeToLiveAttribute.getValue(this);
  }

  @Override
  public void setOrqueioHistoryTimeToLiveString(String historyTimeToLive) {
    orqueioHistoryTimeToLiveAttribute.setValue(this, historyTimeToLive);
  }

  @Override
  public String getVersionTag() {
    return orqueioVersionTag.getValue(this);
  }

  @Override
  public void setVersionTag(String inputVariable) {
    orqueioVersionTag.setValue(this, inputVariable);
  }

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(Decision.class, DMN_ELEMENT_DECISION)
      .namespaceUri(LATEST_DMN_NS)
      .extendsType(DrgElement.class)
      .instanceProvider(new ModelTypeInstanceProvider<Decision>() {
        public Decision newInstance(ModelTypeInstanceContext instanceContext) {
          return new DecisionImpl(instanceContext);
        }
      });

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    questionChild = sequenceBuilder.element(Question.class)
      .build();

    allowedAnswersChild = sequenceBuilder.element(AllowedAnswers.class)
      .build();

    variableChild = sequenceBuilder.element(Variable.class)
      .build();

    informationRequirementCollection = sequenceBuilder.elementCollection(InformationRequirement.class)
      .build();

    knowledgeRequirementCollection = sequenceBuilder.elementCollection(KnowledgeRequirement.class)
      .build();

    authorityRequirementCollection = sequenceBuilder.elementCollection(AuthorityRequirement.class)
      .build();

    supportedObjectiveChildElementCollection = sequenceBuilder.elementCollection(SupportedObjectiveReference.class)
      .build();

    impactedPerformanceIndicatorRefCollection = sequenceBuilder.elementCollection(ImpactedPerformanceIndicatorReference.class)
      .uriElementReferenceCollection(PerformanceIndicator.class)
      .build();

    decisionMakerRefCollection = sequenceBuilder.elementCollection(DecisionMakerReference.class)
      .uriElementReferenceCollection(OrganizationUnit.class)
      .build();

    decisionOwnerRefCollection = sequenceBuilder.elementCollection(DecisionOwnerReference.class)
      .uriElementReferenceCollection(OrganizationUnit.class)
      .build();

    usingProcessCollection = sequenceBuilder.elementCollection(UsingProcessReference.class)
      .build();

    usingTaskCollection = sequenceBuilder.elementCollection(UsingTaskReference.class)
      .build();

    expressionChild = sequenceBuilder.element(Expression.class)
      .build();

    // orqueio extensions

    orqueioHistoryTimeToLiveAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_HISTORY_TIME_TO_LIVE)
        .namespace(ORQUEIO_NS)
        .build();

    orqueioVersionTag = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_VERSION_TAG)
      .namespace(ORQUEIO_NS)
      .build();

    typeBuilder.build();
  }

}
