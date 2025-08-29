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
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN_ELEMENT_PLAN_FRAGMENT;

import java.util.Collection;

import io.orqueio.bpm.model.cmmn.instance.PlanFragment;
import io.orqueio.bpm.model.cmmn.instance.PlanItem;
import io.orqueio.bpm.model.cmmn.instance.PlanItemDefinition;
import io.orqueio.bpm.model.cmmn.instance.Sentry;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.child.ChildElementCollection;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;

/**
 * @author Roman Smirnov
 *
 */
public class PlanFragmentImpl extends PlanItemDefinitionImpl implements PlanFragment {

  protected static ChildElementCollection<PlanItem> planItemCollection;
  protected static ChildElementCollection<Sentry> sentryCollection;

  public PlanFragmentImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public Collection<PlanItem> getPlanItems() {
    return planItemCollection.get(this);
  }

  public Collection<Sentry> getSentrys() {
    return sentryCollection.get(this);
  }

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(PlanFragment.class, CMMN_ELEMENT_PLAN_FRAGMENT)
        .namespaceUri(CMMN11_NS)
        .extendsType(PlanItemDefinition.class)
        .instanceProvider(new ModelTypeInstanceProvider<PlanFragment>() {
          public PlanFragment newInstance(ModelTypeInstanceContext instanceContext) {
            return new PlanFragmentImpl(instanceContext);
          }
        });

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    planItemCollection = sequenceBuilder.elementCollection(PlanItem.class)
        .build();

    sentryCollection = sequenceBuilder.elementCollection(Sentry.class)
        .build();

    typeBuilder.build();
  }

}
