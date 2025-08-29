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
package io.orqueio.bpm.engine.impl.cmd;

import static io.orqueio.bpm.engine.impl.util.EnsureUtil.ensureNotNull;
import static io.orqueio.bpm.engine.impl.util.EnsureUtil.ensureWhitelistedResourceId;

import java.io.Serializable;

import io.orqueio.bpm.engine.identity.Tenant;
import io.orqueio.bpm.engine.impl.identity.IdentityOperationResult;
import io.orqueio.bpm.engine.impl.interceptor.Command;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;

public class SaveTenantCmd extends AbstractWritableIdentityServiceCmd<Void> implements Command<Void>, Serializable {

  private static final long serialVersionUID = 1L;
  protected Tenant tenant;

  public SaveTenantCmd(Tenant tenant) {
    this.tenant = tenant;
  }

  @Override
  protected Void executeCmd(CommandContext commandContext) {
    ensureNotNull("tenant", tenant);
    ensureWhitelistedResourceId(commandContext, "Tenant", tenant.getId());

    IdentityOperationResult operationResult = commandContext
      .getWritableIdentityProvider()
      .saveTenant(tenant);

    commandContext.getOperationLogManager().logTenantOperation(operationResult, tenant.getId());

    return null;
  }

}
