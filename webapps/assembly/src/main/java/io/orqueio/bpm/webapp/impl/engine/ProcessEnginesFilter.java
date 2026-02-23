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

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.servlet.FilterChain;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import io.orqueio.bpm.cockpit.Cockpit;
import io.orqueio.bpm.cockpit.CockpitRuntimeDelegate;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.authorization.Groups;
import io.orqueio.bpm.engine.rest.util.WebApplicationUtil;
import io.orqueio.bpm.webapp.impl.util.ServletContextUtil;
import io.orqueio.bpm.webapp.impl.IllegalWebAppConfigurationException;
import io.orqueio.bpm.webapp.impl.filter.AbstractTemplateFilter;
import io.orqueio.bpm.webapp.impl.security.SecurityActions;
import io.orqueio.bpm.webapp.impl.security.SecurityActions.SecurityAction;

/**
 * Filter that serves the Angular SPA frontend.
 *
 * This filter handles:
 * - SPA fallback: All /app/* routes return index.html for Angular routing
 * - Legacy redirects: Old AngularJS URLs redirect to new Angular routes
 * - Static assets: JS, CSS, images are served directly
 * - API passthrough: /api/* requests are passed to the filter chain
 *
 * @author nico.rehwaldt
 * @author Daniel Meyer
 * @author Roman Smirnov
 * @author Sebastian Stamm
 */
public class ProcessEnginesFilter extends AbstractTemplateFilter {

  // Legacy AngularJS app names (for redirect handling)
  protected static final String COCKPIT_APP_NAME = "cockpit";
  protected static final String ADMIN_APP_NAME = "admin";
  protected static final String TASKLIST_APP_NAME = "tasklist";
  protected static final String WELCOME_APP_NAME = "welcome";

  // Pattern to match /app/* routes
  public static final Pattern APP_PREFIX_PATTERN = Pattern.compile("/app(/.*)?");

  // Pattern to match legacy AngularJS URLs: /app/{appName}/{engineName}/...
  // The engineName must be a valid process engine name (typically "default")
  public static final Pattern LEGACY_APP_PATTERN = Pattern.compile(
    "/app/(cockpit|admin|tasklist|welcome)/([\\w-]+)?/?(.*)?"
  );

  // Pattern to match static assets (should be served directly, not as SPA)
  public static final Pattern STATIC_ASSET_PATTERN = Pattern.compile(
    ".*\\.(js|css|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|map|json|webp|avif)$"
  );

  // Known Angular routes that should NOT be treated as legacy engine names
  // These are the sub-routes within each app module
  private static final Set<String> ANGULAR_ROUTES = Set.of(
    // Cockpit routes
    "processes", "decisions", "decision-instance", "tasks", "batch", "deployments",
    // Admin routes
    "users", "groups", "tenants", "authorizations", "system",
    // Common routes
    "profile", "login", "setup", "access-denied"
  );

  protected final CockpitRuntimeDelegate cockpitRuntimeDelegate;

  public ProcessEnginesFilter() {
    this.cockpitRuntimeDelegate = Cockpit.getRuntimeDelegate();
  }

