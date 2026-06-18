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
package io.orqueio.bpm.spring.boot.starter.webapp;

import jakarta.servlet.ServletException;
import java.io.IOException;
import org.apache.catalina.connector.Request;
import org.apache.catalina.connector.Response;
import org.apache.catalina.valves.ValveBase;

/**
 * Tomcat Engine Valve that redirects bare root requests (/) to the application when a
 * non-root context-path is configured. Runs before Tomcat routes the request to any
 * context, so it catches requests that would otherwise return 404 because no ROOT
 * context is deployed.
 */
public class RootRedirectValve extends ValveBase {

  private final String targetPath;

  public RootRedirectValve(String targetPath) {
    super(true);
    this.targetPath = targetPath;
  }

  @Override
  public void invoke(Request request, Response response) throws IOException, ServletException {
    String uri = request.getRequestURI();
    if ("/".equals(uri) || uri.isEmpty()) {
      response.sendRedirect(targetPath);
      return;
    }
    getNext().invoke(request, response);
  }
}
