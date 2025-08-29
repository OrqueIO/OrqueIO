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
import io.orqueio.bpm.model.bpmn.instance.Expression;
import io.orqueio.bpm.model.bpmn.instance.ResourceParameter;
import io.orqueio.bpm.model.bpmn.instance.ResourceParameterBinding;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;
import io.orqueio.bpm.model.xml.type.reference.AttributeReference;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.*;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN resourceParameterBinding element
 *
 * @author Sebastian Menski
 */
public class ResourceParameterBindingImpl extends BaseElementImpl implements ResourceParameterBinding {

  protected static AttributeReference<ResourceParameter> parameterRefAttribute;
  protected static ChildElement<Expression> expressionChild;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(ResourceParameterBinding.class, BPMN_ELEMENT_RESOURCE_PARAMETER_BINDING)
      .namespaceUri(BPMN20_NS)
      .extendsType(BaseElement.class)
      .instanceProvider(new ModelTypeInstanceProvider<ResourceParameterBinding>() {
        public ResourceParameterBinding newInstance(ModelTypeInstanceContext instanceContext) {
          return new ResourceParameterBindingImpl(instanceContext);
        }
      });

    parameterRefAttribute = typeBuilder.stringAttribute(BPMN_ATTRIBUTE_PARAMETER_REF)
      .required()
      .qNameAttributeReference(ResourceParameter.class)
      .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    expressionChild = sequenceBuilder.element(Expression.class)
      .required()
      .build();

    typeBuilder.build();
  }

  public ResourceParameterBindingImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public ResourceParameter getParameter() {
    return parameterRefAttribute.getReferenceTargetElement(this);
  }

  public void setParameter(ResourceParameter parameter) {
    parameterRefAttribute.setReferenceTargetElement(this, parameter);
  }

  public Expression getExpression() {
    return expressionChild.getChild(this);
  }

  public void setExpression(Expression expression) {
    expressionChild.setChild(this, expression);
  }
}
