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
package io.orqueio.bpm.engine.test.api.history;

import static org.assertj.core.api.Assertions.assertThat;
import static io.orqueio.bpm.engine.test.api.runtime.TestOrderingUtil.historicBatchByEndTime;
import static io.orqueio.bpm.engine.test.api.runtime.TestOrderingUtil.historicBatchById;
import static io.orqueio.bpm.engine.test.api.runtime.TestOrderingUtil.historicBatchByStartTime;
import static io.orqueio.bpm.engine.test.api.runtime.TestOrderingUtil.inverted;
import static io.orqueio.bpm.engine.test.api.runtime.TestOrderingUtil.verifySorting;
import static org.junit.Assert.assertEquals;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import java.util.Arrays;

import io.orqueio.bpm.engine.HistoryService;
import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.ProcessEngineConfiguration;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.batch.Batch;
import io.orqueio.bpm.engine.batch.history.HistoricBatch;
import io.orqueio.bpm.engine.exception.NotValidException;
import io.orqueio.bpm.engine.exception.NullValueException;
import io.orqueio.bpm.engine.impl.util.ClockUtil;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.RequiredHistoryLevel;
import io.orqueio.bpm.engine.test.api.runtime.migration.MigrationTestRule;
import io.orqueio.bpm.engine.test.api.runtime.migration.batch.BatchMigrationHelper;
import io.orqueio.bpm.engine.test.util.ClockTestUtil;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import org.hamcrest.CoreMatchers;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;

@RequiredHistoryLevel(ProcessEngineConfiguration.HISTORY_FULL)
public class HistoricBatchQueryTest {

  protected ProcessEngineRule engineRule = new ProvidedProcessEngineRule();
  protected MigrationTestRule migrationRule = new MigrationTestRule(engineRule);
  protected BatchMigrationHelper helper = new BatchMigrationHelper(engineRule, migrationRule);

  @Rule
  public RuleChain ruleChain = RuleChain.outerRule(engineRule).around(migrationRule);

  protected RuntimeService runtimeService;
  protected ManagementService managementService;
  protected HistoryService historyService;

  @Before
  public void initServices() {
    runtimeService = engineRule.getRuntimeService();
    managementService = engineRule.getManagementService();
    historyService = engineRule.getHistoryService();
  }

  @After
  public void removeBatches() {
    helper.removeAllRunningAndHistoricBatches();
  }

  @After
  public void resetClock() {
    ClockUtil.reset();
  }

  @Test
  public void testBatchQuery() {
    // given
    Batch batch1 = helper.migrateProcessInstancesAsync(1);
    Batch batch2 = helper.migrateProcessInstancesAsync(1);

    // when
    List<HistoricBatch> list = historyService.createHistoricBatchQuery().list();

    // then
    assertEquals(2, list.size());

    List<String> batchIds = new ArrayList<String>();
    for (HistoricBatch resultBatch : list) {
      batchIds.add(resultBatch.getId());
    }

    Assert.assertTrue(batchIds.contains(batch1.getId()));
    Assert.assertTrue(batchIds.contains(batch2.getId()));
  }

  @Test
  public void testBatchQueryResult() {
    Date startDate = new Date(10000L);
    Date endDate = new Date(40000L);

    // given
    ClockUtil.setCurrentTime(startDate);
    Batch batch = helper.migrateProcessInstancesAsync(1);
    helper.completeSeedJobs(batch);
    helper.executeJobs(batch);

    ClockUtil.setCurrentTime(endDate);
    helper.executeMonitorJob(batch);

    // when
    HistoricBatch resultBatch = historyService.createHistoricBatchQuery().singleResult();

    // then
    Assert.assertNotNull(resultBatch);

    assertEquals(batch.getId(), resultBatch.getId());
    assertEquals(batch.getBatchJobDefinitionId(), resultBatch.getBatchJobDefinitionId());
    assertEquals(batch.getMonitorJobDefinitionId(), resultBatch.getMonitorJobDefinitionId());
    assertEquals(batch.getSeedJobDefinitionId(), resultBatch.getSeedJobDefinitionId());
    assertEquals(batch.getTenantId(), resultBatch.getTenantId());
    assertEquals(batch.getType(), resultBatch.getType());
    assertEquals(batch.getBatchJobsPerSeed(), resultBatch.getBatchJobsPerSeed());
    assertEquals(batch.getInvocationsPerBatchJob(), resultBatch.getInvocationsPerBatchJob());
    assertEquals(batch.getTotalJobs(), resultBatch.getTotalJobs());
    assertEquals(startDate, resultBatch.getStartTime());
    assertEquals(endDate, resultBatch.getEndTime());
  }

