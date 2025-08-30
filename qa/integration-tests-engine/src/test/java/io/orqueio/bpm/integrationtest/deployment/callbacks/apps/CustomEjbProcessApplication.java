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
package io.orqueio.bpm.integrationtest.deployment.callbacks.apps;

import javax.ejb.ConcurrencyManagement;
import javax.ejb.ConcurrencyManagementType;
import javax.ejb.Local;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;

import io.orqueio.bpm.application.PostDeploy;
import io.orqueio.bpm.application.PreUndeploy;
import io.orqueio.bpm.application.ProcessApplication;
import io.orqueio.bpm.application.ProcessApplicationInterface;
import io.orqueio.bpm.engine.ProcessEngine;
import org.junit.Assert;

/**
 * Custom {@link io.orqueio.bpm.application.impl.EjbProcessApplication} with PA lifecycle callbacks
 *
 * @author Daniel Meyer
 *
 */
@Singleton
@Startup
@ConcurrencyManagement(ConcurrencyManagementType.BEAN)
@TransactionAttribute(TransactionAttributeType.REQUIRED)
@ProcessApplication
@Local(ProcessApplicationInterface.class)
// Using fully-qualified class name instead of import statement to allow for automatic Jakarta transformation
public class CustomEjbProcessApplication extends io.orqueio.bpm.application.impl.EjbProcessApplication {

  @PostDeploy
  public void postDeploy(ProcessEngine processEngine) {
    Assert.assertNotNull(processEngine);
  }

  @PreUndeploy
  public void preUnDeploy(ProcessEngine processEngine) {
    Assert.assertNotNull(processEngine);
  }

}
