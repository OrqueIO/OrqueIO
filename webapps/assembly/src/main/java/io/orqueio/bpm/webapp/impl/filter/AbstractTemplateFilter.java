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
package io.orqueio.bpm.webapp.impl.filter;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.StringWriter;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.file.Path;
import java.nio.file.Paths;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
/**
 * A {@link Filter} implementation that can be used to realize basic templating.
 *
 * @author nico.rehwaldt
 */
public abstract class AbstractTemplateFilter implements Filter {

  private FilterConfig filterConfig;

  @Override
  public void init(FilterConfig filterConfig) throws ServletException {
    this.filterConfig = filterConfig;
  }

  @Override
  public void destroy() {
    filterConfig = null;
  }

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
          throws IOException, ServletException {
    applyFilter((HttpServletRequest) request, (HttpServletResponse) response, chain);
  }

  /**
   * Apply the filter to the given request/response.
   *
   * This method must be provided by subclasses to perform actual work.
   *
   * @param request
   * @param response
   * @param chain
   *
   * @throws IOException
   * @throws ServletException
   */
  protected abstract void applyFilter(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
          throws IOException, ServletException;

  /**
   * Returns true if the given web resource exists.
   *
   * @param name the resource path
   * @return true if the resource exists
   * @throws SecurityException if the path is invalid
   */
  protected boolean hasWebResource(String name) {
    // Reject null or empty input
    if (name == null || name.isBlank()) {
      return false;
    }

    // Normalize path to prevent path traversal
    Path basePath = Paths.get("/"); // webapp root
    Path normalizedPath = basePath.resolve(name).normalize();

    // Ensure the resource stays inside the webapp root
    if (!normalizedPath.startsWith(basePath)) {
      return false; // invalid path
    }

    try {
      URL resource = filterConfig.getServletContext().getResource(normalizedPath.toString());
      return resource != null;
    } catch (MalformedURLException e) {
      return false;
    }
  }


  /**
   * Returns the string contents of a web resource with the given name.
   *
   * The resource must be static and text based.
   *
   * @param name the name of the resource
   *
   * @return the resource contents
   *
   * @throws IOException
   * @throws SecurityException if the path is invalid
   */
  protected String getWebResourceContents(String name) throws IOException {
    // Reject null or empty input
    if (name == null || name.isBlank()) {
      throw new SecurityException("Resource name cannot be null or empty");
    }

    // Normalize the path to prevent path traversal
    Path basePath = Paths.get("/"); // webapp root
    Path normalizedPath = basePath.resolve(name).normalize();

    // Ensure the resource stays inside the webapp root
    if (!normalizedPath.startsWith(basePath)) {
      throw new SecurityException("Invalid resource path: " + name);
    }

    // Load the resource safely using try-with-resources
    try (InputStream is = filterConfig.getServletContext().getResourceAsStream(normalizedPath.toString())) {
      if (is == null) {
        throw new IOException("Resource not found: " + normalizedPath);
      }

      try (BufferedReader reader = new BufferedReader(new InputStreamReader(is));
           StringWriter writer = new StringWriter()) {

        String line;
        while ((line = reader.readLine()) != null) {
          writer.write(line);
          writer.append("\n");
        }
        return writer.toString();
      }
    }
  }
}
