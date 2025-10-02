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
package io.orqueio.bpm.run;

import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.cfg.ProcessEnginePlugin;
import io.orqueio.bpm.engine.impl.plugin.AdministratorAuthorizationPlugin;
import io.orqueio.bpm.identity.impl.ldap.plugin.LdapIdentityProviderPlugin;
import io.orqueio.bpm.run.property.OrqueioBpmRunAdministratorAuthorizationProperties;
import io.orqueio.bpm.run.property.OrqueioBpmRunLdapProperties;
import io.orqueio.bpm.run.property.OrqueioBpmRunProperties;
import io.orqueio.bpm.spring.boot.starter.OrqueioBpmAutoConfiguration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@EnableConfigurationProperties(OrqueioBpmRunProperties.class)
@Configuration
@AutoConfigureAfter({ OrqueioBpmAutoConfiguration.class })
public class OrqueioBpmRunConfiguration {

  @Bean
  @ConditionalOnProperty(name = "enabled", havingValue = "true", prefix = OrqueioBpmRunLdapProperties.PREFIX)
  public LdapIdentityProviderPlugin ldapIdentityProviderPlugin(OrqueioBpmRunProperties properties) {
    return properties.getLdap();
  }

  @Bean
  @ConditionalOnProperty(name = "enabled", havingValue = "true", prefix = OrqueioBpmRunAdministratorAuthorizationProperties.PREFIX)
  public AdministratorAuthorizationPlugin administratorAuthorizationPlugin(OrqueioBpmRunProperties properties) {
    return properties.getAdminAuth();
  }

  @Bean
  public ProcessEngineConfigurationImpl processEngineConfigurationImpl(List<ProcessEnginePlugin> processEnginePluginsFromContext,
                                                                       OrqueioBpmRunProperties properties,
                                                                       OrqueioBpmRunDeploymentConfiguration deploymentConfig) {
    String normalizedDeploymentDir = deploymentConfig.getNormalizedDeploymentDir();
    boolean deployChangedOnly = properties.getDeployment().isDeployChangedOnly();
    var processEnginePluginsFromYaml = properties.getProcessEnginePlugins();

    return new OrqueioBpmRunProcessEngineConfiguration(normalizedDeploymentDir, deployChangedOnly,
        processEnginePluginsFromContext, processEnginePluginsFromYaml);
  }

  @Bean
  public OrqueioBpmRunDeploymentConfiguration orqueioDeploymentConfiguration(@Value("${orqueio.deploymentDir:#{null}}") String deploymentDir) {
    return new OrqueioBpmRunDeploymentConfiguration(deploymentDir);
  }

}
