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

import jakarta.ws.rs.ApplicationPath;
import io.orqueio.bpm.engine.rest.impl.OrqueioRestResources;
import org.glassfish.jersey.jackson.JacksonFeature;
import org.glassfish.jersey.server.ResourceConfig;
import org.slf4j.Logger;
import org.springframework.beans.factory.InitializingBean;

@ApplicationPath("/engine-rest")
public class OrqueioJerseyResourceConfig extends ResourceConfig implements InitializingBean {

  private static final Logger log = org.slf4j.LoggerFactory.getLogger(OrqueioJerseyResourceConfig.class);

  @Override
  public void afterPropertiesSet() throws Exception {
    registerOrqueioRestResources();
    registerAdditionalResources();
  }

  protected void registerOrqueioRestResources() {
    log.info("Configuring orqueio rest api.");

    this.registerClasses(OrqueioRestResources.getResourceClasses());
    this.registerClasses(OrqueioRestResources.getConfigurationClasses());
    this.register(JacksonFeature.class);

    log.info("Finished configuring orqueio rest api.");
  }

  protected void registerAdditionalResources() {

  }

}
