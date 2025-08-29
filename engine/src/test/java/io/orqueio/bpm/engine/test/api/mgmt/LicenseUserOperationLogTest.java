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
package io.orqueio.bpm.engine.test.api.mgmt;

import static org.assertj.core.api.Assertions.assertThat;

import io.orqueio.bpm.engine.EntityTypes;
import io.orqueio.bpm.engine.HistoryService;
import io.orqueio.bpm.engine.IdentityService;
import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.ProcessEngineConfiguration;
import io.orqueio.bpm.engine.history.UserOperationLogEntry;
import io.orqueio.bpm.engine.impl.cmd.LicenseCmd;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.RequiredHistoryLevel;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;

@RequiredHistoryLevel(ProcessEngineConfiguration.HISTORY_FULL)
public class LicenseUserOperationLogTest {

  private final static String LICENSE_KEY = "testLicenseKey";
  private static final String USER_ID = "testUserId";

  @Rule
  public ProcessEngineRule engineRule = new ProvidedProcessEngineRule();

  ProcessEngine processEngine;
  ManagementService managementService;
  HistoryService historyService;
  IdentityService identityService;

  @Before
  public void init() {
    processEngine = engineRule.getProcessEngine();
    managementService = processEngine.getManagementService();
    historyService = processEngine.getHistoryService();
    identityService = processEngine.getIdentityService();
  }

  @After
  public void tearDown() {
    identityService.clearAuthentication();
    managementService.deleteLicenseKey();
  }

  @Test
  public void shouldUpdateOperationLogWhenSetLicense() {
    // given
    identityService.setAuthenticatedUserId(USER_ID);

    // when
    managementService.setLicenseKey(LICENSE_KEY);
    UserOperationLogEntry entry = historyService.createUserOperationLogQuery().singleResult();

    // then
    assertOperationLogEntry(entry, UserOperationLogEntry.OPERATION_TYPE_CREATE, LicenseCmd.LICENSE_KEY_BYTE_ARRAY_ID);
  }

  @Test
  public void shouldUpdateOperationLogWhenUpdateLicense() {
    // given
    managementService.setLicenseKey("oldLicense");
    identityService.setAuthenticatedUserId(USER_ID);

    // when
    managementService.setLicenseKey(LICENSE_KEY);
    UserOperationLogEntry entry = historyService.createUserOperationLogQuery().singleResult();

    // then
    assertOperationLogEntry(entry, UserOperationLogEntry.OPERATION_TYPE_UPDATE, LicenseCmd.LICENSE_KEY_BYTE_ARRAY_ID);
  }

  @Test
  public void shouldUpdateOperationLogWhenUpdateLegacyLicense() {
    // given legacy license
    managementService.setProperty(LicenseCmd.LICENSE_KEY_PROPERTY_NAME, "oldLicense");
    identityService.setAuthenticatedUserId(USER_ID);
    // when
    managementService.setLicenseKey(LICENSE_KEY);
    // then
    assertThat(historyService.createUserOperationLogQuery().count()).isEqualTo(2L);
    UserOperationLogEntry createEntry = historyService.createUserOperationLogQuery().operationType(UserOperationLogEntry.OPERATION_TYPE_CREATE).singleResult();
    UserOperationLogEntry deleteEntry = historyService.createUserOperationLogQuery().operationType(UserOperationLogEntry.OPERATION_TYPE_DELETE).singleResult();
    assertOperationLogEntry(createEntry, UserOperationLogEntry.OPERATION_TYPE_CREATE, LicenseCmd.LICENSE_KEY_BYTE_ARRAY_ID);
    assertOperationLogEntry(deleteEntry, UserOperationLogEntry.OPERATION_TYPE_DELETE, LicenseCmd.LICENSE_KEY_PROPERTY_NAME);
  }

  @Test
  public void shouldUpdateOperationLogWhenUpdateLicenseDuplicate() {
    // given
    managementService.setLicenseKey(LICENSE_KEY);
    identityService.setAuthenticatedUserId(USER_ID);
    
    // when
    managementService.setLicenseKey(LICENSE_KEY);
    UserOperationLogEntry entry = historyService.createUserOperationLogQuery().singleResult();
    
    // then
    assertOperationLogEntry(entry, UserOperationLogEntry.OPERATION_TYPE_UPDATE, LicenseCmd.LICENSE_KEY_BYTE_ARRAY_ID);
  }

  @Test
  public void shouldUpdateOperationLogWhenDeleteLicense() {
    // given
    managementService.setLicenseKey(LICENSE_KEY);
    identityService.setAuthenticatedUserId(USER_ID);

    // when
    managementService.deleteLicenseKey();
    UserOperationLogEntry entry = historyService.createUserOperationLogQuery().singleResult();

    // then
    assertOperationLogEntry(entry, UserOperationLogEntry.OPERATION_TYPE_DELETE, LicenseCmd.LICENSE_KEY_BYTE_ARRAY_ID);
  }

  @Test
  public void shouldNotUpdateOperationLogWhenDeleteNonExistingLicense() {
    // given
    identityService.setAuthenticatedUserId(USER_ID);
    
    // when
    managementService.deleteLicenseKey();
    UserOperationLogEntry entry = historyService.createUserOperationLogQuery().singleResult();
    
    // then
    assertThat(entry).isNull();
  }

  private void assertOperationLogEntry(UserOperationLogEntry entry, String expectedOperationType, String expectedNewValue) {
    assertThat(entry.getEntityType()).isEqualTo(EntityTypes.PROPERTY);
    assertThat(entry.getCategory()).isEqualTo(UserOperationLogEntry.CATEGORY_ADMIN);
    assertThat(entry.getOperationType()).isEqualTo(expectedOperationType);
    assertThat(entry.getProperty()).isEqualTo("name");
    assertThat(entry.getOrgValue()).isNull();
    assertThat(entry.getNewValue()).isEqualTo(expectedNewValue);
  }
}
