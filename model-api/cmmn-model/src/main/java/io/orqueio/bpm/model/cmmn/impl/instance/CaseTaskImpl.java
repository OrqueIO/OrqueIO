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
package io.orqueio.bpm.model.cmmn.impl.instance;

import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_CASE_BINDING;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_CASE_VERSION;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_CASE_TENANT_ID;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_NS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN11_NS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN_ATTRIBUTE_CASE_REF;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN_ELEMENT_CASE_TASK;

import java.util.Collection;

import io.orqueio.bpm.model.cmmn.instance.CaseRefExpression;
import io.orqueio.bpm.model.cmmn.instance.CaseTask;
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
public class CaseTaskImpl extends TaskImpl implements CaseTask {

  protected static Attribute<String> caseRefAttribute;
  protected static ChildElementCollection<ParameterMapping> parameterMappingCollection;

  // cmmn 1.1
  protected static ChildElement<CaseRefExpression> caseRefExpressionChild;

  protected static Attribute<String> orqueioCaseBindingAttribute;
  protected static Attribute<String> orqueioCaseVersionAttribute;
  protected static Attribute<String> orqueioCaseTenantIdAttribute;

  public CaseTaskImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getCase() {
    return caseRefAttribute.getValue(this);
  }

  public void setCase(String caseInstance) {
    caseRefAttribute.setValue(this, caseInstance);
  }

  public CaseRefExpression getCaseExpression() {
    return caseRefExpressionChild.getChild(this);
  }

  public void setCaseExpression(CaseRefExpression caseExpression) {
    caseRefExpressionChild.setChild(this, caseExpression);
  }

  public Collection<ParameterMapping> getParameterMappings() {
    return parameterMappingCollection.get(this);
  }

  public String getOrqueioCaseBinding() {
    return orqueioCaseBindingAttribute.getValue(this);
  }

  public void setOrqueioCaseBinding(String orqueioCaseBinding) {
    orqueioCaseBindingAttribute.setValue(this, orqueioCaseBinding);
  }

  public String getOrqueioCaseVersion() {
    return orqueioCaseVersionAttribute.getValue(this);
  }

  public void setOrqueioCaseVersion(String orqueioCaseVersion) {
    orqueioCaseVersionAttribute.setValue(this, orqueioCaseVersion);
  }

  public String getOrqueioCaseTenantId() {
    return orqueioCaseTenantIdAttribute.getValue(this);
  }

  public void setOrqueioCaseTenantId(String orqueioCaseTenantId) {
    orqueioCaseTenantIdAttribute.setValue(this, orqueioCaseTenantId);
  }

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(CaseTask.class, CMMN_ELEMENT_CASE_TASK)
        .extendsType(Task.class)
        .namespaceUri(CMMN11_NS)
        .instanceProvider(new ModelTypeInstanceProvider<CaseTask>() {
          public CaseTask newInstance(ModelTypeInstanceContext instanceContext) {
            return new CaseTaskImpl(instanceContext);
          }
        });

    caseRefAttribute = typeBuilder.stringAttribute(CMMN_ATTRIBUTE_CASE_REF)
        .build();

    /** orqueio extensions */

    orqueioCaseBindingAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_CASE_BINDING)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioCaseVersionAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_CASE_VERSION)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioCaseTenantIdAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_CASE_TENANT_ID)
        .namespace(ORQUEIO_NS)
        .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    parameterMappingCollection = sequenceBuilder.elementCollection(ParameterMapping.class)
        .build();

    caseRefExpressionChild = sequenceBuilder.element(CaseRefExpression.class)
        .build();

    typeBuilder.build();
  }

}
