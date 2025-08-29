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
package io.orqueio.bpm.engine.test.api.history;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.orqueio.bpm.engine.AuthorizationService;
import io.orqueio.bpm.engine.BadUserRequestException;
import io.orqueio.bpm.engine.authorization.HistoricTaskPermissions;
import io.orqueio.bpm.engine.authorization.Resources;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;

public class EnableHistoricInstancePermissionsTest {

  @Rule
  public ProvidedProcessEngineRule engineRule = new ProvidedProcessEngineRule();

  protected ProcessEngineConfigurationImpl config;
  protected AuthorizationService authorizationService;

  @Before
  public void assign() {
    config = (ProcessEngineConfigurationImpl) engineRule.getProcessEngine()
        .getProcessEngineConfiguration();
    authorizationService = engineRule.getAuthorizationService();
  }

  @After
  public void resetConfig() {
    config.setEnableHistoricInstancePermissions(false);
  }

  @Test
  public void shouldBeFalseByDefault() {
    // given

    // when

    // then
    assertThat(config.isEnableHistoricInstancePermissions())
      .isFalse();
  }

  @Test
  public void shouldBeConfiguredToTrue() {
    // given

    // when
    config.setEnableHistoricInstancePermissions(true);

    // then
    assertThat(config.isEnableHistoricInstancePermissions())
        .isTrue();
  }

  @Test
  public void shouldBeConfiguredToFalse() {
    // given

    // when
    config.setEnableHistoricInstancePermissions(false);

    // then
    assertThat(config.isEnableHistoricInstancePermissions())
        .isFalse();
  }

  @Test
  public void shouldThrowExceptionWhenHistoricInstancePermissionsAreDisabled_Task() {
    // given
    config.setEnableHistoricInstancePermissions(false);

    // when/then
    assertThatThrownBy(() -> authorizationService.isUserAuthorized("myUserId", null,
        HistoricTaskPermissions.ALL, Resources.HISTORIC_TASK))
      .isInstanceOf(BadUserRequestException.class)
      .hasMessageContaining("ENGINE-03090 Historic instance permissions are disabled, " +
          "please check your process engine configuration.");
  }

  @Test
  public void shouldThrowExceptionWhenHistoricInstancePermissionsAreDisabled_ProcessInstance() {
    // given
    config.setEnableHistoricInstancePermissions(false);

    // when/then
    assertThatThrownBy(() -> authorizationService.isUserAuthorized("myUserId", null,
        HistoricTaskPermissions.ALL, Resources.HISTORIC_PROCESS_INSTANCE))
      .isInstanceOf(BadUserRequestException.class)
      .hasMessageContaining("ENGINE-03090 Historic instance permissions are disabled, " +
          "please check your process engine configuration.");
  }

}
