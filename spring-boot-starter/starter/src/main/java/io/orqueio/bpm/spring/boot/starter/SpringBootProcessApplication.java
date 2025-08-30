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

import static io.orqueio.bpm.application.ProcessApplicationInfo.PROP_SERVLET_CONTEXT_PATH;
import static io.orqueio.bpm.spring.boot.starter.util.GetProcessApplicationNameFromAnnotation.processApplicationNameFromAnnotation;
import static io.orqueio.bpm.spring.boot.starter.util.SpringBootProcessEngineLogger.LOG;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;

import jakarta.servlet.ServletContext;

import io.orqueio.bpm.application.PostDeploy;
import io.orqueio.bpm.application.PreUndeploy;
import io.orqueio.bpm.container.RuntimeContainerDelegate;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.spring.application.SpringProcessApplication;
import io.orqueio.bpm.spring.boot.starter.configuration.OrqueioDeploymentConfiguration;
import io.orqueio.bpm.spring.boot.starter.event.PostDeployEvent;
import io.orqueio.bpm.spring.boot.starter.event.PreUndeployEvent;
import io.orqueio.bpm.spring.boot.starter.property.OrqueioBpmProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.util.StringUtils;
import org.springframework.web.context.ServletContextAware;

@Configuration
public class SpringBootProcessApplication extends SpringProcessApplication {

  @Bean
  public static OrqueioDeploymentConfiguration deploymentConfiguration() {
    return new OrqueioDeploymentConfiguration() {
      @Override
      public Set<Resource> getDeploymentResources() {
        return Collections.emptySet();
      }

      @Override
      public void preInit(ProcessEngineConfigurationImpl configuration) {
        LOG.skipAutoDeployment();
      }

      @Override
      public String toString() {
        return "disableDeploymentResourcePattern";
      }
    };
  }

  @Value("${spring.application.name:null}")
  protected Optional<String> springApplicationName;

  protected String contextPath = "/";

  @Autowired
  protected OrqueioBpmProperties orqueioBpmProperties;

  @Autowired
  protected ProcessEngine processEngine;

  @Autowired
  protected ApplicationEventPublisher eventPublisher;

  @Override
  public void afterPropertiesSet() throws Exception {
    processApplicationNameFromAnnotation(applicationContext)
      .apply(springApplicationName)
      .ifPresent(this::setBeanName);

    if (orqueioBpmProperties.getGenerateUniqueProcessApplicationName()) {
      setBeanName(OrqueioBpmProperties.getUniqueName(OrqueioBpmProperties.UNIQUE_APPLICATION_NAME_PREFIX));
    }

    String processEngineName = processEngine.getName();
    setDefaultDeployToEngineName(processEngineName);

    RuntimeContainerDelegate.INSTANCE.get().registerProcessEngine(processEngine);

    properties.put(PROP_SERVLET_CONTEXT_PATH, contextPath);
    super.afterPropertiesSet();
  }

  @Override
  public void destroy() throws Exception {
    super.destroy();
    RuntimeContainerDelegate.INSTANCE.get().unregisterProcessEngine(processEngine);
  }

  @PostDeploy
  public void onPostDeploy(ProcessEngine processEngine) {
    eventPublisher.publishEvent(new PostDeployEvent(processEngine));
  }

  @PreUndeploy
  public void onPreUndeploy(ProcessEngine processEngine) {
    eventPublisher.publishEvent(new PreUndeployEvent(processEngine));
  }

  @ConditionalOnWebApplication
  @Configuration
  class WebApplicationConfiguration implements ServletContextAware {

    @Override
    public void setServletContext(ServletContext servletContext) {
      if (!StringUtils.isEmpty(servletContext.getContextPath())) {
        contextPath = servletContext.getContextPath();
      }
    }
  }
}
