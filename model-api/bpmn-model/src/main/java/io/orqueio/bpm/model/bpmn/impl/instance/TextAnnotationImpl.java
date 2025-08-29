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

import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN20_NS;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ATTRIBUTE_TEXT_FORMAT;
import static io.orqueio.bpm.model.bpmn.impl.BpmnModelConstants.BPMN_ELEMENT_TEXT_ANNOTATION;

import io.orqueio.bpm.model.bpmn.instance.Artifact;
import io.orqueio.bpm.model.bpmn.instance.Script;
import io.orqueio.bpm.model.bpmn.instance.Text;
import io.orqueio.bpm.model.bpmn.instance.TextAnnotation;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

/**
 * The BPMN 2.0 textAnnotation element
 *
 * @author Filip Hrisafov
 */
public class TextAnnotationImpl extends ArtifactImpl implements TextAnnotation {

  protected static Attribute<String> textFormatAttribute;
  protected static ChildElement<Text> textChild;

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder
      .defineType(TextAnnotation.class, BPMN_ELEMENT_TEXT_ANNOTATION).namespaceUri(BPMN20_NS)
      .extendsType(Artifact.class)
      .instanceProvider(new ModelTypeInstanceProvider<TextAnnotation>() {
        public TextAnnotation newInstance(ModelTypeInstanceContext context) {
          return new TextAnnotationImpl(context);
        }
      });

    textFormatAttribute = typeBuilder.stringAttribute(BPMN_ATTRIBUTE_TEXT_FORMAT)
      .defaultValue("text/plain")
      .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    textChild = sequenceBuilder.element(Text.class)
      .build();

    typeBuilder.build();
  }

  public TextAnnotationImpl(ModelTypeInstanceContext context) {
    super(context);
  }

  public String getTextFormat() {
    return textFormatAttribute.getValue(this);
  }

  public void setTextFormat(String textFormat) {
    textFormatAttribute.setValue(this, textFormat);
  }

  public Text getText() {
    return textChild.getChild(this);
  }

  public void setText(Text text) {
    textChild.setChild(this, text);
  }
}