  @Override
  protected void applyFilter(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws IOException, ServletException {

    String contextPath = request.getContextPath();
    String requestUri = request.getRequestURI().substring(contextPath.length());

    ServletContext servletContext = request.getServletContext();
    String applicationPath = ServletContextUtil.getAppPath(servletContext);

    int applicationPathLength = applicationPath.length();
    if (applicationPathLength > 0) {
      requestUri = requestUri.substring(applicationPathLength);
    }

    // 1. Handle root access - redirect to /app/
    if (requestUri.isEmpty() || requestUri.equals("/")) {
      response.sendRedirect(String.format("%s%s/app/", contextPath, applicationPath));
      return;
    }

    // 2. Check if this is a /app/* request
    Matcher appMatcher = APP_PREFIX_PATTERN.matcher(requestUri);
    if (!appMatcher.matches()) {
      // Not an app request, pass through
      chain.doFilter(request, response);
      return;
    }

    // 3. Handle legacy AngularJS URLs with redirects
    Matcher legacyMatcher = LEGACY_APP_PATTERN.matcher(requestUri);
    if (legacyMatcher.matches()) {
      String appName = legacyMatcher.group(1);
      String engineName = legacyMatcher.group(2);
      String rest = legacyMatcher.group(3);

      // If there's an engine name (like "default"), it's a legacy URL
      // But skip if it's a known Angular route (not a legacy engine name)
      if (engineName != null && !engineName.isEmpty()
          && !isStaticAsset(engineName)
          && !isAngularRoute(engineName)) {
        String redirectPath = buildAngularRedirectPath(appName, rest, contextPath, applicationPath);
        response.sendRedirect(redirectPath);
        return;
      }
    }

    // 4. Serve static assets directly
    if (STATIC_ASSET_PATTERN.matcher(requestUri).matches()) {
      chain.doFilter(request, response);
      return;
    }

    // 5. SPA Fallback: Serve index.html for all other /app/* routes
    serveAngularIndex(applicationPath, contextPath, response, servletContext);
  }

  /**
   * Builds the redirect path from legacy AngularJS URL to Angular route.
   */
  protected String buildAngularRedirectPath(String appName, String rest,
                                            String contextPath, String applicationPath) {
    StringBuilder path = new StringBuilder();
    path.append(contextPath).append(applicationPath).append("/app/");

    // Map legacy app names to Angular routes
    if (WELCOME_APP_NAME.equals(appName)) {
      // Welcome app goes to root
      // /app/welcome/default/ -> /app/
    } else {
      // Other apps keep their name
      // /app/cockpit/default/ -> /app/cockpit/
      path.append(appName).append("/");
    }

    // Append remaining path if any
    if (rest != null && !rest.isEmpty() && !rest.equals("index.html")) {
      path.append(rest);
    }

    return path.toString();
  }

  /**
   * Checks if the given string looks like a static asset filename.
   */
  protected boolean isStaticAsset(String value) {
    return STATIC_ASSET_PATTERN.matcher(value).matches();
  }

  /**
   * Checks if the given string is a known Angular route.
   * These routes should not be treated as legacy engine names.
   */
  protected boolean isAngularRoute(String value) {
    return ANGULAR_ROUTES.contains(value);
  }

  /**
   * Serves the Angular index.html file.
   * Angular handles all routing client-side, so we just return the index.html
   * without any placeholder substitution (Angular doesn't need it).
   */
  protected void serveAngularIndex(String applicationPath,
                                   String contextPath,
                                   HttpServletResponse response,
                                   ServletContext servletContext) throws IOException {

    // Set telemetry for the webapp
    setWebappInTelemetry(getDefaultEngineName(), "angular", servletContext);

    // Read Angular's index.html
    String data = getWebResourceContents("/app/index.html");

    if (data == null) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND, "Angular index.html not found");
      return;
    }

    response.setContentLength(data.getBytes(StandardCharsets.UTF_8).length);
    response.setContentType("text/html");
    response.setCharacterEncoding("UTF-8");

    response.getWriter().append(data);
  }

  /**
   * Gets the default process engine name.
   */
  protected String getDefaultEngineName() {
    CockpitRuntimeDelegate runtimeDelegate = Cockpit.getRuntimeDelegate();

    Set<String> processEngineNames = runtimeDelegate.getProcessEngineNames();
    if (processEngineNames.isEmpty()) {
      throw new IllegalWebAppConfigurationException(
        "No process engine found. Orqueio Webapp cannot work without a process engine.");
    } else {
      ProcessEngine defaultProcessEngine = runtimeDelegate.getDefaultProcessEngine();
      if (defaultProcessEngine != null) {
        return defaultProcessEngine.getName();
      } else {
        return processEngineNames.iterator().next();
      }
    }
  }

  /**
   * Checks if an initial admin user needs to be created.
   * This is used for the setup flow.
   */
  protected boolean needsInitialUser(String engineName) throws IOException, ServletException {
    final ProcessEngine processEngine = Cockpit.getProcessEngine(engineName);
    if (processEngine == null) {
      return false;
    }

    if (processEngine.getIdentityService().isReadOnly()) {
      return false;
    } else {
      return SecurityActions.runWithoutAuthentication(new SecurityAction<Boolean>() {
        public Boolean execute() {
          return processEngine.getIdentityService()
              .createUserQuery()
              .memberOfGroup(Groups.ORQUEIO_ADMIN).count() == 0;
        }
      }, processEngine);
    }
  }

  /**
   * Sets telemetry data for the webapp.
   */
  protected void setWebappInTelemetry(String engineName, String appName, ServletContext servletContext) {
    if (!ServletContextUtil.isTelemetryDataSentAlready(appName, engineName, servletContext) &&
        WebApplicationUtil.setWebapp(engineName, appName)) {
      ServletContextUtil.setTelemetryDataSent(appName, engineName, servletContext);
    }
  }

}
