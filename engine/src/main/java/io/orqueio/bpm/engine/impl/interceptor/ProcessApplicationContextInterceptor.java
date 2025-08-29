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
package io.orqueio.bpm.engine.impl.interceptor;

import java.util.concurrent.Callable;

import io.orqueio.bpm.application.ProcessApplicationReference;
import io.orqueio.bpm.application.impl.ProcessApplicationContextImpl;
import io.orqueio.bpm.application.impl.ProcessApplicationIdentifier;
import io.orqueio.bpm.container.RuntimeContainerDelegate;
import io.orqueio.bpm.engine.impl.ProcessEngineLogger;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.cmd.CommandLogger;
import io.orqueio.bpm.engine.impl.context.Context;

/**
 * @author Thorben Lindhauer
 *
 */
public class ProcessApplicationContextInterceptor extends CommandInterceptor {

  private final static CommandLogger LOG = ProcessEngineLogger.CMD_LOGGER;

  protected ProcessEngineConfigurationImpl processEngineConfiguration;

  public ProcessApplicationContextInterceptor(ProcessEngineConfigurationImpl processEngineConfiguration) {
    this.processEngineConfiguration = processEngineConfiguration;
  }

  @Override
  public <T> T execute(final Command<T> command) {
    ProcessApplicationIdentifier processApplicationIdentifier = ProcessApplicationContextImpl.get();

    if (processApplicationIdentifier != null) {
      // clear the identifier so this interceptor does not apply to nested commands
      ProcessApplicationContextImpl.clear();

      try {
        ProcessApplicationReference reference = getPaReference(processApplicationIdentifier);
        return Context.executeWithinProcessApplication(new Callable<T>() {

          @Override
          public T call() throws Exception {
            return next.execute(command);
          }
        },
        reference);

      }
      finally {
        // restore the identifier for subsequent commands
        ProcessApplicationContextImpl.set(processApplicationIdentifier);
      }
    }
    else {
      return next.execute(command);
    }
  }

  protected ProcessApplicationReference getPaReference(ProcessApplicationIdentifier processApplicationIdentifier) {
    if (processApplicationIdentifier.getReference() != null) {
      return processApplicationIdentifier.getReference();
    }
    else if (processApplicationIdentifier.getProcessApplication() != null) {
      return processApplicationIdentifier.getProcessApplication().getReference();
    }
    else if (processApplicationIdentifier.getName() != null) {
       RuntimeContainerDelegate runtimeContainerDelegate = RuntimeContainerDelegate.INSTANCE.get();
       ProcessApplicationReference reference = runtimeContainerDelegate.getDeployedProcessApplication(processApplicationIdentifier.getName());

       if (reference == null) {
         throw LOG.paWithNameNotRegistered(processApplicationIdentifier.getName());
       }
       else {
         return reference;
       }
    }
    else {
      throw LOG.cannotReolvePa(processApplicationIdentifier);
    }
  }

}
