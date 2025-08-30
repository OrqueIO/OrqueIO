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
package io.orqueio.bpm.run.property;

import io.orqueio.bpm.spring.boot.starter.property.OrqueioBpmProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.NestedConfigurationProperty;

import java.util.ArrayList;
import java.util.List;

@ConfigurationProperties(OrqueioBpmRunProperties.PREFIX)
public class OrqueioBpmRunProperties {

  public static final String PREFIX = OrqueioBpmProperties.PREFIX + ".run";

  @NestedConfigurationProperty
  protected OrqueioBpmRunAuthenticationProperties auth = new OrqueioBpmRunAuthenticationProperties();

  @NestedConfigurationProperty
  protected OrqueioBpmRunCorsProperty cors = new OrqueioBpmRunCorsProperty();

  @NestedConfigurationProperty
  protected OrqueioBpmRunLdapProperties ldap = new OrqueioBpmRunLdapProperties();

  @NestedConfigurationProperty
  protected List<OrqueioBpmRunProcessEnginePluginProperty> processEnginePlugins = new ArrayList<>();

  @NestedConfigurationProperty
  protected OrqueioBpmRunRestProperties rest = new OrqueioBpmRunRestProperties();

  @NestedConfigurationProperty
  protected OrqueioBpmRunDeploymentProperties deployment = new OrqueioBpmRunDeploymentProperties();

  protected OrqueioBpmRunAdministratorAuthorizationProperties adminAuth
      = new OrqueioBpmRunAdministratorAuthorizationProperties();

  public OrqueioBpmRunAuthenticationProperties getAuth() {
    return auth;
  }

  public void setAuth(OrqueioBpmRunAuthenticationProperties auth) {
    this.auth = auth;
  }

  public OrqueioBpmRunCorsProperty getCors() {
    return cors;
  }

  public void setCors(OrqueioBpmRunCorsProperty cors) {
    this.cors = cors;
  }

  public OrqueioBpmRunLdapProperties getLdap() {
    return ldap;
  }

  public void setLdap(OrqueioBpmRunLdapProperties ldap) {
    this.ldap = ldap;
  }

  public OrqueioBpmRunAdministratorAuthorizationProperties getAdminAuth() {
    return adminAuth;
  }

  public void setAdminAuth(OrqueioBpmRunAdministratorAuthorizationProperties adminAuth) {
    this.adminAuth = adminAuth;
  }

  public List<OrqueioBpmRunProcessEnginePluginProperty> getProcessEnginePlugins() {
    return processEnginePlugins;
  }

  public void setProcessEnginePlugins(List<OrqueioBpmRunProcessEnginePluginProperty> processEnginePlugins) {
    this.processEnginePlugins = processEnginePlugins;
  }

  public OrqueioBpmRunRestProperties getRest() {
    return rest;
  }

  public void setRest(OrqueioBpmRunRestProperties rest) {
    this.rest = rest;
  }

  public OrqueioBpmRunDeploymentProperties getDeployment() {
    return deployment;
  }

  public void setDeployment(OrqueioBpmRunDeploymentProperties deployment) {
    this.deployment = deployment;
  }


  @Override
  public String toString() {
    return "OrqueioBpmRunProperties [" +
        "auth=" + auth +
        ", cors=" + cors +
        ", ldap=" + ldap +
        ", adminAuth=" + adminAuth +
        ", plugins=" + processEnginePlugins +
        ", rest=" + rest +
        ", deployment=" + deployment +
        "]";
  }
}
