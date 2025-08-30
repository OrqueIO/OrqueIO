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
package io.orqueio.bpm.spring.boot.starter.plugin;

import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.cfg.ProcessEnginePlugin;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;

public class ApplicationContextClassloaderSwitchPlugin implements ProcessEnginePlugin, ApplicationContextAware {

  protected ClassLoader applicationContextClassloader;

  @Override
  public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
    applicationContextClassloader = applicationContext.getClassLoader();
  }

  @Override
  public void preInit(ProcessEngineConfigurationImpl processEngineConfiguration) {
    processEngineConfiguration.setClassLoader(applicationContextClassloader);
  }

  @Override
  public void postInit(ProcessEngineConfigurationImpl processEngineConfiguration) {
  }

  @Override
  public void postProcessEngineBuild(ProcessEngine processEngine) {
  }

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }

}
