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
package io.orqueio.bpm.webapp.impl.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.Assert.fail;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Collections;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.servlet.ServletContext;
import javax.servlet.http.HttpServletResponse;

import io.orqueio.bpm.cockpit.Cockpit;
import io.orqueio.bpm.cockpit.impl.DefaultCockpitRuntimeDelegate;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.rest.spi.ProcessEngineProvider;
import io.orqueio.bpm.webapp.impl.IllegalWebAppConfigurationException;
import org.junit.After;
import org.junit.Test;

/**
 *
 * @author nico.rehwaldt
 */
public class EnginesFilterTest {

  @Test
  public void testHTML_FILE_PATTERN() throws Exception {

    // Test APP_PREFIX_PATTERN - matches any /app/* route
    Pattern appPattern = ProcessEnginesFilter.APP_PREFIX_PATTERN;

    assertThat(appPattern.matcher("/app/cockpit/").matches()).isTrue();
    assertThat(appPattern.matcher("/app/cockpit/engine1/").matches()).isTrue();
    assertThat(appPattern.matcher("/app/cockpit/engine1/something/asd.html").matches()).isTrue();
    assertThat(appPattern.matcher("/app/admin/engine1/something/asd.html").matches()).isTrue();
    assertThat(appPattern.matcher("/app/cockpit/index.html").matches()).isTrue();
    assertThat(appPattern.matcher("/app/tasklist/spring-engine/").matches()).isTrue();
    assertThat(appPattern.matcher("/app/").matches()).isTrue();
    assertThat(appPattern.matcher("/app").matches()).isTrue();
    assertThat(appPattern.matcher("/api/something").matches()).isFalse();

    // Test LEGACY_APP_PATTERN - matches legacy AngularJS URLs with app name and engine
    Pattern legacyPattern = ProcessEnginesFilter.LEGACY_APP_PATTERN;

    Matcher matcher1 = legacyPattern.matcher("/app/cockpit/");
    assertThat(matcher1.matches()).isTrue();
    assertThat(matcher1.group(1)).isEqualTo("cockpit");

    Matcher matcher2 = legacyPattern.matcher("/app/cockpit/engine1/");
    assertThat(matcher2.matches()).isTrue();
    assertThat(matcher2.group(1)).isEqualTo("cockpit");
    assertThat(matcher2.group(2)).isEqualTo("engine1");

    Matcher matcher3 = legacyPattern.matcher("/app/cockpit/engine1/something/asd.html");
    assertThat(matcher3.matches()).isTrue();
    assertThat(matcher3.group(1)).isEqualTo("cockpit");
    assertThat(matcher3.group(2)).isEqualTo("engine1");
    assertThat(matcher3.group(3)).isEqualTo("something/asd.html");

    Matcher matcher4 = legacyPattern.matcher("/app/admin/engine1/something/asd.html");
    assertThat(matcher4.matches()).isTrue();
    assertThat(matcher4.group(1)).isEqualTo("admin");
    assertThat(matcher4.group(2)).isEqualTo("engine1");
    assertThat(matcher4.group(3)).isEqualTo("something/asd.html");

    Matcher matcher6 = legacyPattern.matcher("/app/tasklist/spring-engine/");
    assertThat(matcher6.matches()).isTrue();
    assertThat(matcher6.group(1)).isEqualTo("tasklist");
    assertThat(matcher6.group(2)).isEqualTo("spring-engine");
  }

