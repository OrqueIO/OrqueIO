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
package io.orqueio.bpm.model.bpmn.impl.instance.orqueio;

import io.orqueio.bpm.model.bpmn.impl.instance.BpmnModelElementInstanceImpl;
import io.orqueio.bpm.model.bpmn.instance.ResourceAssignmentExpression;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioPotentialStarter;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_ELEMENT_POTENTIAL_STARTER;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.ORQUEIO_NS;
import static io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * The BPMN potentialStarter orqueio extension
 *
 * @author Sebastian Menski
 */
public class OrqueioPotentialStarterImpl extends BpmnModelElementInstanceImpl implements OrqueioPotentialStarter {

  protected static ChildElement<ResourceAssignmentExpression> resourceAssignmentExpressionChild;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrqueioPotentialStarter.class, ORQUEIO_ELEMENT_POTENTIAL_STARTER)
      .namespaceUri(ORQUEIO_NS)
      .instanceProvider(new ModelTypeInstanceProvider<OrqueioPotentialStarter>() {
        public OrqueioPotentialStarter newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrqueioPotentialStarterImpl(instanceContext);
        }
      });

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    resourceAssignmentExpressionChild = sequenceBuilder.element(ResourceAssignmentExpression.class)
      .build();

    typeBuilder.build();
  }

  public OrqueioPotentialStarterImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public ResourceAssignmentExpression getResourceAssignmentExpression() {
    return resourceAssignmentExpressionChild.getChild(this);
  }

  public void setResourceAssignmentExpression(ResourceAssignmentExpression resourceAssignmentExpression) {
    resourceAssignmentExpressionChild.setChild(this, resourceAssignmentExpression);
  }
}
