/*
 * Copyright TOADDLATERCCS and/or licensed to TOADDLATERCCS
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. TOADDLATERCCS this file to you under the Apache License,
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
package io.orqueio.bpm.engine.impl.diagnostics;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import io.orqueio.bpm.engine.impl.telemetry.dto.ApplicationServerImpl;
import io.orqueio.bpm.engine.impl.telemetry.dto.LicenseKeyDataImpl;

public class DiagnosticsRegistry {

  protected Map<String, CommandCounter> commands = new HashMap<>();
  protected ApplicationServerImpl applicationServer;
  protected LicenseKeyDataImpl licenseKey;
  protected String orqueioIntegration;
  protected Set<String> webapps = new HashSet<>();

  public synchronized ApplicationServerImpl getApplicationServer() {
    if (applicationServer == null) {
      applicationServer = PlatformDiagnosticsRegistry.getApplicationServer();
    }
    return applicationServer;
  }

  public synchronized void setApplicationServer(String applicationServerVersion) {
    this.applicationServer = new ApplicationServerImpl(applicationServerVersion);
  }

  public Map<String, CommandCounter> getCommands() {
    return commands;
  }

  public String getOrqueioIntegration() {
    return orqueioIntegration;
  }

  public void setOrqueioIntegration(String orqueioIntegration) {
    this.orqueioIntegration = orqueioIntegration;
  }

  public LicenseKeyDataImpl getLicenseKey() {
    return licenseKey;
  }

  public void setLicenseKey(LicenseKeyDataImpl licenseKey) {
    this.licenseKey = licenseKey;
  }

  public synchronized Set<String> getWebapps() {
    return webapps;
  }

  public synchronized void setWebapps(Set<String> webapps) {
    this.webapps = webapps;
  }

  public void markOccurrence(String name) {
    markOccurrence(name, 1);
  }

  public void markOccurrence(String name, long times) {
    CommandCounter counter = commands.get(name);
    if (counter == null) {
      synchronized (commands) {
        if (counter == null) {
          counter = new CommandCounter(name);
          commands.put(name, counter);
        }
      }
    }

    counter.mark(times);
  }

  public synchronized void addWebapp(String webapp) {
    if (!webapps.contains(webapp)) {
      webapps.add(webapp);
    }
  }

  public void clearCommandCounts() {
    commands.clear();
  }

  public void clear() {
    commands.clear();
    licenseKey = null;
    applicationServer = null;
    webapps.clear();
  }

}
