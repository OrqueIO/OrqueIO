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
package io.orqueio.bpm.engine.rest.hal.tenant;

import javax.ws.rs.core.UriBuilder;

import io.orqueio.bpm.engine.identity.Tenant;
import io.orqueio.bpm.engine.rest.TenantRestService;
import io.orqueio.bpm.engine.rest.hal.HalIdResource;
import io.orqueio.bpm.engine.rest.hal.HalRelation;
import io.orqueio.bpm.engine.rest.hal.HalResource;

public class HalTenant extends HalResource<HalTenant> implements HalIdResource {

  public final static HalRelation REL_SELF =
    HalRelation.build("self", TenantRestService.class, UriBuilder.fromPath(TenantRestService.PATH).path("{id}"));

  protected String id;
  protected String name;

  public static HalTenant fromTenant(Tenant tenant) {
    HalTenant halTenant = new HalTenant();

    halTenant.id = tenant.getId();
    halTenant.name = tenant.getName();

    halTenant.linker.createLink(REL_SELF, tenant.getId());

    return halTenant;
  }

  public String getId() {
    return id;
  }

  public String getName() {
    return name;
  }

}
