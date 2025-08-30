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
package io.orqueio.bpm.integrationtest.service;

import org.junit.Assert;

import io.orqueio.bpm.BpmPlatform;
import io.orqueio.bpm.ProcessEngineService;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.integrationtest.util.AbstractFoxPlatformIntegrationTest;
import org.jboss.arquillian.container.test.api.Deployment;
import org.jboss.arquillian.container.test.api.OperateOnDeployment;
import org.jboss.arquillian.junit.Arquillian;
import org.jboss.shrinkwrap.api.spec.WebArchive;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * @author Thorben Lindhauer
 */
@RunWith(Arquillian.class)
public class ProcessEngineServiceTest extends AbstractFoxPlatformIntegrationTest {

  @Deployment(name="test1")
  public static WebArchive app1() {    
    return initWebArchiveDeployment("test1.war");
  }
  
  @Test
  @OperateOnDeployment("test1")
  public void testNonExistingEngineRetrieval() {
    
    ProcessEngineService engineService = BpmPlatform.getProcessEngineService();
    ProcessEngine engine = engineService.getProcessEngine("aNonExistingEngineName");
    Assert.assertNull(engine);
  }
}
