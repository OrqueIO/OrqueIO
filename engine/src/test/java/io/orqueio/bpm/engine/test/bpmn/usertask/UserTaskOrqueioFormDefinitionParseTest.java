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
package io.orqueio.bpm.engine.test.bpmn.usertask;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.Assert.assertNotNull;

import io.orqueio.bpm.engine.ParseException;
import io.orqueio.bpm.engine.RepositoryService;
import io.orqueio.bpm.engine.impl.bpmn.behavior.UserTaskActivityBehavior;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.form.FormDefinition;
import io.orqueio.bpm.engine.impl.persistence.entity.ProcessDefinitionEntity;
import io.orqueio.bpm.engine.impl.pvm.process.ActivityImpl;
import io.orqueio.bpm.engine.impl.task.TaskDefinition;
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

public class UserTaskOrqueioFormDefinitionParseTest {

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

  protected ActivityImpl findActivityInDeployedProcessDefinition(String activityId) {
    ProcessDefinition processDefinition = repositoryService.createProcessDefinitionQuery().singleResult();
    assertNotNull(processDefinition);

    ProcessDefinitionEntity cachedProcessDefinition = processEngineConfiguration.getDeploymentCache()
        .getProcessDefinitionCache().get(processDefinition.getId());
    return cachedProcessDefinition.findActivity(activityId);
  }

  @Test
  @Deployment
  public void shouldParseOrqueioFormDefinitionVersionBinding() {
    // given a deployed process with a UserTask containing a Orqueio Form definition with version binding
    // then
    TaskDefinition taskDefinition = findUserTaskDefinition("UserTask");
    FormDefinition formDefinition = taskDefinition.getFormDefinition();

    assertThat(taskDefinition.getOrqueioFormDefinitionKey().getExpressionText()).isEqualTo("formId");
    assertThat(formDefinition.getOrqueioFormDefinitionKey().getExpressionText()).isEqualTo("formId");

    assertThat(taskDefinition.getOrqueioFormDefinitionBinding()).isEqualTo("version");
    assertThat(formDefinition.getOrqueioFormDefinitionBinding()).isEqualTo("version");

    assertThat(taskDefinition.getOrqueioFormDefinitionVersion().getExpressionText()).isEqualTo("1");
    assertThat(formDefinition.getOrqueioFormDefinitionVersion().getExpressionText()).isEqualTo("1");
  }

  @Test
  @Deployment
  public void shouldParseOrqueioFormDefinitionLatestBinding() {
    // given a deployed process with a UserTask containing a Orqueio Form definition with latest binding
    // then
    TaskDefinition taskDefinition = findUserTaskDefinition("UserTask");
    FormDefinition formDefinition = taskDefinition.getFormDefinition();

    assertThat(taskDefinition.getOrqueioFormDefinitionKey().getExpressionText()).isEqualTo("formId");
    assertThat(formDefinition.getOrqueioFormDefinitionKey().getExpressionText()).isEqualTo("formId");

    assertThat(taskDefinition.getOrqueioFormDefinitionBinding()).isEqualTo("latest");
    assertThat(formDefinition.getOrqueioFormDefinitionBinding()).isEqualTo("latest");
  }

  @Test
  @Deployment
  public void shouldParseOrqueioFormDefinitionDeploymentBinding() {
    // given a deployed process with a UserTask containing a Orqueio Form definition with deployment binding
    // then
    TaskDefinition taskDefinition = findUserTaskDefinition("UserTask");
    FormDefinition formDefinition = taskDefinition.getFormDefinition();

    assertThat(taskDefinition.getOrqueioFormDefinitionKey().getExpressionText()).isEqualTo("formId");
    assertThat(formDefinition.getOrqueioFormDefinitionKey().getExpressionText()).isEqualTo("formId");

    assertThat(taskDefinition.getOrqueioFormDefinitionBinding()).isEqualTo("deployment");
    assertThat(formDefinition.getOrqueioFormDefinitionBinding()).isEqualTo("deployment");
  }

  @Test
  @Deployment
  public void shouldParseTwoUserTasksWithOrqueioFormDefinition() {
    // given a deployed process with two UserTask containing a Orqueio Form definition with deployment binding
    // then
    TaskDefinition taskDefinition1 = findUserTaskDefinition("UserTask_1");
    FormDefinition formDefinition1 = taskDefinition1.getFormDefinition();

    assertThat(taskDefinition1.getOrqueioFormDefinitionKey().getExpressionText()).isEqualTo("formId_1");
    assertThat(formDefinition1.getOrqueioFormDefinitionKey().getExpressionText()).isEqualTo("formId_1");

    assertThat(taskDefinition1.getOrqueioFormDefinitionBinding()).isEqualTo("deployment");
    assertThat(formDefinition1.getOrqueioFormDefinitionBinding()).isEqualTo("deployment");

    TaskDefinition taskDefinition2 = findUserTaskDefinition("UserTask_2");
    FormDefinition formDefinition2 = taskDefinition2.getFormDefinition();
    assertThat(taskDefinition2.getOrqueioFormDefinitionKey().getExpressionText()).isEqualTo("formId_2");
    assertThat(formDefinition2.getOrqueioFormDefinitionKey().getExpressionText()).isEqualTo("formId_2");

    assertThat(taskDefinition2.getOrqueioFormDefinitionBinding()).isEqualTo("version");
    assertThat(formDefinition2.getOrqueioFormDefinitionBinding()).isEqualTo("version");

    assertThat(taskDefinition2.getOrqueioFormDefinitionVersion().getExpressionText()).isEqualTo("2");
    assertThat(formDefinition2.getOrqueioFormDefinitionVersion().getExpressionText()).isEqualTo("2");
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

  @Test
  public void shouldNotParseOrqueioFormDefinitionAndFormKey() {
    // given a deployed process with a UserTask containing a Orqueio Form definition and formKey
    String resource = TestHelper.getBpmnProcessDefinitionResource(getClass(), "shouldNotParseOrqueioFormDefinitionAndFormKey");

    // when/then expect parse exception
    assertThatThrownBy(() -> repositoryService.createDeployment().name(resource).addClasspathResource(resource).deploy())
      .isInstanceOf(ParseException.class)
      .hasMessageContaining("Invalid element definition: only one of the attributes formKey and formRef is allowed.");
  }

  private TaskDefinition findUserTaskDefinition(String activityId) {
    ActivityImpl userTask = findActivityInDeployedProcessDefinition(activityId);
    assertThat(userTask).isNotNull();

    TaskDefinition taskDefinition = ((UserTaskActivityBehavior) userTask.getActivityBehavior()).getTaskDecorator()
        .getTaskDefinition();
    return taskDefinition;
  }
}
