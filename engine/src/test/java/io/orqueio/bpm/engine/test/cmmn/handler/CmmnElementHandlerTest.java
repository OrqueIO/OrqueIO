/*
 * Copyright TOADDLATERCCS and/or licensed to TOADDLATERCCS
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. TOADDLATERCCS this file to you under the Apache License,
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
package io.orqueio.bpm.engine.test.cmmn.handler;

import java.util.HashMap;

import io.orqueio.bpm.engine.impl.cmmn.entity.repository.CaseDefinitionEntity;
import io.orqueio.bpm.engine.impl.cmmn.handler.CmmnHandlerContext;
import io.orqueio.bpm.engine.impl.el.ExpressionManager;
import io.orqueio.bpm.engine.impl.el.JuelExpressionManager;
import io.orqueio.bpm.engine.impl.persistence.entity.DeploymentEntity;
import io.orqueio.bpm.engine.impl.task.TaskDefinition;
import io.orqueio.bpm.model.cmmn.Cmmn;
import io.orqueio.bpm.model.cmmn.CmmnModelInstance;
import io.orqueio.bpm.model.cmmn.instance.Case;
import io.orqueio.bpm.model.cmmn.instance.CasePlanModel;
import io.orqueio.bpm.model.cmmn.instance.CmmnModelElementInstance;
import io.orqueio.bpm.model.cmmn.instance.Definitions;
import io.orqueio.bpm.model.cmmn.instance.ExtensionElements;
import org.junit.Before;

/**
 * @author Roman Smirnov
 *
 */
public abstract class CmmnElementHandlerTest {

  protected CmmnModelInstance modelInstance;
  protected Definitions definitions;
  protected Case caseDefinition;
  protected CasePlanModel casePlanModel;
  protected CmmnHandlerContext context;

  @Before
  public void setup() {
    modelInstance = Cmmn.createEmptyModel();
    definitions = modelInstance.newInstance(Definitions.class);
    definitions.setTargetNamespace("http://orqueio.io/examples");
    modelInstance.setDefinitions(definitions);

    caseDefinition = createElement(definitions, "aCaseDefinition", Case.class);
    casePlanModel = createElement(caseDefinition, "aCasePlanModel", CasePlanModel.class);

    context = new CmmnHandlerContext();

    CaseDefinitionEntity caseDefinition = new CaseDefinitionEntity();
    caseDefinition.setTaskDefinitions(new HashMap<String, TaskDefinition>());
    context.setCaseDefinition(caseDefinition);

    ExpressionManager expressionManager = new JuelExpressionManager();
    context.setExpressionManager(expressionManager);

    DeploymentEntity deployment = new DeploymentEntity();
    deployment.setId("foo");
    context.setDeployment(deployment);
  }

  protected <T extends CmmnModelElementInstance> T createElement(CmmnModelElementInstance parentElement, Class<T> elementClass) {
    T element = modelInstance.newInstance(elementClass);
    parentElement.addChildElement(element);
    return element;
  }

  protected <T extends CmmnModelElementInstance> T createElement(CmmnModelElementInstance parentElement, String id, Class<T> elementClass) {
    T element = createElement(parentElement, elementClass);
    element.setAttributeValue("id", id, true);
    return element;
  }

  protected ExtensionElements addExtensionElements(CmmnModelElementInstance parentElement) {
    return createElement(parentElement, null, ExtensionElements.class);
  }

}
