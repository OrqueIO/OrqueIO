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
package io.orqueio.bpm.model.bpmn.impl.instance.di;

import io.orqueio.bpm.model.bpmn.instance.dc.Bounds;
import io.orqueio.bpm.model.bpmn.instance.di.Node;
import io.orqueio.bpm.model.bpmn.instance.di.Shape;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.DI_ELEMENT_SHAPE;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.DI_NS;

/**
 * The DI Shape element
 *
 * @author Sebastian Menski
 */
public abstract class ShapeImpl extends NodeImpl implements Shape {

  protected static ChildElement<Bounds> boundsChild;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(Shape.class, DI_ELEMENT_SHAPE)
      .namespaceUri(DI_NS)
      .extendsType(Node.class)
      .abstractType();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    boundsChild = sequenceBuilder.element(Bounds.class)
      .required()
      .build();

    typeBuilder.build();
  }

  public ShapeImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public Bounds getBounds() {
    return boundsChild.getChild(this);
  }

  public void setBounds(Bounds bounds) {
    boundsChild.setChild(this, bounds);
  }
}
