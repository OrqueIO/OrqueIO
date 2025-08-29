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
package io.orqueio.bpm.engine.impl.bpmn.behavior;

import io.orqueio.bpm.engine.delegate.DelegateExecution;
import io.orqueio.bpm.engine.delegate.ExecutionListener;
import io.orqueio.bpm.engine.delegate.JavaDelegate;
import io.orqueio.bpm.engine.impl.bpmn.delegate.JavaDelegateInvocation;
import io.orqueio.bpm.engine.impl.context.Context;
import io.orqueio.bpm.engine.impl.pvm.delegate.ActivityBehavior;
import io.orqueio.bpm.engine.impl.pvm.delegate.ActivityExecution;


/**
 * @author Tom Baeyens
 */
public class ServiceTaskJavaDelegateActivityBehavior extends TaskActivityBehavior implements ActivityBehavior, ExecutionListener {

  protected JavaDelegate javaDelegate;

  protected ServiceTaskJavaDelegateActivityBehavior() {
  }

  public ServiceTaskJavaDelegateActivityBehavior(JavaDelegate javaDelegate) {
    this.javaDelegate = javaDelegate;
  }

  @Override
  public void performExecution(ActivityExecution execution) throws Exception {
    execute((DelegateExecution) execution);
    leave(execution);
  }

  public void notify(DelegateExecution execution) throws Exception {
    execute(execution);
  }

  public void execute(DelegateExecution execution) throws Exception {
    Context.getProcessEngineConfiguration()
      .getDelegateInterceptor()
      .handleInvocation(new JavaDelegateInvocation(javaDelegate, execution));
  }
}