  @Test
  public void testBatchQueryById() {
    // given
    Batch batch1 = helper.migrateProcessInstancesAsync(1);
    helper.migrateProcessInstancesAsync(1);

    // when
    HistoricBatch resultBatch = historyService.createHistoricBatchQuery().batchId(batch1.getId()).singleResult();

    // then
    Assert.assertNotNull(resultBatch);
    assertEquals(batch1.getId(), resultBatch.getId());
  }

  @Test
  public void testBatchQueryByIdNull() {
    try {
      historyService.createHistoricBatchQuery().batchId(null).singleResult();
      Assert.fail("exception expected");
    }
    catch (NullValueException e) {
      assertThat(e.getMessage()).contains("Batch id is null");
    }
  }

  @Test
  public void testBatchQueryByType() {
    // given
    Batch batch1 = helper.migrateProcessInstancesAsync(1);
    helper.migrateProcessInstancesAsync(1);

    // when
    long count = historyService.createHistoricBatchQuery().type(batch1.getType()).count();

    // then
    assertEquals(2, count);
  }

  @Test
  public void testBatchQueryByNonExistingType() {
    // given
    helper.migrateProcessInstancesAsync(1);

    // when
    long count = historyService.createHistoricBatchQuery().type("foo").count();

    // then
    assertEquals(0, count);
  }

  @Test
  public void testBatchByState() {
    // given
    Batch batch1 = helper.migrateProcessInstancesAsync(1);
    Batch batch2 = helper.migrateProcessInstancesAsync(1);

    helper.completeBatch(batch1);

    // when
    HistoricBatch historicBatch = historyService.createHistoricBatchQuery()
      .completed(true)
      .singleResult();

    // then
    assertEquals(batch1.getId(), historicBatch.getId());

    // when
    historicBatch = historyService.createHistoricBatchQuery()
      .completed(false)
      .singleResult();

    // then
    assertEquals(batch2.getId(), historicBatch.getId());
  }

  @Test
  public void testBatchQueryByTypeNull() {
    try {
      historyService.createHistoricBatchQuery().type(null).singleResult();
      Assert.fail("exception expected");
    }
    catch (NullValueException e) {
      assertThat(e.getMessage()).contains("Type is null");
    }
  }

  @Test
  public void testBatchQueryCount() {
    // given
    helper.migrateProcessInstancesAsync(1);
    helper.migrateProcessInstancesAsync(1);

    // when
    long count = historyService.createHistoricBatchQuery().count();

    // then
    assertEquals(2, count);
  }

  @Test
  public void testBatchQueryOrderByIdAsc() {
    // given
    helper.migrateProcessInstancesAsync(1);
    helper.migrateProcessInstancesAsync(1);

    // when
    List<HistoricBatch> orderedBatches = historyService.createHistoricBatchQuery().orderById().asc().list();

    // then
    verifySorting(orderedBatches, historicBatchById());
  }

  @Test
  public void testBatchQueryOrderByIdDec() {
    // given
    helper.migrateProcessInstancesAsync(1);
    helper.migrateProcessInstancesAsync(1);

    // when
    List<HistoricBatch> orderedBatches = historyService.createHistoricBatchQuery().orderById().desc().list();

    // then
    verifySorting(orderedBatches, inverted(historicBatchById()));
  }

  @Test
  public void testBatchQueryOrderByStartTimeAsc() {
    // given
    ClockTestUtil.setClockToDateWithoutMilliseconds();
    helper.migrateProcessInstancesAsync(1);
    ClockTestUtil.incrementClock(1000);
    helper.migrateProcessInstancesAsync(1);

    // when
    List<HistoricBatch> orderedBatches = historyService.createHistoricBatchQuery().orderByStartTime().asc().list();

    // then
    verifySorting(orderedBatches, historicBatchByStartTime());
  }

  @Test
  public void testBatchQueryOrderByStartTimeDec() {
    // given
    ClockTestUtil.setClockToDateWithoutMilliseconds();
    helper.migrateProcessInstancesAsync(1);
    ClockTestUtil.incrementClock(1000);
    helper.migrateProcessInstancesAsync(1);

    // when
    List<HistoricBatch> orderedBatches = historyService.createHistoricBatchQuery().orderByStartTime().desc().list();

    // then
    verifySorting(orderedBatches, inverted(historicBatchByStartTime()));
  }

