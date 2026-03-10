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
package io.orqueio.bpm.spring.boot.starter.rest;

import jakarta.servlet.Filter;
import io.orqueio.bpm.engine.rest.impl.FetchAndLockContextListener;
import io.orqueio.bpm.engine.rest.security.auth.ProcessEngineAuthenticationFilter;
import io.orqueio.bpm.spring.boot.starter.OrqueioBpmAutoConfiguration;
import io.orqueio.bpm.spring.boot.starter.property.OrqueioBpmProperties;
import org.glassfish.jersey.servlet.ServletContainer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.boot.web.servlet.ServletListenerRegistrationBean;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@AutoConfigureAfter(OrqueioBpmAutoConfiguration.class)
public class OrqueioBpmRestJerseyAutoConfiguration {

  private static final Logger logger = LoggerFactory.getLogger(OrqueioBpmRestJerseyAutoConfiguration.class);

  @Value("${camunda.bpm.rest.path:/engine-rest}")
  private String restApiPath;

  @Bean
  @ConditionalOnMissingBean(OrqueioJerseyResourceConfig.class)
  public OrqueioJerseyResourceConfig jerseyResourceConfig() {
    return new OrqueioJerseyResourceConfig();
  }

  @Bean
  public ServletRegistrationBean<ServletContainer> jerseyServlet(OrqueioJerseyResourceConfig resourceConfig) {
    String path = restApiPath.endsWith("/*") ? restApiPath : restApiPath + "/*";
    logger.info("Registering Jersey servlet at path: {}", path);
    ServletRegistrationBean<ServletContainer> registration =
        new ServletRegistrationBean<>(new ServletContainer(resourceConfig), path);
    registration.setName("jerseyServlet");
    registration.setLoadOnStartup(1);
    registration.setAsyncSupported(true);
    return registration;
  }

  @Bean
  public ServletListenerRegistrationBean<FetchAndLockContextListener> fetchAndLockContextListener() {
    ServletListenerRegistrationBean<FetchAndLockContextListener> registration = new ServletListenerRegistrationBean<>();
    registration.setListener(new FetchAndLockContextListener());
    return registration;
  }

  @Bean
  public OrqueioBpmRestInitializer orqueioBpmRestInitializer(OrqueioBpmProperties props) {
    String path = restApiPath.endsWith("/*") ? restApiPath : restApiPath + "/*";
    return new OrqueioBpmRestInitializer(path, props);
  }

  @Bean
  @ConditionalOnProperty(name = "camunda.bpm.rest-api.basic-auth-enabled", havingValue = "true", matchIfMissing = true)
  @ConditionalOnMissingBean(name = "processEngineAuthenticationFilter")
  public FilterRegistrationBean<Filter> processEngineAuthenticationFilter() {
    logger.info("Registering ProcessEngineAuthenticationFilter for REST API Basic authentication");

    FilterRegistrationBean<Filter> registration = new FilterRegistrationBean<>();
    registration.setName("orqueio-rest-auth");
    registration.setFilter(new ProcessEngineAuthenticationFilter());
    registration.setOrder(1);

    String restApiPathPattern = restApiPath.endsWith("/*") ? restApiPath : restApiPath + "/*";

    registration.addUrlPatterns(restApiPathPattern);
    logger.info("REST API authentication filter registered for pattern: {}", restApiPathPattern);

    registration.addInitParameter("authentication-provider",
            "io.orqueio.bpm.engine.rest.security.auth.impl.HttpBasicAuthenticationProvider");

    return registration;
  }
}