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
package io.orqueio.bpm.spring.boot.starter;

import static io.orqueio.bpm.spring.boot.starter.jdbc.HistoryLevelDeterminatorJdbcTemplateImpl.createHistoryLevelDeterminator;

import java.util.List;

import io.orqueio.bpm.engine.impl.cfg.CompositeProcessEnginePlugin;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.cfg.ProcessEnginePlugin;
import io.orqueio.bpm.engine.spring.SpringProcessEngineConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.OrqueioAuthorizationConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.OrqueioDatasourceConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.OrqueioDeploymentConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.OrqueioFailedJobConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.OrqueioHistoryConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.OrqueioHistoryLevelAutoHandlingConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.OrqueioJobConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.OrqueioMetricsConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.OrqueioProcessEngineConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.condition.NeedsHistoryAutoConfigurationCondition;
import io.orqueio.bpm.spring.boot.starter.configuration.id.IdGeneratorConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.impl.custom.CreateAdminUserConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.impl.custom.CreateFilterConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.impl.DefaultAuthorizationConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.impl.DefaultDatasourceConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.impl.DefaultDeploymentConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.impl.DefaultFailedJobConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.impl.DefaultHistoryConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.impl.DefaultHistoryLevelAutoHandlingConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.impl.DefaultJobConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.impl.DefaultJobConfiguration.JobConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.impl.DefaultMetricsConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.impl.DefaultProcessEngineConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.impl.GenericPropertiesConfiguration;
import io.orqueio.bpm.spring.boot.starter.event.EventPublisherPlugin;
import io.orqueio.bpm.spring.boot.starter.jdbc.HistoryLevelDeterminator;
import io.orqueio.bpm.spring.boot.starter.property.OrqueioBpmProperties;
import io.orqueio.bpm.spring.boot.starter.telemetry.OrqueioIntegrationDeterminator;
import io.orqueio.bpm.spring.boot.starter.util.OrqueioSpringBootUtil;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@Import({
    JobConfiguration.class,
    IdGeneratorConfiguration.class
})
public class OrqueioBpmConfiguration {

  @Bean
  @ConditionalOnMissingBean(ProcessEngineConfigurationImpl.class)
  public ProcessEngineConfigurationImpl processEngineConfigurationImpl(List<ProcessEnginePlugin> processEnginePlugins) {
    final SpringProcessEngineConfiguration configuration = OrqueioSpringBootUtil.springProcessEngineConfiguration();
    configuration.getProcessEnginePlugins().add(new CompositeProcessEnginePlugin(processEnginePlugins));
    return configuration;
  }

  @Bean
  @ConditionalOnMissingBean(DefaultProcessEngineConfiguration.class)
  public static OrqueioProcessEngineConfiguration orqueioProcessEngineConfiguration() {
    return new DefaultProcessEngineConfiguration();
  }

  @Bean
  @ConditionalOnMissingBean(OrqueioDatasourceConfiguration.class)
  public static OrqueioDatasourceConfiguration orqueioDatasourceConfiguration() {
    return new DefaultDatasourceConfiguration();
  }

  @Bean
  @ConditionalOnMissingBean(OrqueioJobConfiguration.class)
  @ConditionalOnProperty(prefix = "orqueio.bpm.job-execution", name = "enabled", havingValue = "true", matchIfMissing = true)
  public static OrqueioJobConfiguration orqueioJobConfiguration() {
    return new DefaultJobConfiguration();
  }

  @Bean
  @ConditionalOnMissingBean(OrqueioHistoryConfiguration.class)
  public static OrqueioHistoryConfiguration orqueioHistoryConfiguration() {
    return new DefaultHistoryConfiguration();
  }

  @Bean
  @ConditionalOnMissingBean(OrqueioMetricsConfiguration.class)
  public static OrqueioMetricsConfiguration orqueioMetricsConfiguration() {
    return new DefaultMetricsConfiguration();
  }

  //TODO to be removed within CAM-8108
  @Bean(name = "historyLevelAutoConfiguration")
  @ConditionalOnMissingBean(OrqueioHistoryLevelAutoHandlingConfiguration.class)
  @ConditionalOnProperty(prefix = "orqueio.bpm", name = "history-level", havingValue = "auto", matchIfMissing = false)
  @Conditional(NeedsHistoryAutoConfigurationCondition.class)
  public static OrqueioHistoryLevelAutoHandlingConfiguration historyLevelAutoHandlingConfiguration() {
    return new DefaultHistoryLevelAutoHandlingConfiguration();
  }

  //TODO to be removed within CAM-8108
  @Bean(name = "historyLevelDeterminator")
  @ConditionalOnMissingBean(name = { "orqueioBpmJdbcTemplate", "historyLevelDeterminator" })
  @ConditionalOnBean(name = "historyLevelAutoConfiguration")
  public static HistoryLevelDeterminator historyLevelDeterminator(OrqueioBpmProperties orqueioBpmProperties, JdbcTemplate jdbcTemplate) {
    return createHistoryLevelDeterminator(orqueioBpmProperties, jdbcTemplate);
  }

  //TODO to be removed within CAM-8108
  @Bean(name = "historyLevelDeterminator")
  @ConditionalOnBean(name = { "orqueioBpmJdbcTemplate", "historyLevelAutoConfiguration", "historyLevelDeterminator" })
  @ConditionalOnMissingBean(name = "historyLevelDeterminator")
  public static HistoryLevelDeterminator historyLevelDeterminatorMultiDatabase(OrqueioBpmProperties orqueioBpmProperties,
      @Qualifier("orqueioBpmJdbcTemplate") JdbcTemplate jdbcTemplate) {
    return createHistoryLevelDeterminator(orqueioBpmProperties, jdbcTemplate);
  }

  @Bean
  @ConditionalOnMissingBean(OrqueioAuthorizationConfiguration.class)
  public static OrqueioAuthorizationConfiguration orqueioAuthorizationConfiguration() {
    return new DefaultAuthorizationConfiguration();
  }

  @Bean
  @ConditionalOnMissingBean(OrqueioDeploymentConfiguration.class)
  public static OrqueioDeploymentConfiguration orqueioDeploymentConfiguration() {
    return new DefaultDeploymentConfiguration();
  }

  @Bean
  public GenericPropertiesConfiguration genericPropertiesConfiguration() {
    return new GenericPropertiesConfiguration();
  }

  @Bean
  @ConditionalOnProperty(prefix = "orqueio.bpm.admin-user", name = "id")
  public CreateAdminUserConfiguration createAdminUserConfiguration() {
    return new CreateAdminUserConfiguration();
  }

  @Bean
  @ConditionalOnMissingBean(OrqueioFailedJobConfiguration.class)
  public static OrqueioFailedJobConfiguration failedJobConfiguration() {
    return new DefaultFailedJobConfiguration();
  }

  @Bean
  @ConditionalOnProperty(prefix = "orqueio.bpm.filter", name = "create")
  public CreateFilterConfiguration createFilterConfiguration() {
    return new CreateFilterConfiguration();
  }

  @Bean
  public EventPublisherPlugin eventPublisherPlugin(OrqueioBpmProperties properties, ApplicationEventPublisher publisher) {
    return new EventPublisherPlugin(properties.getEventing(), publisher);
  }

  @Bean
  public OrqueioIntegrationDeterminator orqueioIntegrationDeterminator() {
    return new OrqueioIntegrationDeterminator();
  }
}
