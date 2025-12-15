/*
 * Copyright OrqueIO and/or licensed to OrqueIO
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. OrqueIO licenses this file to you under the Apache License,
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
package io.orqueio.bpm.spring.boot.starter.security.oauth2.impl;

import org.springframework.boot.autoconfigure.condition.ConditionMessage;
import org.springframework.boot.autoconfigure.condition.ConditionOutcome;
import org.springframework.boot.autoconfigure.condition.SpringBootCondition;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;

import java.util.Collections;
import java.util.Map;

/**
 * Condition that matches if {@code spring.security.oauth2.client.registration} properties are defined.
 */
public class ClientsConfiguredCondition extends SpringBootCondition {

    private static final String OAUTH2_CLIENTS_PROPERTY = "spring.security.oauth2.client.registration";
    private static final Bindable<Map<String, Object>> STRING_OBJECT_MAP = Bindable.mapOf(String.class, Object.class);

    @Override
    public ConditionOutcome getMatchOutcome(ConditionContext context, AnnotatedTypeMetadata metadata) {
        ConditionMessage.Builder message = ConditionMessage.forCondition("OAuth2 Clients Configured");

        Map<String, Object> registrations = Binder.get(context.getEnvironment())
                .bind(OAUTH2_CLIENTS_PROPERTY, STRING_OBJECT_MAP)
                .orElse(Collections.emptyMap());

        if (!registrations.isEmpty()) {
            return ConditionOutcome.match(message.foundExactly("OAuth2 client registrations"));
        }
        return ConditionOutcome.noMatch(message.didNotFind("OAuth2 client registrations").atAll());
    }
}