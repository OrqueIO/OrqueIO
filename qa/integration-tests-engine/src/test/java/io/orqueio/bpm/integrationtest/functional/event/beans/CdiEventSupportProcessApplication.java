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
package io.orqueio.bpm.integrationtest.functional.event.beans;

import io.orqueio.bpm.application.ProcessApplication;
import io.orqueio.bpm.engine.cdi.impl.event.CdiEventListener;
import io.orqueio.bpm.engine.delegate.ExecutionListener;
import io.orqueio.bpm.engine.delegate.TaskListener;

/**
 * @author Daniel Meyer
 *
 */
@ProcessApplication
// Using fully-qualified class name instead of import statement to allow for automatic Jakarta transformation
public class CdiEventSupportProcessApplication extends io.orqueio.bpm.application.impl.ServletProcessApplication {

  public static final String LISTENER_INVOCATION_COUNT = "listenerInvocationCount";

  public ExecutionListener getExecutionListener() {
    return new CdiEventListener();
  }

  public TaskListener getTaskListener() {
    return new CdiEventListener();
  }
}
