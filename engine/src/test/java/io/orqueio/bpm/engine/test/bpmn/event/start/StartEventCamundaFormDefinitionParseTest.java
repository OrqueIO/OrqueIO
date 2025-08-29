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
package io.orqueio.bpm.engine.test.bpmn.event.start;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.orqueio.bpm.engine.ParseException;
import io.orqueio.bpm.engine.RepositoryService;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.form.FormDefinition;
import io.orqueio.bpm.engine.impl.persistence.entity.ProcessDefinitionEntity;
import io.orqueio.bpm.engine.impl.test.TestHelper;
import io.orqueio.bpm.engine.repository.ProcessDefinition;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.util.ProcessEngineTestRule;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;

public class StartEventOrqueioFormDefinitionParseTest {

  public ProcessEngineRule engineRule = new ProvidedProcessEngineRule();
  public ProcessEngineTestRule testRule = new ProcessEngineTestRule(engineRule);

  @Rule
  public RuleChain chain = RuleChain.outerRule(engineRule).around(testRule);

  public RepositoryService repositoryService;
  public ProcessEngineConfigurationImpl processEngineConfiguration;

  @Before
  public void setup() {
    repositoryService = engineRule.getRepositoryService();
    processEngineConfiguration = engineRule.getProcessEngineConfiguration();
  }

  @After
  public void tearDown() {
    for (io.orqueio.bpm.engine.repository.Deployment deployment : repositoryService.createDeploymentQuery().list()) {
      repositoryService.deleteDeployment(deployment.getId(), true);
    }
  }

  protected FormDefinition getStartFormDefinition() {
    return getProcessDefinition().getStartFormDefinition();
  }

private ProcessDefinitionEntity getProcessDefinition() {
  ProcessDefinition processDefinition = repositoryService.createProcessDefinitionQuery().singleResult();
  ProcessDefinitionEntity cachedProcessDefinition = processEngineConfiguration.getDeploymentCache()
      .getProcessDefinitionCache().get(processDefinition.getId());
  return cachedProcessDefinition;
}

  @Test
  @Deployment
  public void shouldParseOrqueioFormDefinitionVersionBinding() {
    // given a deployed process with a StartEvent containing a Orqueio Form definition with version binding
    // then
    FormDefinition startFormDefinition = getStartFormDefinition();

    assertThat(startFormDefinition.getOrqueioFormDefinitionKey().getExpressionText()).isEqualTo("formId");
    assertThat(startFormDefinition.getOrqueioFormDefinitionBinding()).isEqualTo("version");
    assertThat(startFormDefinition.getOrqueioFormDefinitionVersion().getExpressionText()).isEqualTo("1");
  }

  @Test
  @Deployment
  public void shouldParseOrqueioFormDefinitionLatestBinding() {
    // given a deployed process with a StartEvent containing a Orqueio Form definition with latest binding
    // then
    FormDefinition startFormDefinition = getStartFormDefinition();

    assertThat(startFormDefinition.getOrqueioFormDefinitionKey().getExpressionText()).isEqualTo("formId");
    assertThat(startFormDefinition.getOrqueioFormDefinitionBinding()).isEqualTo("latest");
  }

  @Test
  @Deployment
  public void shouldParseOrqueioFormDefinitionMultipleStartEvents() {
    // given a deployed process with a StartEvent containing a Orqueio Form definition with latest binding and another StartEvent inside a subprocess
    // then
    FormDefinition startFormDefinition = getStartFormDefinition();

    assertThat(startFormDefinition.getOrqueioFormDefinitionKey().getExpressionText()).isEqualTo("formId");
    assertThat(startFormDefinition.getOrqueioFormDefinitionBinding()).isEqualTo("latest");
  }

  @Test
  @Deployment
  public void shouldParseOrqueioFormDefinitionDeploymentBinding() {
    // given a deployed process with a StartEvent containing a Orqueio Form definition with deployment binding
    // then
    FormDefinition startFormDefinition = getStartFormDefinition();

    assertThat(startFormDefinition.getOrqueioFormDefinitionKey().getExpressionText()).isEqualTo("formId");
    assertThat(startFormDefinition.getOrqueioFormDefinitionBinding()).isEqualTo("deployment");
  }

  @Test
  public void shouldNotParseOrqueioFormDefinitionUnsupportedBinding() {
    // given a deployed process with a UserTask containing a Orqueio Form definition with unsupported binding
    String resource = TestHelper.getBpmnProcessDefinitionResource(getClass(), "shouldNotParseOrqueioFormDefinitionUnsupportedBinding");

    // when/then expect parse exception
    assertThatThrownBy(() -> repositoryService.createDeployment().name(resource).addClasspathResource(resource).deploy())
      .isInstanceOf(ParseException.class)
      .hasMessageContaining("Invalid element definition: value for formRefBinding attribute has to be one of [deployment, latest, version] but was unsupported");
  }

  public void shouldNotParseOrqueioFormDefinitionAndFormKey() {
    // given a deployed process with a UserTask containing a Orqueio Form definition and formKey
    String resource = TestHelper.getBpmnProcessDefinitionResource(getClass(), "shouldNotParseOrqueioFormDefinitionAndFormKey");

    // when/then expect parse exception
    assertThatThrownBy(() -> repositoryService.createDeployment().name(resource).addClasspathResource(resource).deploy())
      .isInstanceOf(ParseException.class)
      .hasMessageContaining("Invalid element definition: only one of the attributes formKey and formRef is allowed.");
  }
}
