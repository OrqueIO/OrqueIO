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

import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.interceptor.CommandExecutor;
import io.orqueio.bpm.engine.spring.ProcessEngineFactoryBean;
import io.orqueio.bpm.engine.spring.SpringProcessEngineServicesConfiguration;
import io.orqueio.bpm.spring.boot.starter.event.ProcessApplicationEventPublisher;
import io.orqueio.bpm.spring.boot.starter.property.OrqueioBpmProperties;
import io.orqueio.bpm.spring.boot.starter.property.ManagementProperties;
import io.orqueio.bpm.spring.boot.starter.util.OrqueioBpmVersion;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;

@EnableConfigurationProperties({
  OrqueioBpmProperties.class,
  ManagementProperties.class
})
@Import({
  OrqueioBpmConfiguration.class,
  OrqueioBpmActuatorConfiguration.class,
  OrqueioBpmPluginConfiguration.class,
  OrqueioBpmTelemetryConfiguration.class,
  SpringProcessEngineServicesConfiguration.class
})
@Configuration
@ConditionalOnProperty(prefix = OrqueioBpmProperties.PREFIX, name = "enabled", matchIfMissing = true)
@AutoConfigureAfter(HibernateJpaAutoConfiguration.class)
public class OrqueioBpmAutoConfiguration {

  @SuppressWarnings("SpringJavaInjectionPointsAutowiringInspection")
  @Configuration
  class ProcessEngineConfigurationImplDependingConfiguration {

    @Autowired
    protected ProcessEngineConfigurationImpl processEngineConfigurationImpl;

    @Bean
    public ProcessEngineFactoryBean processEngineFactoryBean() {
      final ProcessEngineFactoryBean factoryBean = new ProcessEngineFactoryBean();
      factoryBean.setProcessEngineConfiguration(processEngineConfigurationImpl);

      return factoryBean;
    }

    @Bean
    @Primary
    public CommandExecutor commandExecutorTxRequired() {
      return processEngineConfigurationImpl.getCommandExecutorTxRequired();
    }

    @Bean
    public CommandExecutor commandExecutorTxRequiresNew() {
      return processEngineConfigurationImpl.getCommandExecutorTxRequiresNew();
    }

    @Bean
    public CommandExecutor commandExecutorSchemaOperations() {
      return processEngineConfigurationImpl.getCommandExecutorSchemaOperations();
    }
  }

  @Bean
  public OrqueioBpmVersion orqueioBpmVersion() {
    return new OrqueioBpmVersion();
  }

  @Bean
  public ProcessApplicationEventPublisher processApplicationEventPublisher(ApplicationEventPublisher publisher) {
    return new ProcessApplicationEventPublisher(publisher);
  }

}
