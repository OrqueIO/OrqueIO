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
package io.orqueio.bpm.engine.test.bpmn;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import io.orqueio.bpm.engine.ProcessEngineException;
import io.orqueio.bpm.engine.RepositoryService;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.repository.OrqueioFormDefinition;
import io.orqueio.bpm.engine.repository.Deployment;
import io.orqueio.bpm.engine.repository.Resource;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.form.deployment.FindOrqueioFormDefinitionsCmd;
import io.orqueio.bpm.engine.test.util.ProcessEngineTestRule;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;

public class OrqueioFormDefinitionStrictParseTest {

  private static final String FORM = "io/orqueio/bpm/engine/test/bpmn/OrqueioFormDefinitionStrictParseTest.anyForm.form";

  public ProcessEngineRule engineRule = new ProvidedProcessEngineRule();
  public ProcessEngineTestRule testRule = new ProcessEngineTestRule(engineRule);

  @Rule
  public RuleChain chain = RuleChain.outerRule(engineRule).around(testRule);

  protected ProcessEngineConfigurationImpl processEngineConfiguration;
  protected RepositoryService repositoryService;


  @Before
  public void setup() {
    repositoryService = engineRule.getRepositoryService();
    processEngineConfiguration = engineRule.getProcessEngineConfiguration();
  }

  @After
  public void reset() {
    processEngineConfiguration.setDisableStrictOrqueioFormParsing(false);
  }

  @Test
  public void shouldParseAnyFormFile_strictParsingDisabled() {
    // given
    processEngineConfiguration.setDisableStrictOrqueioFormParsing(true);

    // when
    testRule.deploy(FORM);

    // then deployment was successful
    List<Deployment> deployments = repositoryService.createDeploymentQuery().list();
    assertThat(deployments).hasSize(1);

    // resource was still deployed
    List<Resource> resources = repositoryService.getDeploymentResources(deployments.get(0).getId());
    assertThat(resources).hasSize(1);
    assertThat(resources.get(0).getName()).isEqualTo(FORM);

    // no form definition was created
    List<OrqueioFormDefinition> formDefinitions = engineRule.getProcessEngineConfiguration().getCommandExecutorTxRequired()
        .execute(new FindOrqueioFormDefinitionsCmd());
    assertThat(formDefinitions).hasSize(0);

  }

  @Test
  public void shouldNotParseAnyFormFile_strictParsingEnabled() {
    // given
    processEngineConfiguration.setDisableStrictOrqueioFormParsing(false);

    // then deployment fails with an exception
    assertThatThrownBy(() -> {
      testRule.deploy(FORM);
    }).isInstanceOf(ProcessEngineException.class)
    .hasMessageContaining("ENGINE-09033 Could not parse Orqueio Form resource io/orqueio/bpm/engine/test/bpmn/OrqueioFormDefinitionStrictParseTest.anyForm.form.");
    assertThat(repositoryService.createDeploymentQuery().list()).hasSize(0);
  }
}
