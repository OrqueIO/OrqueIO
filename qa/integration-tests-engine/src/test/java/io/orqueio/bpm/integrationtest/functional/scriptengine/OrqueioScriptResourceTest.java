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
package io.orqueio.bpm.integrationtest.functional.scriptengine;

import io.orqueio.bpm.engine.history.HistoricVariableInstance;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.integrationtest.util.AbstractFoxPlatformIntegrationTest;
import org.jboss.arquillian.container.test.api.Deployment;
import org.jboss.arquillian.junit.Arquillian;
import org.jboss.shrinkwrap.api.spec.WebArchive;
import org.junit.Test;
import org.junit.runner.RunWith;

import static org.junit.Assert.*;

/**
 * @author Daniel Meyer
 *
 */
@RunWith(Arquillian.class)
public class OrqueioScriptResourceTest extends AbstractFoxPlatformIntegrationTest {

  @Deployment
  public static WebArchive processArchive() {

    return initWebArchiveDeployment()
      .addAsResource("io/orqueio/bpm/integrationtest/functional/scriptengine/OrqueioScriptResourceTest.examplescript.js", "OrqueioScriptResourceTest.examplescript.js")
      .addAsResource("io/orqueio/bpm/integrationtest/functional/scriptengine/OrqueioScriptResourceTest.exampleprocess.bpmn", "OrqueioScriptResourceTest.exampleprocess.bpmn");
  }

  @Test
  public void testDeployProcessArchive() {

    // the process can successfully be executed
    ProcessInstance pi = runtimeService.startProcessInstanceByKey("testProcess");

    HistoricVariableInstance variable = historyService.createHistoricVariableInstanceQuery()
      .processInstanceId(pi.getId())
      .singleResult();

    assertNotNull(variable);
    assertEquals("executed", variable.getName());
    assertEquals(true, variable.getValue());
  }

}
