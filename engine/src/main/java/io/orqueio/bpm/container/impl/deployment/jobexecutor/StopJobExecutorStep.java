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
package io.orqueio.bpm.container.impl.deployment.jobexecutor;

import java.util.Set;
import io.orqueio.bpm.container.impl.ContainerIntegrationLogger;
import io.orqueio.bpm.container.impl.spi.PlatformServiceContainer;
import io.orqueio.bpm.container.impl.spi.DeploymentOperation;
import io.orqueio.bpm.container.impl.spi.DeploymentOperationStep;
import io.orqueio.bpm.container.impl.spi.ServiceTypes;
import io.orqueio.bpm.engine.impl.ProcessEngineLogger;

/**
 * <p>Deployment operation step responsible for stopping all job acquisitions</p>
 *
 * @author Daniel Meyer
 *
 */
public class StopJobExecutorStep extends DeploymentOperationStep {

  protected final static ContainerIntegrationLogger LOG = ProcessEngineLogger.CONTAINER_INTEGRATION_LOGGER;

  public String getName() {
    return "Stop managed job acquisitions";
  }

  public void performOperationStep(DeploymentOperation operationContext) {

    final PlatformServiceContainer serviceContainer = operationContext.getServiceContainer();

    Set<String> jobExecutorServiceNames = serviceContainer.getServiceNames(ServiceTypes.JOB_EXECUTOR);

    for (String serviceName : jobExecutorServiceNames) {
      try {
        serviceContainer.stopService(serviceName);
      }
      catch(Exception e) {
        LOG.exceptionWhileStopping("Job Executor Service", serviceName, e);
      }
    }

  }

}
