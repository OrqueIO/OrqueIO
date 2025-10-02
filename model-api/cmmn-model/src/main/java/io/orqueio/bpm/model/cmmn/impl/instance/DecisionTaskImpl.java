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
package io.orqueio.bpm.model.cmmn.impl.instance;

import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_DECISION_BINDING;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_DECISION_VERSION;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_DECISION_TENANT_ID;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_MAP_DECISION_RESULT;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_RESULT_VARIABLE;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_NS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN11_NS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN_ATTRIBUTE_DECISION_REF;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN_ELEMENT_DECISION_TASK;

import java.util.Collection;

import io.orqueio.bpm.model.cmmn.instance.DecisionRefExpression;
import io.orqueio.bpm.model.cmmn.instance.DecisionTask;
import io.orqueio.bpm.model.cmmn.instance.ParameterMapping;
import io.orqueio.bpm.model.cmmn.instance.Task;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.ChildElementCollection;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

/**
 * @author Roman Smirnov
 *
 */
public class DecisionTaskImpl extends TaskImpl implements DecisionTask {

  protected static Attribute<String> decisionRefAttribute;

  protected static ChildElementCollection<ParameterMapping> parameterMappingCollection;
  protected static ChildElement<DecisionRefExpression> decisionRefExpressionChild;

  /** Orqueio extensions */
  protected static Attribute<String> orqueioResultVariableAttribute;
  protected static Attribute<String> orqueioDecisionBindingAttribute;
  protected static Attribute<String> orqueioDecisionVersionAttribute;
  protected static Attribute<String> orqueioDecisionTenantIdAttribute;
  protected static Attribute<String> orqueioMapDecisionResultAttribute;

  public DecisionTaskImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getDecision() {
    return decisionRefAttribute.getValue(this);
  }

  public void setDecision(String decision) {
    decisionRefAttribute.setValue(this, decision);
  }

  public Collection<ParameterMapping> getParameterMappings() {
    return parameterMappingCollection.get(this);
  }

  public DecisionRefExpression getDecisionExpression() {
    return decisionRefExpressionChild.getChild(this);
  }

  public void setDecisionExpression(DecisionRefExpression decisionExpression) {
    decisionRefExpressionChild.setChild(this, decisionExpression);
  }

  public String getOrqueioResultVariable() {
    return orqueioResultVariableAttribute.getValue(this);
  }

  public void setOrqueioResultVariable(String orqueioResultVariable) {
    orqueioResultVariableAttribute.setValue(this, orqueioResultVariable);
  }

  public String getOrqueioDecisionBinding() {
    return orqueioDecisionBindingAttribute.getValue(this);
  }

  public void setOrqueioDecisionBinding(String orqueioDecisionBinding) {
    orqueioDecisionBindingAttribute.setValue(this, orqueioDecisionBinding);
  }

  public String getOrqueioDecisionVersion() {
    return orqueioDecisionVersionAttribute.getValue(this);
  }

  public void setOrqueioDecisionVersion(String orqueioDecisionVersion) {
    orqueioDecisionVersionAttribute.setValue(this, orqueioDecisionVersion);
  }

  public String getOrqueioDecisionTenantId() {
    return orqueioDecisionTenantIdAttribute.getValue(this);
  }

  public void setOrqueioDecisionTenantId(String orqueioDecisionTenantId) {
    orqueioDecisionTenantIdAttribute.setValue(this, orqueioDecisionTenantId);
  }

  @Override
  public String getOrqueioMapDecisionResult() {
    return orqueioMapDecisionResultAttribute.getValue(this);
  }

  @Override
  public void setOrqueioMapDecisionResult(String orqueioMapDecisionResult) {
    orqueioMapDecisionResultAttribute.setValue(this, orqueioMapDecisionResult);
  }

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(DecisionTask.class, CMMN_ELEMENT_DECISION_TASK)
        .namespaceUri(CMMN11_NS)
        .extendsType(Task.class)
        .instanceProvider(new ModelTypeInstanceProvider<DecisionTask>() {
          public DecisionTask newInstance(ModelTypeInstanceContext instanceContext) {
            return new DecisionTaskImpl(instanceContext);
          }
        });

    decisionRefAttribute = typeBuilder.stringAttribute(CMMN_ATTRIBUTE_DECISION_REF)
        .build();

    /** Orqueio extensions */

    orqueioResultVariableAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_RESULT_VARIABLE)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioDecisionBindingAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_DECISION_BINDING)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioDecisionVersionAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_DECISION_VERSION)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioDecisionTenantIdAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_DECISION_TENANT_ID)
        .namespace(ORQUEIO_NS)
        .build();

    orqueioMapDecisionResultAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_MAP_DECISION_RESULT)
      .namespace(ORQUEIO_NS)
      .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    parameterMappingCollection = sequenceBuilder.elementCollection(ParameterMapping.class)
        .build();

    decisionRefExpressionChild = sequenceBuilder.element(DecisionRefExpression.class)
        .build();

    typeBuilder.build();
  }

}
