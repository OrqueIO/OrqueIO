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
package io.orqueio.bpm.container.impl.deployment;

import java.util.List;
import io.orqueio.bpm.application.AbstractProcessApplication;
import io.orqueio.bpm.application.impl.metadata.spi.ProcessesXml;
import io.orqueio.bpm.container.impl.ContainerIntegrationLogger;
import io.orqueio.bpm.container.impl.jmx.services.JmxManagedProcessApplication;
import io.orqueio.bpm.container.impl.metadata.spi.ProcessEngineXml;
import io.orqueio.bpm.container.impl.spi.DeploymentOperation;
import io.orqueio.bpm.container.impl.spi.DeploymentOperationStep;
import io.orqueio.bpm.container.impl.spi.PlatformServiceContainer;
import io.orqueio.bpm.container.impl.spi.ServiceTypes;
import io.orqueio.bpm.engine.impl.ProcessEngineLogger;

import static io.orqueio.bpm.engine.impl.util.EnsureUtil.ensureNotNull;

/**
 * <p>Deployment operation responsible for stopping all process engines started by the deployment.</p>
 *
 * @author Daniel Meyer
 *
 */
public class ProcessesXmlStopProcessEnginesStep extends DeploymentOperationStep {

  private final static ContainerIntegrationLogger LOG = ProcessEngineLogger.CONTAINER_INTEGRATION_LOGGER;

  public String getName() {
    return "Stopping process engines";
  }

  public void performOperationStep(DeploymentOperation operationContext) {

    final PlatformServiceContainer serviceContainer = operationContext.getServiceContainer();
    final AbstractProcessApplication processApplication = operationContext.getAttachment(Attachments.PROCESS_APPLICATION);
    final JmxManagedProcessApplication deployedProcessApplication = serviceContainer.getService(ServiceTypes.PROCESS_APPLICATION, processApplication.getName());

    ensureNotNull("Cannot find process application with name " + processApplication.getName(), "deployedProcessApplication", deployedProcessApplication);

    List<ProcessesXml> processesXmls = deployedProcessApplication.getProcessesXmls();
    for (ProcessesXml processesXml : processesXmls) {
      stopProcessEngines(processesXml.getProcessEngines(), operationContext);
    }

  }

  protected void stopProcessEngines(List<ProcessEngineXml> processEngine, DeploymentOperation operationContext) {
    for (ProcessEngineXml parsedProcessEngine : processEngine) {
      stopProcessEngine(parsedProcessEngine.getName(), operationContext);
    }
  }

  protected void stopProcessEngine(String processEngineName, DeploymentOperation operationContext) {

    final PlatformServiceContainer serviceContainer = operationContext.getServiceContainer();
    try {
      serviceContainer.stopService(ServiceTypes.PROCESS_ENGINE, processEngineName);
    }
    catch(Exception e) {
      LOG.exceptionWhileStopping("Process Engine", processEngineName, e);
    }

  }

}
