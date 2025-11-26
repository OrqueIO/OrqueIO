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
package io.orqueio.bpm.spring.boot.starter.security.oidc;

import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.spring.boot.starter.security.common.UniversalAuthenticationProperties;
import io.orqueio.bpm.spring.boot.starter.util.SpringBootProcessEnginePlugin;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


public class UniversalOIDCIdentityProviderPlugin extends SpringBootProcessEnginePlugin {

    private static final Logger logger = LoggerFactory.getLogger(UniversalOIDCIdentityProviderPlugin.class);

    private final UniversalAuthenticationProperties authProperties;

    /**
     * @param authProperties
     */
    public UniversalOIDCIdentityProviderPlugin(UniversalAuthenticationProperties authProperties) {
        this.authProperties = authProperties;
        logger.debug("UniversalOIDCIdentityProviderPlugin created with properties: mode={}, autoCreateUsers={}, syncGroups={}",
            authProperties.getMode(),
            authProperties.isAutoCreateUsers(),
            authProperties.isSyncGroups());
    }

    /**
     * @param processEngineConfiguration 
     */
    @Override
    public void preInit(ProcessEngineConfigurationImpl processEngineConfiguration) {
        super.preInit(processEngineConfiguration);

        logger.info("Registering UniversalOIDCIdentityProviderFactory with process engine");

        processEngineConfiguration.setIdentityProviderSessionFactory(
            new UniversalOIDCIdentityProviderFactory(authProperties)
        );

        logger.info("UniversalOIDCIdentityProviderFactory registered successfully");
    }
}
