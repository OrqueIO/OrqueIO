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
package io.orqueio.bpm.spring.boot.starter;

import static org.assertj.core.api.Assertions.assertThat;

import io.orqueio.bpm.engine.repository.ProcessDefinition;
import io.orqueio.bpm.spring.boot.starter.AdditionalCammundaBpmConfigurations.AfterStandardConfiguration;
import io.orqueio.bpm.spring.boot.starter.AdditionalCammundaBpmConfigurations.BeforeStandardConfiguration;
import io.orqueio.bpm.spring.boot.starter.test.nonpa.TestApplication;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.test.context.junit4.SpringRunner;

@RunWith(SpringRunner.class)
@SpringBootTest(
  classes = { TestApplication.class, AdditionalCammundaBpmConfigurations.class },
  webEnvironment = WebEnvironment.NONE,
  properties = { "orqueio.bpm.admin-user.id=admin"}
)
public class OrqueioAutoConfigurationIT extends AbstractOrqueioAutoConfigurationIT {

  @Test
  public void autoDeploymentTest() {
    ProcessDefinition processDefinition = repositoryService.createProcessDefinitionQuery().processDefinitionName("TestProcess").singleResult();
    assertThat(processDefinition).isNotNull();
  }

  @Test
  public void jobConfigurationTest() {
    assertThat(jobExecutor.isActive()).isTrue();
  }

  @Test
  public void orderedConfigurationTest() {
    assertThat(BeforeStandardConfiguration.PROCESSED).isTrue();
    assertThat(AfterStandardConfiguration.PROCESSED).isTrue();
  }

  @Test
  public void adminUserCreatedWithDefaultPassword() throws Exception {
    assertThat(identityService.checkPassword("admin", "admin")).isTrue();
  }
}
