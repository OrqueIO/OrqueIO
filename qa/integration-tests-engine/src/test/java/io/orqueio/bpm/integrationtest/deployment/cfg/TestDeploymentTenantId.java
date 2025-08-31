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
package io.orqueio.bpm.integrationtest.deployment.cfg;

import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.CoreMatchers.notNullValue;
import static org.junit.Assert.assertThat;

import io.orqueio.bpm.integrationtest.util.AbstractFoxPlatformIntegrationTest;
import io.orqueio.bpm.integrationtest.util.DeploymentHelper;
import org.jboss.arquillian.container.test.api.Deployment;
import org.jboss.arquillian.junit.Arquillian;
import org.jboss.shrinkwrap.api.ShrinkWrap;
import org.jboss.shrinkwrap.api.spec.WebArchive;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(Arquillian.class)
public class TestDeploymentTenantId extends AbstractFoxPlatformIntegrationTest {

  @Deployment
  public static WebArchive processArchive() {
    return ShrinkWrap.create(WebArchive.class, "test.war")
        .addAsWebInfResource("io/orqueio/bpm/integrationtest/beans.xml", "beans.xml")
        .addAsLibraries(DeploymentHelper.getEngineCdi())
        .addAsResource("io/orqueio/bpm/integrationtest/deployment/cfg/processes-with-tenant-id.xml", "META-INF/processes.xml")
        .addAsResource("io/orqueio/bpm/integrationtest/deployment/cfg/invoice-it.bpmn20.xml")
        .addClass(AbstractFoxPlatformIntegrationTest.class)
        .addClass(DummyProcessApplication.class);
  }

  @Test
  public void testDeployProcessArchiveWithTenantId() {
    assertThat(processEngine, is(notNullValue()));

    io.orqueio.bpm.engine.repository.Deployment deployment = processEngine
        .getRepositoryService()
        .createDeploymentQuery()
        .singleResult();

    assertThat(deployment, is(notNullValue()));
    assertThat(deployment.getTenantId(), is("tenant1"));
  }

}
