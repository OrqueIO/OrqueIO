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
package io.orqueio.bpm.quarkus.engine.extension.deployment.impl;

import static io.quarkus.deployment.annotations.ExecutionTime.RUNTIME_INIT;

import io.quarkus.arc.deployment.AdditionalBeanBuildItem;
import io.quarkus.arc.deployment.BeanContainerBuildItem;
import io.quarkus.arc.deployment.ContextRegistrationPhaseBuildItem;
import io.quarkus.arc.deployment.ContextRegistrationPhaseBuildItem.ContextConfiguratorBuildItem;
import io.quarkus.arc.deployment.UnremovableBeanBuildItem;
import io.quarkus.arc.runtime.BeanContainer;
import io.quarkus.deployment.annotations.BuildProducer;
import io.quarkus.deployment.annotations.BuildStep;
import io.quarkus.deployment.annotations.Consume;
import io.quarkus.deployment.annotations.Record;
import io.quarkus.deployment.builditem.FeatureBuildItem;
import io.quarkus.deployment.builditem.ShutdownContextBuildItem;
import io.quarkus.runtime.RuntimeValue;
import jakarta.enterprise.context.Dependent;
import io.orqueio.bpm.engine.cdi.BusinessProcess;
import io.orqueio.bpm.engine.cdi.ProcessVariables;
import io.orqueio.bpm.engine.cdi.annotation.BusinessProcessScoped;
import io.orqueio.bpm.engine.cdi.impl.ProcessVariableLocalMap;
import io.orqueio.bpm.engine.cdi.impl.ProcessVariableMap;
import io.orqueio.bpm.engine.cdi.impl.context.DefaultContextAssociationManager;
import io.orqueio.bpm.engine.cdi.impl.context.RequestScopedAssociation;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.quarkus.engine.extension.OrqueioEngineConfig;
import io.orqueio.bpm.quarkus.engine.extension.QuarkusProcessEngineConfiguration;
import io.orqueio.bpm.quarkus.engine.extension.impl.OrqueioEngineRecorder;
import io.orqueio.bpm.quarkus.engine.extension.impl.InjectableBusinessProcessContext;
import org.jboss.jandex.DotName;

public class OrqueioEngineProcessor {

  protected static final String FEATURE = "orqueio-platform-engine";

  @BuildStep
  protected FeatureBuildItem feature() {
    return new FeatureBuildItem(FEATURE);
  }

  @BuildStep
  protected void unremovableBeans(BuildProducer<UnremovableBeanBuildItem> unremovableBeansProducer) {
    unremovableBeansProducer.produce(UnremovableBeanBuildItem.beanTypes(
        RequestScopedAssociation.class,
        QuarkusProcessEngineConfiguration.class
    ));
  }

  @BuildStep
  protected ContextConfiguratorBuildItem registerBusinessProcessScoped(ContextRegistrationPhaseBuildItem phase) {
    return new ContextConfiguratorBuildItem(phase.getContext()
        .configure(BusinessProcessScoped.class)
        .normal()
        .contextClass(InjectableBusinessProcessContext.class));
  }

  @BuildStep
  protected void additionalBeans(BuildProducer<AdditionalBeanBuildItem> additionalBeansProducer) {
    additionalBeansProducer.produce(
        AdditionalBeanBuildItem.builder()
            .setDefaultScope(DotName.createSimple(Dependent.class.getName()))
            .addBeanClasses(
                DefaultContextAssociationManager.class,
                BusinessProcess.class,
                ProcessVariableLocalMap.class,
                ProcessVariables.class,
                ProcessVariableMap.class
            ).build());
  }

  @BuildStep
  @Record(RUNTIME_INIT)
  protected void cdiConfig(OrqueioEngineRecorder recorder, BeanContainerBuildItem beanContainer) {
    recorder.configureProcessEngineCdiBeans(beanContainer.getValue());
  }

  @Consume(AdditionalBeanBuildItem.class)
  @BuildStep
  @Record(RUNTIME_INIT)
  protected void processEngineConfiguration(OrqueioEngineRecorder recorder,
                                            BeanContainerBuildItem beanContainerBuildItem,
                                            OrqueioEngineConfig orqueioEngineConfig,
                                            BuildProducer<ProcessEngineConfigurationBuildItem> configurationProducer) {

    BeanContainer beanContainer = beanContainerBuildItem.getValue();
    recorder.configureProcessEngineCdiBeans(beanContainer);
    RuntimeValue<ProcessEngineConfigurationImpl> processEngineConfiguration =
        recorder.createProcessEngineConfiguration(beanContainer, orqueioEngineConfig);
    configurationProducer.produce(new ProcessEngineConfigurationBuildItem(processEngineConfiguration));
  }

  @BuildStep
  @Record(RUNTIME_INIT)
  protected void processEngine(OrqueioEngineRecorder recorder,
                               ProcessEngineConfigurationBuildItem processEngineConfigurationBuildItem,
                               BuildProducer<ProcessEngineBuildItem> processEngineProducer) {

    RuntimeValue<ProcessEngineConfigurationImpl> processEngineConfiguration =
        processEngineConfigurationBuildItem.getProcessEngineConfiguration();
    processEngineProducer.produce(new ProcessEngineBuildItem(
        recorder.createProcessEngine(processEngineConfiguration)));
  }

  @Consume(ProcessEngineBuildItem.class)
  @BuildStep
  @Record(RUNTIME_INIT)
  protected void deployProcessEngineResources(OrqueioEngineRecorder recorder) {
    recorder.fireOrqueioEngineStartEvent();
  }

  @BuildStep
  @Record(RUNTIME_INIT)
  protected void shutdown(OrqueioEngineRecorder recorder,
                ProcessEngineBuildItem processEngine,
                ShutdownContextBuildItem shutdownContext) {

    recorder.registerShutdownTask(shutdownContext, processEngine.getProcessEngine());
  }
}
