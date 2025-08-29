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
package io.orqueio.bpm.engine.test.history;

import java.util.Arrays;

import io.orqueio.bpm.engine.ExternalTaskService;
import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.ProcessEngineConfiguration;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.externaltask.ExternalTask;
import io.orqueio.bpm.engine.impl.interceptor.Session;
import io.orqueio.bpm.engine.impl.interceptor.SessionFactory;
import io.orqueio.bpm.engine.impl.persistence.entity.HistoricJobLogManager;
import io.orqueio.bpm.engine.runtime.Job;
import io.orqueio.bpm.engine.test.RequiredHistoryLevel;
import io.orqueio.bpm.engine.test.util.ProcessEngineBootstrapRule;
import io.orqueio.bpm.engine.test.util.ProcessEngineTestRule;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import io.orqueio.bpm.model.bpmn.Bpmn;
import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import org.junit.ClassRule;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;
import org.mockito.Mockito;

@RequiredHistoryLevel(ProcessEngineConfiguration.HISTORY_AUDIT)
public class HistoricIncidentAuditTest {

  private static SessionFactory sessionFactory = Mockito.spy(new MockSessionFactory());

  public static class MockSessionFactory implements SessionFactory {

    @Override
    public Class<?> getSessionType() {
      return HistoricJobLogManager.class;
    }

    @Override
    public Session openSession() {
      return new HistoricJobLogManager();
    }
  }

  @ClassRule
  public static ProcessEngineBootstrapRule bootstrapRule = new ProcessEngineBootstrapRule(configuration -> {

    configuration.setCustomSessionFactories(Arrays.asList(sessionFactory));
  });

  protected ProvidedProcessEngineRule engineRule = new ProvidedProcessEngineRule(bootstrapRule);
  public ProcessEngineTestRule testRule = new ProcessEngineTestRule(engineRule);

  @Rule
  public RuleChain ruleChain = RuleChain.outerRule(engineRule).around(testRule);

  @Test
  public void shouldNotQueryForHistoricJobLogWhenSettingJobToZeroRetries() {
    // given
    BpmnModelInstance modelInstance = Bpmn.createExecutableProcess("process")
    .startEvent().orqueioAsyncAfter().endEvent().done();

    testRule.deploy(modelInstance);

    RuntimeService runtimeService = engineRule.getRuntimeService();
    runtimeService.startProcessInstanceByKey("process");

    ManagementService managementService = engineRule.getManagementService();
    Job job = managementService.createJobQuery().singleResult();

    Mockito.reset(sessionFactory);

    // when
    managementService.setJobRetries(job.getId(), 0);


    // then
    Mockito.verify(sessionFactory, Mockito.never()).openSession();
  }


  @Test
  public void shouldNotQueryForHistoricJobLogWhenSettingExternalTaskToZeroRetries() {
    // given
    BpmnModelInstance modelInstance = Bpmn.createExecutableProcess("process")
    .startEvent().serviceTask().orqueioExternalTask("topic").endEvent().done();

    testRule.deploy(modelInstance);

    RuntimeService runtimeService = engineRule.getRuntimeService();
    runtimeService.startProcessInstanceByKey("process");

    ExternalTaskService externalTaskService = engineRule.getExternalTaskService();
    ExternalTask externalTask = externalTaskService.createExternalTaskQuery().singleResult();

    Mockito.reset(sessionFactory);

    // when
    externalTaskService.setRetries(externalTask.getId(), 0);

    // then
    Mockito.verify(sessionFactory, Mockito.never()).openSession();
  }
}
