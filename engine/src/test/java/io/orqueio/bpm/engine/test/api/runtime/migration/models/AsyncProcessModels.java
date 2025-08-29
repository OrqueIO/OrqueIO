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
package io.orqueio.bpm.engine.test.api.runtime.migration.models;

import static io.orqueio.bpm.engine.test.api.runtime.migration.ModifiableBpmnModelInstance.modify;

import io.orqueio.bpm.model.bpmn.BpmnModelInstance;

/**
 * @author Thorben Lindhauer
 *
 */
public class AsyncProcessModels {

  public static final BpmnModelInstance ASYNC_BEFORE_USER_TASK_PROCESS =
    modify(ProcessModels.ONE_TASK_PROCESS)
      .activityBuilder("userTask")
      .orqueioAsyncBefore()
    .done();

  public static final BpmnModelInstance ASYNC_BEFORE_SUBPROCESS_USER_TASK_PROCESS =
    modify(ProcessModels.SUBPROCESS_PROCESS)
      .activityBuilder("userTask")
      .orqueioAsyncBefore()
    .done();

  public static final BpmnModelInstance ASYNC_BEFORE_START_EVENT_PROCESS =
    modify(ProcessModels.ONE_TASK_PROCESS)
      .flowNodeBuilder("startEvent")
      .orqueioAsyncBefore()
    .done();

  public static final BpmnModelInstance ASYNC_BEFORE_SUBPROCESS_START_EVENT_PROCESS =
    modify(ProcessModels.SUBPROCESS_PROCESS)
      .flowNodeBuilder("subProcessStart")
      .orqueioAsyncBefore()
    .done();

  public static final BpmnModelInstance ASYNC_AFTER_USER_TASK_PROCESS =
    modify(ProcessModels.TWO_TASKS_PROCESS)
      .activityBuilder("userTask1")
      .orqueioAsyncAfter()
    .done();

  public static final BpmnModelInstance ASYNC_AFTER_SUBPROCESS_USER_TASK_PROCESS =
    ProcessModels.newModel()
    .startEvent()
      .subProcess("subProcess")
        .embeddedSubProcess()
        .startEvent()
        .userTask("userTask1")
        .orqueioAsyncAfter()
      .subProcessDone()
    .userTask("userTask2")
    .endEvent()
    .done();

}
