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
package io.orqueio.bpm.engine.impl.bpmn.listener;

import static io.orqueio.bpm.engine.impl.util.ClassDelegateUtil.instantiateDelegate;

import java.util.List;

import io.orqueio.bpm.engine.delegate.DelegateExecution;
import io.orqueio.bpm.engine.delegate.ExecutionListener;
import io.orqueio.bpm.engine.delegate.JavaDelegate;
import io.orqueio.bpm.engine.impl.ProcessEngineLogger;
import io.orqueio.bpm.engine.impl.bpmn.behavior.BpmnBehaviorLogger;
import io.orqueio.bpm.engine.impl.bpmn.behavior.ServiceTaskJavaDelegateActivityBehavior;
import io.orqueio.bpm.engine.impl.bpmn.delegate.ExecutionListenerInvocation;
import io.orqueio.bpm.engine.impl.bpmn.parser.FieldDeclaration;
import io.orqueio.bpm.engine.impl.context.Context;
import io.orqueio.bpm.engine.impl.delegate.ClassDelegate;

/**
 * @author Roman Smirnov
 *
 */
public class ClassDelegateExecutionListener extends ClassDelegate implements ExecutionListener {

  protected static final BpmnBehaviorLogger LOG = ProcessEngineLogger.BPMN_BEHAVIOR_LOGGER;

  public ClassDelegateExecutionListener(String className, List<FieldDeclaration> fieldDeclarations) {
    super(className, fieldDeclarations);
  }

  public ClassDelegateExecutionListener(Class<?> clazz, List<FieldDeclaration> fieldDeclarations) {
    super(clazz, fieldDeclarations);
  }

  // Execution listener
  public void notify(DelegateExecution execution) throws Exception {
    ExecutionListener executionListenerInstance = getExecutionListenerInstance();

    Context.getProcessEngineConfiguration()
      .getDelegateInterceptor()
      .handleInvocation(new ExecutionListenerInvocation(executionListenerInstance, execution));
  }

  protected ExecutionListener getExecutionListenerInstance() {
    Object delegateInstance = instantiateDelegate(className, fieldDeclarations);
    if (delegateInstance instanceof ExecutionListener) {
      return (ExecutionListener) delegateInstance;

    } else if (delegateInstance instanceof JavaDelegate) {
      return new ServiceTaskJavaDelegateActivityBehavior((JavaDelegate) delegateInstance);

    } else {
      throw LOG.missingDelegateParentClassException(delegateInstance.getClass().getName(),
        ExecutionListener.class.getName(), JavaDelegate.class.getName());
    }
  }

}
