/*
 * Copyright OrqueIO contributors
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
package io.orqueio.bpm.quarkus.engine.test.el;

import static org.assertj.core.api.Assertions.assertThat;

import io.quarkus.test.QuarkusUnitTest;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.quarkus.engine.test.helper.ProcessEngineAwareExtension;
import jakarta.inject.Inject;
import org.jboss.shrinkwrap.api.ShrinkWrap;
import org.jboss.shrinkwrap.api.spec.JavaArchive;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;

/**
 * Verifies that a BPMN {@code camunda:expression} which invokes a method on a
 * {@code @Named} CDI bean resolves under Quarkus ArC.
 *
 * <p>Before the {@code CdiResolver} fix this failed with
 * {@code UnsupportedOperationException} from {@code BeanManagerImpl.getELResolver()},
 * because ArC (CDI Lite) does not implement that optional method.</p>
 */
public class CdiExpressionResolutionTest {

  @RegisterExtension
  static final QuarkusUnitTest unitTest = new ProcessEngineAwareExtension()
      .setArchiveProducer(() -> ShrinkWrap.create(JavaArchive.class)
          .addClass(GreetingBean.class));

  @Inject
  ProcessEngine processEngine;

  @Test
  @Deployment(resources = "io/orqueio/bpm/quarkus/engine/test/el/cdi-expression-process.bpmn20.xml")
  public void shouldInvokeCdiBeanMethodFromExpression() {
    // given a process whose service task is camunda:expression="${greetingBean.greet(execution)}"
    RuntimeService runtimeService = processEngine.getRuntimeService();

    // when the process is started (the service task runs synchronously)
    ProcessInstance processInstance = runtimeService.startProcessInstanceByKey("cdiExpressionProcess");

    // then the CDI bean method was invoked and set the variable
    assertThat(runtimeService.getVariable(processInstance.getId(), "greeting"))
        .isEqualTo("Hello from CDI");
  }
}
