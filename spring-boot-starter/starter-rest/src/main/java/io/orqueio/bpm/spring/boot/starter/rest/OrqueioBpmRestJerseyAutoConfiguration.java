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

import io.orqueio.bpm.engine.rest.impl.FetchAndLockContextListener;
import io.orqueio.bpm.spring.boot.starter.OrqueioBpmAutoConfiguration;
import io.orqueio.bpm.spring.boot.starter.property.OrqueioBpmProperties;
import jakarta.servlet.ServletRegistration;
import org.glassfish.jersey.server.ResourceConfig;
import org.glassfish.jersey.servlet.ServletContainer;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@AutoConfigureAfter(OrqueioBpmAutoConfiguration.class)
public class OrqueioBpmRestJerseyAutoConfiguration {

  @Bean
  public ResourceConfig jerseyResourceConfig() {
    return new OrqueioJerseyResourceConfig();
  }

  @Bean
  public FetchAndLockContextListener getFetchAndLockContextListener() {
    return new FetchAndLockContextListener();
  }

  @Bean
  public FetchAndLockContextListener fetchAndLockContextListener() {
    return new FetchAndLockContextListener();
  }
}


