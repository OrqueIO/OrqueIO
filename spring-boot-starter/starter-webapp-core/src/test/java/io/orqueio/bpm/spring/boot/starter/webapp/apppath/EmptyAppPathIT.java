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

import io.orqueio.bpm.spring.boot.starter.webapp.WebappTestApp;
import io.orqueio.bpm.spring.boot.starter.webapp.filter.util.HttpClientRule;
import org.junit.Rule;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import org.springframework.test.web.reactive.server.WebTestClient;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(SpringExtension.class)
@SpringBootTest(
        classes = {WebappTestApp.class},
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
        "camunda.bpm.webapp.applicationPath=" + EmptyAppPathIT.MY_APP_PATH
})
public class EmptyAppPathIT {

    protected static final String MY_APP_PATH = "";

    @Rule
    public HttpClientRule httpClientRule = new HttpClientRule();

    @LocalServerPort
    int port;

    @Autowired
    private WebTestClient webTestClient;

    @Test
    public void shouldCheckCsrfCookiePath() {

        // Perform request using WebTestClient
        webTestClient.get()
                .uri("http://localhost:" + port + MY_APP_PATH + "/app/tasklist/default")
                .exchange()
                .expectStatus().isOk();

        String xsrfCookieValue = httpClientRule.getXsrfCookie();
        String xsrfTokenHeader = httpClientRule.getXsrfTokenHeader();

        assertThat(xsrfCookieValue).matches("XSRF-TOKEN=[A-Z0-9]{32};Path=/;SameSite=Lax");
        assertThat(xsrfTokenHeader).matches("[A-Z0-9]{32}");

        assertThat(xsrfCookieValue).contains(xsrfTokenHeader);
    }
}
