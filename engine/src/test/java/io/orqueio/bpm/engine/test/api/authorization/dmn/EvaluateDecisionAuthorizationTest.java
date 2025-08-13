/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. Camunda licenses this file to you under the Apache License,
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
package io.orqueio.bpm.engine.test.api.authorization.dmn;

import static org.assertj.core.api.Assertions.assertThat;
import static io.orqueio.bpm.engine.test.api.authorization.util.AuthorizationScenario.scenario;
import static io.orqueio.bpm.engine.test.api.authorization.util.AuthorizationSpec.grant;
import static org.hamcrest.CoreMatchers.notNullValue;

import java.util.Collection;

import io.orqueio.bpm.dmn.engine.DmnDecisionTableResult;
import io.orqueio.bpm.engine.authorization.Permissions;
import io.orqueio.bpm.engine.authorization.Resources;
import io.orqueio.bpm.engine.repository.DecisionDefinition;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.api.authorization.util.AuthorizationScenario;
import io.orqueio.bpm.engine.test.api.authorization.util.AuthorizationTestRule;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import io.orqueio.bpm.engine.variable.VariableMap;
import io.orqueio.bpm.engine.variable.Variables;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;
import org.junit.runners.Parameterized.Parameter;
import org.junit.runners.Parameterized.Parameters;

/**
 * @author Philipp Ossler
 */
@RunWith(Parameterized.class)
public class EvaluateDecisionAuthorizationTest {

  protected static final String DMN_FILE = "org/camunda/bpm/engine/test/api/dmn/Example.dmn";
  protected static final String DECISION_DEFINITION_KEY = "decision";

  public ProcessEngineRule engineRule = new ProvidedProcessEngineRule();
  public AuthorizationTestRule authRule = new AuthorizationTestRule(engineRule);

  @Rule
  public RuleChain chain = RuleChain.outerRule(engineRule).around(authRule);

  @Parameter
  public AuthorizationScenario scenario;

  @Parameters(name = "scenario {index}")
  public static Collection<AuthorizationScenario[]> scenarios() {
    return AuthorizationTestRule.asParameters(
      scenario()
        .withoutAuthorizations()
        .failsDueToRequired(
          grant(Resources.DECISION_DEFINITION, DECISION_DEFINITION_KEY, "userId", Permissions.CREATE_INSTANCE)),
      scenario()
        .withAuthorizations(
          grant(Resources.DECISION_DEFINITION, DECISION_DEFINITION_KEY, "userId", Permissions.CREATE_INSTANCE))
        .succeeds(),
      scenario()
        .withAuthorizations(
          grant(Resources.DECISION_DEFINITION, "*", "userId", Permissions.CREATE_INSTANCE))
        .succeeds()
      );
  }

  @Before
  public void setUp() {
    authRule.createUserAndGroup("userId", "groupId");
  }

  @After
  public void tearDown() {
    authRule.deleteUsersAndGroups();
  }

  @Test
  @Deployment(resources = DMN_FILE)
  public void evaluateDecisionById() {

    // given
    DecisionDefinition decisionDefinition = engineRule.getRepositoryService().createDecisionDefinitionQuery().singleResult();

    // when
    authRule.init(scenario).withUser("userId").bindResource("decisionDefinitionKey", DECISION_DEFINITION_KEY).start();

    DmnDecisionTableResult decisionResult = engineRule.getDecisionService().evaluateDecisionTableById(decisionDefinition.getId(), createVariables());

    // then
    if (authRule.assertScenario(scenario)) {
      assertThatDecisionHasExpectedResult(decisionResult);
    }
  }

  @Test
  @Deployment(resources = DMN_FILE)
  public void evaluateDecisionByKey() {

    // given
    DecisionDefinition decisionDefinition = engineRule.getRepositoryService().createDecisionDefinitionQuery().singleResult();

    // when
    authRule.init(scenario).withUser("userId").bindResource("decisionDefinitionKey", DECISION_DEFINITION_KEY).start();

    DmnDecisionTableResult decisionResult = engineRule.getDecisionService().evaluateDecisionTableByKey(decisionDefinition.getKey(), createVariables());

    // then
    if (authRule.assertScenario(scenario)) {
      assertThatDecisionHasExpectedResult(decisionResult);
    }
  }

  @Test
  @Deployment(resources = DMN_FILE)
  public void evaluateDecisionByKeyAndVersion() {

    // given
    DecisionDefinition decisionDefinition = engineRule.getRepositoryService().createDecisionDefinitionQuery().singleResult();

    // when
    authRule.init(scenario).withUser("userId").bindResource("decisionDefinitionKey", DECISION_DEFINITION_KEY).start();

    DmnDecisionTableResult decisionResult = engineRule.getDecisionService().evaluateDecisionTableByKeyAndVersion(decisionDefinition.getKey(),
        decisionDefinition.getVersion(), createVariables());

    // then
    if (authRule.assertScenario(scenario)) {
      assertThatDecisionHasExpectedResult(decisionResult);
    }
  }

  protected VariableMap createVariables() {
    return Variables.createVariables().putValue("status", "silver").putValue("sum", 723);
  }

  protected void assertThatDecisionHasExpectedResult(DmnDecisionTableResult decisionResult) {
    assertThat(decisionResult).isNotNull();
    assertThat(decisionResult).hasSize(1);
    String value = decisionResult.getSingleResult().getFirstEntry();
    assertThat(value).isEqualTo("ok");
  }

}