  @Test
  public void testBatchQueryOrderByEndTimeAsc() {
    // given
    ClockTestUtil.setClockToDateWithoutMilliseconds();
    Batch batch1 = helper.migrateProcessInstancesAsync(1);
    helper.completeBatch(batch1);

    ClockTestUtil.incrementClock(1000);
    Batch batch2 = helper.migrateProcessInstancesAsync(1);
    helper.completeBatch(batch2);

    // when
    List<HistoricBatch> orderedBatches = historyService.createHistoricBatchQuery().orderByEndTime().asc().list();

    // then
    verifySorting(orderedBatches, historicBatchByEndTime());
  }

  @Test
  public void testBatchQueryOrderByEndTimeDec() {
    // given
    ClockTestUtil.setClockToDateWithoutMilliseconds();
    Batch batch1 = helper.migrateProcessInstancesAsync(1);
    helper.completeBatch(batch1);

    ClockTestUtil.incrementClock(1000);
    Batch batch2 = helper.migrateProcessInstancesAsync(1);
    helper.completeBatch(batch2);

    // when
    List<HistoricBatch> orderedBatches = historyService.createHistoricBatchQuery().orderByEndTime().desc().list();

    // then
    verifySorting(orderedBatches, inverted(historicBatchByEndTime()));
  }

  @Test
  public void testBatchQueryOrderingPropertyWithoutOrder() {
    try {
      historyService.createHistoricBatchQuery().orderById().singleResult();
      Assert.fail("exception expected");
    }
    catch (NotValidException e) {
      assertThat(e.getMessage()).contains("Invalid query: "
          + "call asc() or desc() after using orderByXX()");
    }
  }

  @Test
  public void testBatchQueryOrderWithoutOrderingProperty() {
    try {
      historyService.createHistoricBatchQuery().asc().singleResult();
      Assert.fail("exception expected");
    }
    catch (NotValidException e) {
      assertThat(e.getMessage()).contains("You should call any of the orderBy methods "
          + "first before specifying a direction");
    }
  }

  @Test
  @Deployment(resources = "io/orqueio/bpm/engine/test/api/oneTaskProcess.bpmn20.xml")
  public void testBatchQueryByTypeIn() {
    // given
    ProcessInstance processInstance1 = runtimeService.startProcessInstanceByKey("oneTaskProcess");
    ProcessInstance processInstance2 = runtimeService.startProcessInstanceByKey("oneTaskProcess");

    Batch migrationBatch = helper.migrateProcessInstancesAsync(1);
    Batch deletionBatch = runtimeService.deleteProcessInstancesAsync(
        Arrays.asList(processInstance1.getId()), "test");
    Batch suspensionBatch = runtimeService.updateProcessInstanceSuspensionState()
        .byProcessInstanceIds(Arrays.asList(processInstance2.getId()))
        .suspendAsync();

    // when - query for 2 types among 3
    List<HistoricBatch> result = historyService.createHistoricBatchQuery()
        .typeIn(Batch.TYPE_PROCESS_INSTANCE_DELETION, Batch.TYPE_PROCESS_INSTANCE_MIGRATION)
        .list();
    long count = historyService.createHistoricBatchQuery()
        .typeIn(Batch.TYPE_PROCESS_INSTANCE_DELETION, Batch.TYPE_PROCESS_INSTANCE_MIGRATION)
        .count();

    // then - exactly 2 batches returned
    assertEquals(2, result.size());
    assertEquals(2, count);

    List<String> resultIds = new ArrayList<String>();
    for (HistoricBatch batch : result) {
      resultIds.add(batch.getId());
    }
    Assert.assertTrue(resultIds.contains(migrationBatch.getId()));
    Assert.assertTrue(resultIds.contains(deletionBatch.getId()));
    Assert.assertFalse(resultIds.contains(suspensionBatch.getId()));
  }

