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

import io.orqueio.bpm.engine.rest.dto.repository.ProcessDefinitionDto;
import io.orqueio.bpm.spring.boot.starter.property.OrqueioBpmProperties;
import io.orqueio.bpm.spring.boot.starter.rest.test.TestRestApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(classes = TestRestApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class OrqueioBpmRestConfigurationIT {

  @Autowired
  private WebTestClient webTestClient;

  @Autowired
  private OrqueioBpmProperties orqueioBpmProperties;

  @Test
  public void processDefinitionTest() {
    // Start process
    webTestClient.post()
            .uri("/engine-rest/start/process")
            .exchange()
            .expectStatus().isOk();

    // Verify process definition
    webTestClient.get()
            .uri("/engine-rest/engine/{engineName}/process-definition/key/TestProcess/", orqueioBpmProperties.getProcessEngineName())
            .exchange()
            .expectStatus().isOk()
            .expectBody(ProcessDefinitionDto.class)
            .value(pd -> {
              assert pd.getKey().equals("TestProcess");
            });
  }
}

