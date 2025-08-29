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

import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN10_NS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN11_NS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN_ATTRIBUTE_AUTO_COMPLETE;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN_ATTRIBUTE_EXIT_CRITERIA_REFS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN_ELEMENT_STAGE;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

import io.orqueio.bpm.model.cmmn.instance.ExitCriterion;
import io.orqueio.bpm.model.cmmn.instance.PlanFragment;
import io.orqueio.bpm.model.cmmn.instance.PlanItemDefinition;
import io.orqueio.bpm.model.cmmn.instance.PlanningTable;
import io.orqueio.bpm.model.cmmn.instance.Sentry;
import io.orqueio.bpm.model.cmmn.instance.Stage;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;
import io.orqueio.bpm.model.xml.type.attribute.Attribute;
import io.orqueio.bpm.model.xml.type.child.ChildElement;
import io.orqueio.bpm.model.xml.type.child.ChildElementCollection;
import io.orqueio.bpm.model.xml.type.child.SequenceBuilder;
import io.orqueio.bpm.model.xml.type.reference.AttributeReferenceCollection;

/**
 * @author Roman Smirnov
 *
 */
public class StageImpl extends PlanFragmentImpl implements Stage {

  protected static Attribute<Boolean> autoCompleteAttribute;
  protected static ChildElement<PlanningTable> planningTableChild;
  protected static ChildElementCollection<PlanItemDefinition> planItemDefinitionCollection;

  // cmmn 1.0
  @Deprecated
  protected static AttributeReferenceCollection<Sentry> exitCriteriaRefCollection;

  // cmmn 1.1
  protected static ChildElementCollection<ExitCriterion> exitCriterionCollection;

  public StageImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

  public boolean isAutoComplete() {
    return autoCompleteAttribute.getValue(this);
  }

  public void setAutoComplete(boolean autoComplete) {
    autoCompleteAttribute.setValue(this, autoComplete);
  }

  public Collection<Sentry> getExitCriterias() {
    return exitCriteriaRefCollection.getReferenceTargetElements(this);
  }

  public Collection<Sentry> getExitCriteria() {
    if (!isCmmn11()) {
      return Collections.unmodifiableCollection(getExitCriterias());
    }
    else {
      List<Sentry> sentries = new ArrayList<Sentry>();
      Collection<ExitCriterion> exitCriterions = getExitCriterions();
      for (ExitCriterion exitCriterion : exitCriterions) {
        Sentry sentry = exitCriterion.getSentry();
        if (sentry != null) {
          sentries.add(sentry);
        }
      }
      return Collections.unmodifiableCollection(sentries);
    }
  }

  public Collection<ExitCriterion> getExitCriterions() {
    return exitCriterionCollection.get(this);
  }

  public PlanningTable getPlanningTable() {
    return planningTableChild.getChild(this);
  }

  public void setPlanningTable(PlanningTable planningTable) {
    planningTableChild.setChild(this, planningTable);
  }

  public Collection<PlanItemDefinition> getPlanItemDefinitions() {
    return planItemDefinitionCollection.get(this);
  }

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(Stage.class, CMMN_ELEMENT_STAGE)
        .namespaceUri(CMMN11_NS)
        .extendsType(PlanFragment.class)
        .instanceProvider(new ModelTypeInstanceProvider<Stage>() {
          public Stage newInstance(ModelTypeInstanceContext instanceContext) {
            return new StageImpl(instanceContext);
          }
        });

    autoCompleteAttribute = typeBuilder.booleanAttribute(CMMN_ATTRIBUTE_AUTO_COMPLETE)
        .defaultValue(false)
        .build();

    exitCriteriaRefCollection = typeBuilder.stringAttribute(CMMN_ATTRIBUTE_EXIT_CRITERIA_REFS)
        .namespace(CMMN10_NS)
        .idAttributeReferenceCollection(Sentry.class, CmmnAttributeElementReferenceCollection.class)
        .build();

    SequenceBuilder sequenceBuilder = typeBuilder.sequence();

    planningTableChild = sequenceBuilder.element(PlanningTable.class)
        .build();

    planItemDefinitionCollection = sequenceBuilder.elementCollection(PlanItemDefinition.class)
        .build();

    exitCriterionCollection = sequenceBuilder.elementCollection(ExitCriterion.class)
        .build();

    typeBuilder.build();
  }

}
