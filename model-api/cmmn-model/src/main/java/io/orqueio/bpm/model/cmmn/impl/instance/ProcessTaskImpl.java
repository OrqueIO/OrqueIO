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

import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_PROCESS_BINDING;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_PROCESS_VERSION;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_ATTRIBUTE_PROCESS_TENANT_ID;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.ORQUEIO_NS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN11_NS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN_ATTRIBUTE_PROCESS_REF;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN_ELEMENT_PROCESS_TASK;

import java.util.Collection;

import io.orqueio.bpm.model.cmmn.instance.ParameterMapping;
import io.orqueio.bpm.model.cmmn.instance.ProcessRefExpression;
import io.orqueio.bpm.model.cmmn.instance.ProcessTask;
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
public class ProcessTaskImpl extends TaskImpl implements ProcessTask {

  protected static Attribute<String> processRefAttribute;
  protected static ChildElementCollection<ParameterMapping> parameterMappingCollection;
  protected static ChildElement<ProcessRefExpression> processRefExpressionChild;

  protected static Attribute<String> orqueioProcessBindingAttribute;
  protected static Attribute<String> orqueioProcessVersionAttribute;
  protected static Attribute<String> orqueioProcessTenantIdAttribute;

  public ProcessTaskImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public String getProcess() {
    return processRefAttribute.getValue(this);
  }

  public void setProcess(String process) {
    processRefAttribute.setValue(this, process);
  }

  public ProcessRefExpression getProcessExpression() {
    return processRefExpressionChild.getChild(this);
  }

  public void setProcessExpression(ProcessRefExpression processExpression) {
    processRefExpressionChild.setChild(this, processExpression);
  }

  public Collection<ParameterMapping> getParameterMappings() {
    return parameterMappingCollection.get(this);
  }

  public String getOrqueioProcessBinding() {
    return orqueioProcessBindingAttribute.getValue(this);
  }

  public void setOrqueioProcessBinding(String orqueioProcessBinding) {
    orqueioProcessBindingAttribute.setValue(this, orqueioProcessBinding);
  }

  public String getOrqueioProcessVersion() {
    return orqueioProcessVersionAttribute.getValue(this);
  }

  public void setOrqueioProcessVersion(String orqueioProcessVersion) {
    orqueioProcessVersionAttribute.setValue(this, orqueioProcessVersion);
  }

  public String getOrqueioProcessTenantId() {
    return orqueioProcessTenantIdAttribute.getValue(this);
  }

  public void setOrqueioProcessTenantId(String orqueioProcessTenantId) {
    orqueioProcessTenantIdAttribute.setValue(this, orqueioProcessTenantId);
  }

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(ProcessTask.class, CMMN_ELEMENT_PROCESS_TASK)
        .namespaceUri(CMMN11_NS)
        .extendsType(Task.class)
        .instanceProvider(new ModelTypeInstanceProvider<ProcessTask>() {
          public ProcessTask newInstance(ModelTypeInstanceContext instanceContext) {
            return new ProcessTaskImpl(instanceContext);
          }
        });

    processRefAttribute = typeBuilder.stringAttribute(CMMN_ATTRIBUTE_PROCESS_REF)
        .build();

    /** orqueio extensions */

    orqueioProcessBindingAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_PROCESS_BINDING)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioProcessVersionAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_PROCESS_VERSION)
      .namespace(ORQUEIO_NS)
      .build();

    orqueioProcessTenantIdAttribute = typeBuilder.stringAttribute(ORQUEIO_ATTRIBUTE_PROCESS_TENANT_ID)
        .namespace(ORQUEIO_NS)
        .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    parameterMappingCollection = sequenceBuilder.elementCollection(ParameterMapping.class)
        .build();

    processRefExpressionChild = sequenceBuilder.element(ProcessRefExpression.class)
        .minOccurs(0)
        .maxOccurs(1)
        .build();

    typeBuilder.build();
  }


}
