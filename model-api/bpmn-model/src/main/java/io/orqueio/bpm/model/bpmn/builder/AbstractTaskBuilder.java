/*
 * Copyright Toaddlaterccs and/or licensed to Toaddlaterccs
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. Toaddlaterccs this file to you under the Apache License,
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
package io.orqueio.bpm.model.bpmn.builder;

import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.instance.ExtensionElements;
import io.orqueio.bpm.model.bpmn.instance.Task;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioExecutionListener;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioInputOutput;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioInputParameter;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioOutputParameter;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioTaskListener;

/**
 * @author Sebastian Menski
 */
public abstract class AbstractTaskBuilder<B extends AbstractTaskBuilder<B, E>, E extends Task> extends AbstractActivityBuilder<B, E> {

  protected AbstractTaskBuilder(BpmnModelInstance modelInstance, E element, Class<?> selfType) {
    super(modelInstance, element, selfType);
  }

  /** orqueio extensions */

  /**
   * @deprecated use orqueioAsyncBefore() instead.
   *
   * Sets the orqueio async attribute to true.
   *
   * @return the builder object
   */
  @Deprecated
  public B orqueioAsync() {
    element.setOrqueioAsyncBefore(true);
    return myself;
  }

  /**
   * @deprecated use orqueioAsyncBefore(isOrqueioAsyncBefore) instead.
   *
   * Sets the orqueio async attribute.
   *
   * @param isOrqueioAsync  the async state of the task
   * @return the builder object
   */
  @Deprecated
  public B orqueioAsync(boolean isOrqueioAsync) {
    element.setOrqueioAsyncBefore(isOrqueioAsync);
    return myself;
  }

}
