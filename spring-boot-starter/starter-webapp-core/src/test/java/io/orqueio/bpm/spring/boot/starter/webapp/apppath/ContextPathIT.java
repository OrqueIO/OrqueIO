/*
 * Copyright OrqueIO and/or licensed to OrqueIO
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. OrqueIO licenses this file to you under the Apache License,
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
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that <base href> is rewritten to include server.servlet.context-path.
 * Reproduces https://github.com/OrqueIO/OrqueIO/issues/152
 */
@RunWith(SpringRunner.class)
@SpringBootTest(
    classes = { WebappTestApp.class },
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
    "server.servlet.context-path=/my-app",
    "camunda.bpm.webapp.applicationPath=/orqueio"
})
public class ContextPathIT {

    private static final String CONTEXT_PATH = "/my-app";
    private static final String APP_PATH = "/orqueio";

    @LocalServerPort
    private int port;

    @Test
    public void shouldRewriteBaseHrefWithContextPathAndApplicationPath() throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("http://localhost:" + port + CONTEXT_PATH + APP_PATH + "/app/index.html"))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("<base href=\"" + CONTEXT_PATH + APP_PATH + "/app/\">");
    }
}
