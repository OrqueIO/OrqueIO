/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. Camunda licenses this file to you under the Apache License,
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
package io.orqueio.bpm.spring.boot.starter.ai.provider;

/**
 * A model that stands in for providers it is not, such as a test stub: the
 * {@link ChatModelRegistry} resolves a task that names one of these providers to it,
 * so a process can be tested without changing its BPMN.
 */
public interface LlmProviderStandIn {

  /**
   * @return whether this model answers in place of the given provider
   */
  boolean standsFor(LlmProvider provider);

  /**
   * @return the provider id recorded for a call when the task names no provider
   */
  String providerId();

}