  @Test
  @Deployment(resources = "io/orqueio/bpm/engine/test/api/oneTaskProcess.bpmn20.xml")
  public void testBatchQueryByTypeInSingleValue() {
    // given
    ProcessInstance processInstance = runtimeService.startProcessInstanceByKey("oneTaskProcess");

    Batch migrationBatch = helper.migrateProcessInstancesAsync(1);
    Batch deletionBatch = runtimeService.deleteProcessInstancesAsync(
        Arrays.asList(processInstance.getId()), "test");

    // when
    List<HistoricBatch> result = historyService.createHistoricBatchQuery()
        .typeIn(Batch.TYPE_PROCESS_INSTANCE_DELETION)
        .list();

    // then
    assertEquals(1, result.size());
    assertEquals(deletionBatch.getId(), result.get(0).getId());
  }

  @Test
  @Deployment(resources = "io/orqueio/bpm/engine/test/api/oneTaskProcess.bpmn20.xml")
  public void testBatchQueryByTypeInNonExisting() {
    // given
    helper.migrateProcessInstancesAsync(1);

    // when
    long count = historyService.createHistoricBatchQuery()
        .typeIn("non-existing-type-1", "non-existing-type-2")
        .count();

    // then
    assertEquals(0, count);
  }

  @Test
  @Deployment(resources = "io/orqueio/bpm/engine/test/api/oneTaskProcess.bpmn20.xml")
  public void testBatchQueryByTypeAndTypeIn() {
    // given
    ProcessInstance processInstance = runtimeService.startProcessInstanceByKey("oneTaskProcess");

    Batch migrationBatch = helper.migrateProcessInstancesAsync(1);
    Batch deletionBatch = runtimeService.deleteProcessInstancesAsync(
        Arrays.asList(processInstance.getId()), "test");

    // when - type and typeIn both specified
    long count = historyService.createHistoricBatchQuery()
        .type(Batch.TYPE_PROCESS_INSTANCE_MIGRATION)
        .typeIn(Batch.TYPE_PROCESS_INSTANCE_DELETION, Batch.TYPE_PROCESS_INSTANCE_MIGRATION)
        .count();

    // then - both conditions must match (AND semantics)
    assertEquals(1, count);
  }

  @Test
  public void testBatchQueryByTypeInNull() {
    try {
      historyService.createHistoricBatchQuery().typeIn((String[]) null).singleResult();
      Assert.fail("exception expected");
    }
    catch (NullValueException e) {
      assertThat(e.getMessage()).contains("types is null");
    }
  }

  @Test
  public void testBatchQueryByTypeInContainsNull() {
    try {
      historyService.createHistoricBatchQuery()
          .typeIn(Batch.TYPE_PROCESS_INSTANCE_MIGRATION, null)
          .singleResult();
      Assert.fail("exception expected");
    }
    catch (NullValueException e) {
      assertThat(e.getMessage()).contains("types contains null value");
    }
  }

  @Test
  @Deployment(resources = "io/orqueio/bpm/engine/test/api/oneTaskProcess.bpmn20.xml")
  public void testBatchQueryByTypeInListPage() {
    // given
    ProcessInstance processInstance1 = runtimeService.startProcessInstanceByKey("oneTaskProcess");
    ProcessInstance processInstance2 = runtimeService.startProcessInstanceByKey("oneTaskProcess");

    Batch migrationBatch = helper.migrateProcessInstancesAsync(1);
    Batch deletionBatch = runtimeService.deleteProcessInstancesAsync(
        Arrays.asList(processInstance1.getId()), "test");
    Batch suspensionBatch = runtimeService.updateProcessInstanceSuspensionState()
        .byProcessInstanceIds(Arrays.asList(processInstance2.getId()))
        .suspendAsync();

    // when - paginated query
    List<HistoricBatch> firstPage = historyService.createHistoricBatchQuery()
        .typeIn(Batch.TYPE_PROCESS_INSTANCE_DELETION, Batch.TYPE_PROCESS_INSTANCE_MIGRATION)
        .listPage(0, 1);
    List<HistoricBatch> secondPage = historyService.createHistoricBatchQuery()
        .typeIn(Batch.TYPE_PROCESS_INSTANCE_DELETION, Batch.TYPE_PROCESS_INSTANCE_MIGRATION)
        .listPage(1, 1);
    long totalCount = historyService.createHistoricBatchQuery()
        .typeIn(Batch.TYPE_PROCESS_INSTANCE_DELETION, Batch.TYPE_PROCESS_INSTANCE_MIGRATION)
        .count();

    // then
    assertEquals(1, firstPage.size());
    assertEquals(1, secondPage.size());
    assertEquals(2, totalCount);
    Assert.assertNotEquals(firstPage.get(0).getId(), secondPage.get(0).getId());
  }
}
