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
package io.orqueio.bpm.engine.rest.hal.identitylink;

import javax.ws.rs.core.UriBuilder;

import io.orqueio.bpm.engine.rest.GroupRestService;
import io.orqueio.bpm.engine.rest.TaskRestService;
import io.orqueio.bpm.engine.rest.UserRestService;
import io.orqueio.bpm.engine.rest.hal.HalRelation;
import io.orqueio.bpm.engine.rest.hal.HalResource;
import io.orqueio.bpm.engine.task.IdentityLink;

public class HalIdentityLink extends HalResource<HalIdentityLink> {

  public final static HalRelation REL_GROUP = HalRelation.build("group", GroupRestService.class, UriBuilder.fromPath(GroupRestService.PATH).path("{id}"));
  public final static HalRelation REL_USER = HalRelation.build("user", UserRestService.class, UriBuilder.fromPath(UserRestService.PATH).path("{id}"));
  public final static HalRelation REL_TASK = HalRelation.build("task", TaskRestService.class, UriBuilder.fromPath(TaskRestService.PATH).path("{id}"));

  protected String type;
  protected String userId;
  protected String groupId;
  protected String taskId;

  public static HalIdentityLink fromIdentityLink(IdentityLink identityLink) {
    HalIdentityLink halIdentityLink = new HalIdentityLink();

    halIdentityLink.type = identityLink.getType();
    halIdentityLink.userId = identityLink.getUserId();
    halIdentityLink.groupId = identityLink.getGroupId();
    halIdentityLink.taskId = identityLink.getTaskId();

    halIdentityLink.linker.createLink(REL_USER, identityLink.getUserId());
    halIdentityLink.linker.createLink(REL_GROUP, identityLink.getGroupId());
    halIdentityLink.linker.createLink(REL_TASK, identityLink.getTaskId());

    return halIdentityLink;
  }

  public String getType() {
    return type;
  }

  public String getUserId() {
    return userId;
  }

  public String getGroupId() {
    return groupId;
  }

  public String getTaskId() {
    return taskId;
  }

}