  @Test
  public void testGetDefaultProcessEngine() {

    // see https://app.camunda.com/jira/browse/CAM-2126

    // runtime delegate returns single, non-default-named process engine engine

    Cockpit.setCockpitRuntimeDelegate(new DefaultCockpitRuntimeDelegate() {

      protected ProcessEngineProvider loadProcessEngineProvider() {
        return null;
      }

      public Set<String> getProcessEngineNames() {
        return Collections.singleton("foo");
      }
      public ProcessEngine getDefaultProcessEngine() {
        return null;
      }
    });

    ProcessEnginesFilter processEnginesFilter = new ProcessEnginesFilter();
    String defaultEngineName = processEnginesFilter.getDefaultEngineName();
    assertThat(defaultEngineName).isEqualTo("foo");


    // now it returns 'null'

    Cockpit.setCockpitRuntimeDelegate(new DefaultCockpitRuntimeDelegate() {

      protected ProcessEngineProvider loadProcessEngineProvider() {
        return null;
      }

      public Set<String> getProcessEngineNames() {
        return Collections.emptySet();
      }
      public ProcessEngine getDefaultProcessEngine() {
        return null;
      }
    });

    try {
      defaultEngineName = processEnginesFilter.getDefaultEngineName();
      fail();
    } catch(IllegalWebAppConfigurationException e) {
      // expected
    }

  }

  /**
   * Verifies that serveAngularIndex rewrites <base href> to contextPath+applicationPath+"/app/"
   * regardless of the value compiled by ng build (which is always overwritten at runtime).
   *
   * Covers Tomcat/WildFly deployments where contextPath = "/orqueio" and applicationPath = "".
   * The Spring Boot equivalent is covered by ContextPathIT.java (BaseHrefTransformer).
   */
  @Test
  public void testServeAngularIndex_rewritesBaseHrefWithContextPath() throws Exception {
    // HTML as produced by: ng build (production config) — <base href="/">
    assertBaseHrefRewrite("<!doctype html><html><head><base href=\"/\"></head><body></body></html>",
        "", "/orqueio", "/orqueio/app/");
  }

  @Test
  public void testServeAngularIndex_rewritesBaseHrefWithApplicationPath() throws Exception {
    // HTML as produced by: ng build (production config), non-empty applicationPath
    assertBaseHrefRewrite("<!doctype html><html><head><base href=\"/\"></head><body></body></html>",
        "/myapp", "/orqueio", "/orqueio/myapp/app/");
  }

  @Test
  public void testServeAngularIndex_injectsGlobalVariables() throws Exception {
    String html = "<!doctype html><html><head><base href=\"/\"></head><body></body></html>";
    String result = serveAngularIndexHtml(html, "", "/orqueio");

    assertThat(result).contains("window.__ORQUEIO_BASE__='/orqueio'");
    assertThat(result).contains("window.__ORQUEIO_CONTEXT_PATH__='/orqueio'");
  }

  private void assertBaseHrefRewrite(String compiledHtml, String applicationPath,
      String contextPath, String expectedBaseHref) throws Exception {
    String result = serveAngularIndexHtml(compiledHtml, applicationPath, contextPath);
    assertThat(result).contains("<base href=\"" + expectedBaseHref + "\">");
    assertThat(result).doesNotContain("<base href=\"/\">");
  }

  private String serveAngularIndexHtml(String compiledHtml, String applicationPath,
      String contextPath) throws Exception {
    ProcessEnginesFilter filter = new ProcessEnginesFilter() {
      @Override
      protected String getDefaultEngineName() { return "default"; }
      @Override
      protected void setWebappInTelemetry(String engineName, String appName,
          ServletContext servletContext) { /* no-op in unit tests */ }
      @Override
      protected String getWebResourceContents(String name) throws IOException {
        return compiledHtml;
      }
    };

    ByteArrayOutputStream baos = new ByteArrayOutputStream();
    PrintWriter writer = new PrintWriter(baos);
    HttpServletResponse response = mock(HttpServletResponse.class);
    when(response.getWriter()).thenReturn(writer);

    filter.serveAngularIndex(applicationPath, contextPath, response, mock(ServletContext.class));
    writer.flush();
    return baos.toString("UTF-8");
  }

  @After
  public void cleanup() {
    Cockpit.setCockpitRuntimeDelegate(null);
  }
}
