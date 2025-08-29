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
package io.orqueio.bpm.model.dmn.impl.instance;

import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.LATEST_DMN_NS;
import static io.orqueio.bpm.model.dmn.impl.DmnModelConstants.DMN_ELEMENT_DECISION_RULE;

import java.util.Collection;

import io.orqueio.bpm.model.dmn.instance.DecisionRule;
import io.orqueio.bpm.model.dmn.instance.DmnElement;
import io.orqueio.bpm.model.dmn.instance.InputEntry;
import io.orqueio.bpm.model.dmn.instance.OutputEntry;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.child.ChildElementCollection;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

public class DecisionRuleImpl extends DmnElementImpl implements DecisionRule {

  protected static ChildElementCollection<InputEntry> inputEntryCollection;
  protected static ChildElementCollection<OutputEntry> outputEntryCollection;

  public DecisionRuleImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public Collection<InputEntry> getInputEntries() {
    return inputEntryCollection.get(this);
  }

  public Collection<OutputEntry> getOutputEntries() {
    return outputEntryCollection.get(this);
  }

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(DecisionRule.class, DMN_ELEMENT_DECISION_RULE)
      .namespaceUri(LATEST_DMN_NS)
      .extendsType(DmnElement.class)
      .instanceProvider(new ModelTypeInstanceProvider<DecisionRule>() {
        public DecisionRule newInstance(ModelTypeInstanceContext instanceContext) {
          return new DecisionRuleImpl(instanceContext);
        }
      });

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    inputEntryCollection = sequenceBuilder.elementCollection(InputEntry.class)
      .build();

    outputEntryCollection = sequenceBuilder.elementCollection(OutputEntry.class)
      .required()
      .build();

    typeBuilder.build();
  }

}
