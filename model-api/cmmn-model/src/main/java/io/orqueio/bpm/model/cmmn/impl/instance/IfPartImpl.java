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

import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN11_NS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN_ATTRIBUTE_CONTEXT_REF;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN_ELEMENT_IF_PART;

import java.util.Collection;

import io.orqueio.bpm.model.cmmn.instance.CaseFileItem;
import io.orqueio.bpm.model.cmmn.instance.CmmnElement;
import io.orqueio.bpm.model.cmmn.instance.ConditionExpression;
import io.orqueio.bpm.model.cmmn.instance.IfPart;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;
import io.orqueio.bpm.model.xml.type.reference.AttributeReference;

/**
 * @author Roman Smirnov
 *
 */
public class IfPartImpl extends CmmnElementImpl implements IfPart {

  protected static AttributeReference<CaseFileItem> contextRefAttribute;

  // cmmn 1.1
  protected static ChildElement<ConditionExpression> conditionChild;

  public IfPartImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public CaseFileItem getContext() {
    return contextRefAttribute.getReferenceTargetElement(this);
  }

  public void setContext(CaseFileItem caseFileItem) {
    contextRefAttribute.setReferenceTargetElement(this, caseFileItem);
  }

  public Collection<ConditionExpression> getConditions() {
    return conditionChild.get(this);
  }

  public ConditionExpression getCondition() {
    return conditionChild.getChild(this);
  }

  public void setCondition(ConditionExpression condition) {
    conditionChild.setChild(this, condition);
  }

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(IfPart.class, CMMN_ELEMENT_IF_PART)
        .namespaceUri(CMMN11_NS)
        .extendsType(CmmnElement.class)
        .instanceProvider(new ModelTypeInstanceProvider<IfPart>() {
          public IfPart newInstance(ModelTypeInstanceContext instanceContext) {
            return new IfPartImpl(instanceContext);
          }
        });

    contextRefAttribute = typeBuilder.stringAttribute(CMMN_ATTRIBUTE_CONTEXT_REF)
        .idAttributeReference(CaseFileItem.class)
        .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    conditionChild = sequenceBuilder.element(ConditionExpression.class)
        .build();

    typeBuilder.build();
  }

}
