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
package io.orqueio.bpm.spring.boot.starter.rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.rest.dto.runtime.ProcessInstanceDto;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.runtime.VariableInstance;
import io.orqueio.bpm.spring.boot.starter.property.OrqueioBpmProperties;
import my.own.custom.spring.boot.project.SampleOrqueioRestApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.springframework.core.io.ClassPathResource;

import java.io.ByteArrayInputStream;

@SpringBootTest(classes = SampleOrqueioRestApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class SampleOrqueioRestApplicationIT {

  @Autowired
  private WebTestClient webTestClient;

  @Autowired
  private RuntimeService runtimeService;

  @Autowired
  private OrqueioBpmProperties orqueioBpmProperties;

  @Test
  public void restApiIsAvailable() {
    webTestClient.get()
            .uri("/engine-rest/engine/")
            .exchange()
            .expectStatus().isOk()
            .expectBody(String.class)
            .value(body -> assertEquals("[{\"name\":\"testEngine\"}]", body));
  }

  @Test
  public void startProcessInstanceByCustomResource() {
    ProcessInstanceDto body = webTestClient.post()
            .uri("/engine-rest/process/start")
            .exchange()
            .expectStatus().isOk()
            .expectBody(ProcessInstanceDto.class)
            .returnResult()
            .getResponseBody();

    assertNotNull(body);

    ProcessInstance processInstance = runtimeService.createProcessInstanceQuery()
            .processInstanceId(body.getId())
            .singleResult();
    assertEquals(processInstance.getProcessInstanceId(), body.getId());
  }

  @Test
  public void multipartFileUploadOrqueioRestIsWorking() throws Exception {
    final String variableName = "testvariable";
    ProcessInstance processInstance = runtimeService.startProcessInstanceByKey("TestProcess");

    webTestClient.post()
            .uri("/engine-rest/engine/{enginename}/process-instance/{id}/variables/{variableName}/data",
                    orqueioBpmProperties.getProcessEngineName(),
                    processInstance.getId(),
                    variableName)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .bodyValue(new ClassPathResource("/bpmn/test.bpmn"))
            .exchange()
            .expectStatus().isNoContent();

    VariableInstance variableInstance = runtimeService.createVariableInstanceQuery()
            .processInstanceIdIn(processInstance.getId())
            .variableName(variableName)
            .singleResult();

    assertNotNull(variableInstance);
    assertTrue(((ByteArrayInputStream) variableInstance.getValue()).available() > 0);
  }

  @Test
  public void fetchAndLockExternalTaskWithLongPollingIsRunning() {
    String requestJson = "{"
            + "  \"workerId\":\"aWorkerId\","
            + "  \"maxTasks\":2,"
            + "  \"topics\":[{\"topicName\":\"aTopicName\",\"lockDuration\":10000}]"
            + "}";

    webTestClient.post()
            .uri("/engine-rest/engine/{enginename}/external-task/fetchAndLock", orqueioBpmProperties.getProcessEngineName())
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(requestJson)
            .exchange()
            .expectStatus().isOk()
            .expectBody(String.class)
            .value(body -> assertEquals("[]", body));
  }
}

