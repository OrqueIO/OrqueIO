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
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static io.orqueio.bpm.webapp.impl.security.filter.headersec.provider.impl.ContentSecurityPolicyProvider.HEADER_DEFAULT_VALUE;
import static io.orqueio.bpm.webapp.impl.security.filter.headersec.provider.impl.ContentSecurityPolicyProvider.HEADER_NAME;
import static io.orqueio.bpm.webapp.impl.security.filter.headersec.provider.impl.ContentSecurityPolicyProvider.HEADER_NONCE_PLACEHOLDER;

@RunWith(SpringRunner.class)
@SpringBootTest(
    classes = { WebappTestApp.class },
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
    "camunda.bpm.webapp.applicationPath=" + ChangedAppPathIT.MY_APP_PATH
})
public class ChangedAppPathIT {

    protected static final String MY_APP_PATH = "/my/application/path";

    @Rule
    public HttpClientRule httpClientRule = new HttpClientRule();

    @LocalServerPort
    public int port;

    @Autowired
    protected WebTestClient webClient;

    @Test
    public void shouldCheckPresenceOfCsrfPreventionFilter() {
        httpClientRule.performRequest("http://localhost:" + port + MY_APP_PATH +
            "/app/tasklist/default");

        String xsrfCookieValue = httpClientRule.getXsrfCookie();
        String xsrfTokenHeader = httpClientRule.getXsrfTokenHeader();

        assertThat(xsrfCookieValue).matches("XSRF-TOKEN=[A-Z0-9]{32};Path=" + MY_APP_PATH + ";SameSite=Lax");
        assertThat(xsrfTokenHeader).matches("[A-Z0-9]{32}");
        assertThat(xsrfCookieValue).contains(xsrfTokenHeader);
    }

    @Test
    public void shouldCheckPresenceOfRedirection() {
        httpClientRule.performRequest("http://localhost:" + port + "/");

        assertThat(httpClientRule.getHeader("Location"))
            .isEqualTo("http://localhost:" + port + MY_APP_PATH + "/app/");
    }

    @Test
    public void shouldCheckPresenceOfHeaderSecurityFilter() {
        var result = webClient.get()
            .uri(MY_APP_PATH + "/app/tasklist/default")
            .exchange()
            .expectStatus().is2xxSuccessful()
            .expectBody(String.class)
            .returnResult();

        ResponseEntity<String> response = ResponseEntity
            .status(result.getStatus().value())
            .headers(result.getResponseHeaders())
            .body(result.getResponseBody());

        List<String> headers = response.getHeaders().get(HEADER_NAME);

        String expected = HEADER_DEFAULT_VALUE.replace(
            HEADER_NONCE_PLACEHOLDER,
            "'nonce-([-_a-zA-Z\\d]*)'"
        );
        assertThat(headers).anyMatch(h -> h.matches(expected));
    }

    @Test
    public void shouldCheckPresenceOfCacheControlFilter() {
        var result = webClient.get()
            .uri(MY_APP_PATH + "/app/admin/styles/styles.css")
            .exchange()
            .expectStatus().is2xxSuccessful()
            .expectBody(String.class)
            .returnResult();

        ResponseEntity<String> response = ResponseEntity
            .status(result.getStatus().value())
            .headers(result.getResponseHeaders())
            .body(result.getResponseBody());

        assertThat(response.getHeaders().get("Cache-Control"))
            .containsExactly("no-cache");
    }

    @Test
    public void shouldCheckPresenceOfRestApi() {
        var result = webClient.get()
            .uri(MY_APP_PATH + "/api/engine/engine/")
            .exchange()
            .expectStatus().is2xxSuccessful()
            .expectBody(String.class)
            .returnResult();

        ResponseEntity<String> response = ResponseEntity
            .status(result.getStatus().value())
            .headers(result.getResponseHeaders())
            .body(result.getResponseBody());

        assertThat(response.getBody()).isEqualTo("[{\"name\":\"default\"}]");
    }

    @Test
    public void shouldCheckPresenceOfSecurityFilter() {
        webClient.get()
            .uri(MY_APP_PATH + "/api/engine/engine/default/group/count")
            .exchange()
            .expectStatus().isUnauthorized();
    }

    @Test
    public void shouldCheckPresenceOfLibResources() {
        webClient.get()
            .uri(MY_APP_PATH + "/lib/deps.js")
            .exchange()
            .expectStatus().isOk();
    }

    @Test
    public void shouldCheckPresenceOfAppResources() {
        webClient.get()
            .uri(MY_APP_PATH + "/app/admin/styles/user-styles.css")
            .exchange()
            .expectStatus().isOk();
    }

    @Test
    public void shouldCheckPresenceOfApiResources() {
        webClient.get()
            .uri(MY_APP_PATH + "/api/admin/plugin/adminPlugins/static/app/plugin.css")
            .exchange()
            .expectStatus().isOk();
    }
}


