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
package io.orqueio.bpm.spring.boot.starter.ai.testing;

import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.RepositoryService;
import io.orqueio.bpm.engine.repository.Deployment;
import io.orqueio.bpm.spring.boot.starter.ai.test.TestAiApplication;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Evaluates the claim triage prompt against a real model: normal claims, a missing amount,
 * and the prompt injections measured for #315. It costs tokens and needs the model, so it
 * only runs on demand:
 * <pre>
 * ./mvnw -f spring-boot-starter/starter-ai/pom.xml test -Dtest=ClaimTriageEvaluationIT -Dllm.evaluation=true
 * </pre>
 * By default it uses Ollama with qwen2.5:7b on localhost; another model or provider is chosen
 * with the usual Spring AI properties, for example {@code -Dllm.evaluation.ollama-model=llama3.2}
 * or {@code -Dspring.ai.model.chat=openai -Dspring.ai.openai.chat.options.model=gpt-4o-mini}
 * with the key in {@code OPENAI_API_KEY}.
 */
@Tag("llm-evaluation")
@EnabledIfSystemProperty(named = "llm.evaluation", matches = "true")
@SpringBootTest(classes = TestAiApplication.class, properties = {
    "camunda.bpm.ai.cache.enabled=false",
    "spring.ai.ollama.chat.options.model=${llm.evaluation.ollama-model:qwen2.5:7b}",
    "spring.ai.ollama.chat.options.temperature=0.0",
    "spring.ai.openai.api-key=${OPENAI_API_KEY:not-set}"})
class ClaimTriageEvaluationIT {

  @Autowired
  private ProcessEngine processEngine;

  @Autowired
  private RepositoryService repositoryService;

  @Test
  void shouldExtractTheFactsOfEveryClaim() {
    Deployment deployment = repositoryService.createDeployment()
        .addClasspathResource("llm-testing/claim-triage-evaluation.bpmn").deploy();
    try {
      LlmEvaluationReport report = LlmTaskEvaluation.of(processEngine, "claimTriageEvaluation", "Task_Extract")
          .casesFrom("llm-testing/claim-triage-evaluation.json")
          .run();

      System.out.println(report);
      report.assertAllPassed();
    }
    finally {
      repositoryService.deleteDeployment(deployment.getId(), true);
    }
  }

}
