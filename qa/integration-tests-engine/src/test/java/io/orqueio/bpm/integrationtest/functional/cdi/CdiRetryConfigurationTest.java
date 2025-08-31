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
package io.orqueio.bpm.integrationtest.functional.cdi;

import io.orqueio.bpm.engine.runtime.Job;
import io.orqueio.bpm.engine.runtime.JobQuery;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.integrationtest.functional.cdi.beans.DependentScopedBean;
import io.orqueio.bpm.integrationtest.functional.cdi.beans.ErrorDelegate;
import io.orqueio.bpm.integrationtest.functional.cdi.beans.RetryConfig;
import io.orqueio.bpm.integrationtest.util.AbstractFoxPlatformIntegrationTest;
import io.orqueio.bpm.integrationtest.util.DeploymentHelper;
import io.orqueio.bpm.integrationtest.util.TestContainer;
import org.jboss.arquillian.container.test.api.Deployment;
import org.jboss.arquillian.container.test.api.OperateOnDeployment;
import org.jboss.arquillian.junit.Arquillian;
import org.jboss.shrinkwrap.api.ShrinkWrap;
import org.jboss.shrinkwrap.api.spec.WebArchive;
import org.junit.Assert;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(Arquillian.class)
public class CdiRetryConfigurationTest extends AbstractFoxPlatformIntegrationTest {

  @Deployment
  public static WebArchive createProcessArchiveDeployment() {
    return initWebArchiveDeployment()
      .addClass(ErrorDelegate.class)
      .addClass(RetryConfig.class)
      .addAsResource("io/orqueio/bpm/integrationtest/functional/RetryConfigurationTest.testResolveRetryConfigBean.bpmn20.xml");
  }

  @Deployment(name="clientDeployment")
  public static WebArchive clientDeployment() {
    WebArchive deployment = ShrinkWrap.create(WebArchive.class, "client.war")
            .addAsWebInfResource("io/orqueio/bpm/integrationtest/beans.xml", "beans.xml")
            .addClass(AbstractFoxPlatformIntegrationTest.class)
            .addClass(DependentScopedBean.class)
            .addAsLibraries(DeploymentHelper.getEngineCdi());

    TestContainer.addContainerSpecificResourcesForNonPaEmbedCdiLib(deployment);

    return deployment;
  }

  @Test
  @OperateOnDeployment("clientDeployment")
  public void testResolveBean() {
    // given
    ProcessInstance processInstance = runtimeService.startProcessInstanceByKey("testRetry");

    JobQuery query = managementService
        .createJobQuery()
        .processInstanceId(processInstance.getId());

    Job job = query.singleResult();

    // when job fails
     try {
       managementService.executeJob(job.getId());
     } catch (Exception e) {
       // ignore
     }

     // then
     job = query.singleResult();
     Assert.assertEquals(6, job.getRetries());
  }
}
