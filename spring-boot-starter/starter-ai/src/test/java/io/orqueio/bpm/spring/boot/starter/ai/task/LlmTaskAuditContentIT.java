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
package io.orqueio.bpm.spring.boot.starter.ai.task;

import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskDeploymentIT.process;
import static io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskDeploymentIT.property;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.RepositoryService;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.repository.Deployment;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.spring.boot.starter.ai.test.TestAiApplication;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * With the prompt and answer recorded, a long dossier still completes: the record is
 * shortened to fit the engine's string column instead of failing the job.
 */
@SpringBootTest(classes = {TestAiApplication.class, LlmTaskAuditIT.StubModelConfiguration.class},
    properties = {"spring.ai.model.chat=none", "camunda.bpm.ai.audit.include-content=true"})
class LlmTaskAuditContentIT {

  @Autowired
  private RepositoryService repositoryService;

  @Autowired
  private RuntimeService runtimeService;

  @Autowired
  private ManagementService managementService;

  @Autowired
  private LlmTaskAuditIT.ReportingChatModel model;

  private Deployment deployment;

  @AfterEach
  void deleteDeployment() {
    if (deployment != null) {
      repositoryService.deleteDeployment(deployment.getId(), true);
    }
  }

  @Test
  void shouldRecordShortenedContentOfLongDossier() {
    model.answer = "{\"category\":\"Theft\",\"reasoning\":\"" + "because ".repeat(200) + "\"}";
    deployment = repositoryService.createDeployment().addString("llm-task.bpmn", process("""
        <bpmn:serviceTask id="Task_Llm" camunda:delegateExpression="${orqueioLlmTask}" camunda:asyncBefore="true">
          <bpmn:extensionElements>
            <camunda:properties>%s</camunda:properties>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        """.formatted(property("orqueio.llm.inputs", "text") + property("orqueio.llm.prompt", "Classify: {{text}}")
        + property("orqueio.llm.outputs", "category:string")))
        .replace("<bpmn:endEvent id=\"End\" />", "<bpmn:userTask id=\"End\" />")).deploy();

    ProcessInstance instance = runtimeService.startProcessInstanceByKey("llmTaskProcess",
        Map.of("text", "My bike was stolen. ".repeat(150)));
    managementService.executeJob(managementService.createJobQuery().processInstanceId(instance.getId()).singleResult().getId());

    assertThat(runtimeService.getVariable(instance.getId(), "category")).isEqualTo("Theft");
    String record = (String) runtimeService.getVariable(instance.getId(), "orqueioLlm_Task_Llm");
    assertThat(record).hasSizeLessThanOrEqualTo(LlmTaskAuditor.MAX_RECORD_LENGTH);
    JsonNode audit = JsonMapper.builder().build().readTree(record);
    // The data sent; the instructions are identified by the prompt version
    assertThat(audit.get("prompt").asString()).startsWith("{\"text\":\"My bike was stolen.");
    assertThat(audit.get("truncated").asBoolean()).isTrue();
  }

}
