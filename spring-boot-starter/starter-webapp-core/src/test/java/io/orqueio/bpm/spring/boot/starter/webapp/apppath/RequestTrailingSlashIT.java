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
package io.orqueio.bpm.spring.boot.starter.webapp.apppath;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import io.orqueio.bpm.spring.boot.starter.webapp.WebappTestApp;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.reactive.server.WebTestClient;

@RunWith(SpringRunner.class)
@SpringBootTest(
    classes = { WebappTestApp.class },
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class RequestTrailingSlashIT {

  public static final List<String> REDIRECT_PATHS =
      List.of("/app", "/app/cockpit", "/app/admin", "/app/tasklist", "/app/welcome");

  @LocalServerPort
  public int port;

  private WebTestClient client;

  @Test
  public void shouldRedirectPathWithMissingTrailingSlash() throws IOException {
    client = WebTestClient
        .bindToServer()
        .baseUrl("http://localhost:" + port)
        .build();

    List<ResponseEntity<String>> responses = new ArrayList<>();

    for (String path : REDIRECT_PATHS) {

      // res1
      var result1 = client.get()
          .uri("/orqueio" + path)
          .exchange()
          .expectStatus().value(s -> assertThat(s).isIn(200, 301, 302))
          .expectBody(String.class)
          .returnResult();

      ResponseEntity<String> res1 = ResponseEntity
          .status(result1.getStatus().value())
          .headers(result1.getResponseHeaders())
          .body(result1.getResponseBody());

      // res2
      var result2 = client.get()
          .uri("/orqueio" + path + "/")
          .exchange()
          .expectStatus().value(s -> assertThat(s).isIn(200, 301, 302))
          .expectBody(String.class)
          .returnResult();

      ResponseEntity<String> res2 = ResponseEntity
          .status(result2.getStatus().value())
          .headers(result2.getResponseHeaders())
          .body(result2.getResponseBody());

      responses.add(res1);
      responses.add(res2);
    }

    assertThat(responses)
        .extracting(ResponseEntity::getStatusCode)
        .allMatch(code -> code == HttpStatus.OK ||
                          code == HttpStatus.FOUND ||
                          code == HttpStatus.MOVED_PERMANENTLY);
  }
}


