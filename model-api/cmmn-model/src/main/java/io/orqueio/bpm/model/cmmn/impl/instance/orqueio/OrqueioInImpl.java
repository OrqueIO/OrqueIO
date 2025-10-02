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

import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_BUSINESS_KEY;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_LOCAL;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_SOURCE;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_SOURCE_EXPRESSION;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_TARGET;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_VARIABLES;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ELEMENT_IN;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_NS;

import io.orqueio.bpm.model.cmmn.impl.instance.CmmnModelElementInstanceImpl;
import io.orqueio.bpm.model.cmmn.instance.orqueio.OrqueioIn;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;

/**
 * @author Sebastian Menski
 * @author Roman Smirnov
 *
 */
public class OrqueioInImpl extends CmmnModelElementInstanceImpl implements OrqueioIn {

  protected static Attribute<String> orqueioSourceAttribute;
  protected static Attribute<String> orqueioSourceExpressionAttribute;
  protected static Attribute<String> orqueioVariablesAttribute;
  protected static Attribute<String> orqueioTargetAttribute;
  protected static Attribute<String> orqueioBusinessKeyAttribute;
  protected static Attribute<Boolean> orqueioLocalAttribute;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrqueioIn.class, ORQUEIO_ELEMENT_IN)
      .namespaceUri(ORQUEIO_NS)
      .instanceProvider(new ModelTypeInstanceProvider<OrqueioIn>() {
        public OrqueioIn newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrqueioInImpl(instanceContext);
        }
      });

    orqueioSourceAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_SOURCE)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioSourceExpressionAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_SOURCE_EXPRESSION)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioVariablesAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_VARIABLES)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioTargetAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_TARGET)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioBusinessKeyAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_BUSINESS_KEY)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioLocalAttribute = typeBuilder.booleanAttribute(ORQUEIO_ATTRIBUTE_LOCAL)
      .namespace(ORQUEIO_NS)
      .build();

    typeBuilder.build();
  }

  public OrqueioInImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getOrqueioSource() {
    return orqueioSourceAttribute.getValue(this);
  }

  public void setOrqueioSource(String orqueioSource) {
    orqueioSourceAttribute.setValue(this, orqueioSource);
  }

  public String getOrqueioSourceExpression() {
    return orqueioSourceExpressionAttribute.getValue(this);
  }

  public void setOrqueioSourceExpression(String orqueioSourceExpression) {
    orqueioSourceExpressionAttribute.setValue(this, orqueioSourceExpression);
  }

  public String getOrqueioVariables() {
    return orqueioVariablesAttribute.getValue(this);
  }

  public void setOrqueioVariables(String orqueioVariables) {
    orqueioVariablesAttribute.setValue(this, orqueioVariables);
  }

  public String getOrqueioTarget() {
    return orqueioTargetAttribute.getValue(this);
  }

  public void setOrqueioTarget(String orqueioTarget) {
    orqueioTargetAttribute.setValue(this, orqueioTarget);
  }

  public String getOrqueioBusinessKey() {
    return orqueioBusinessKeyAttribute.getValue(this);
  }

  public void setOrqueioBusinessKey(String orqueioBusinessKey) {
    orqueioBusinessKeyAttribute.setValue(this, orqueioBusinessKey);
  }

  public boolean getOrqueioLocal() {
    return orqueioLocalAttribute.getValue(this);
  }

  public void setOrqueioLocal(boolean local) {
    orqueioLocalAttribute.setValue(this, local);
  }

}
