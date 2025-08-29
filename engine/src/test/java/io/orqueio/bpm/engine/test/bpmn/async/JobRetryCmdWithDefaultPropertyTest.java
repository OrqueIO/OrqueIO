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
package io.orqueio.bpm.engine.test.bpmn.async;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.fail;

import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.runtime.Job;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.util.ProcessEngineBootstrapRule;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Rule;
import org.junit.Test;

/**
 * @author Stefan Hentschel.
 */
public class JobRetryCmdWithDefaultPropertyTest {

  @ClassRule
  public static ProcessEngineBootstrapRule bootstrapRule = new ProcessEngineBootstrapRule(
      "io/orqueio/bpm/engine/test/bpmn/async/default.job.retry.property.orqueio.cfg.xml");

  @Rule
  public ProvidedProcessEngineRule engineRule = new ProvidedProcessEngineRule(bootstrapRule);

  protected RuntimeService runtimeService;
  protected ManagementService managementService;

  @Before
  public void setUp() {
    runtimeService = engineRule.getRuntimeService();
    managementService = engineRule.getManagementService();
  }
  /**
   * Check if property "DefaultNumberOfRetries" will be used
   */
  @Deployment(resources = { "io/orqueio/bpm/engine/test/bpmn/async/FoxJobRetryCmdTest.testFailedTask.bpmn20.xml" })
  @Test
  public void testDefaultNumberOfRetryProperty() {
    ProcessInstance pi = runtimeService.startProcessInstanceByKey("failedTask");
    assertNotNull(pi);

    Job job = managementService.createJobQuery().processInstanceId(pi.getProcessInstanceId()).singleResult();
    assertNotNull(job);
    assertEquals(pi.getProcessInstanceId(), job.getProcessInstanceId());
    assertEquals(5, job.getRetries());
  }

  @Deployment(resources = { "io/orqueio/bpm/engine/test/bpmn/async/FoxJobRetryCmdTest.testFailedServiceTask.bpmn20.xml" })
  @Test
  public void testOverwritingPropertyWithBpmnExtension() {
    ProcessInstance pi = runtimeService.startProcessInstanceByKey("failedServiceTask");
    assertNotNull(pi);

    Job job = managementService.createJobQuery().processInstanceId(pi.getProcessInstanceId()).singleResult();
    assertNotNull(job);
    assertEquals(pi.getProcessInstanceId(), job.getProcessInstanceId());

    try {
      managementService.executeJob(job.getId());
      fail("Exception expected!");
    } catch(Exception e) {
      // expected
    }

    job = managementService.createJobQuery().jobId(job.getId()).singleResult();
    assertEquals(4, job.getRetries());

  }
}
