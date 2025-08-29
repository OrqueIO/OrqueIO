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
package io.orqueio.bpm.engine.impl.form.handler;

import io.orqueio.bpm.engine.delegate.Expression;
import io.orqueio.bpm.engine.form.StartFormData;
import io.orqueio.bpm.engine.impl.form.OrqueioFormRefImpl;
import io.orqueio.bpm.engine.impl.form.FormDefinition;
import io.orqueio.bpm.engine.impl.form.StartFormDataImpl;
import io.orqueio.bpm.engine.impl.persistence.entity.ExecutionEntity;
import io.orqueio.bpm.engine.impl.persistence.entity.ProcessDefinitionEntity;
import io.orqueio.bpm.engine.variable.VariableMap;


/**
 * @author Tom Baeyens
 */
public class DefaultStartFormHandler extends DefaultFormHandler implements StartFormHandler {

  public StartFormData createStartFormData(ProcessDefinitionEntity processDefinition) {
    StartFormDataImpl startFormData = new StartFormDataImpl();

    FormDefinition startFormDefinition = processDefinition.getStartFormDefinition();
    Expression formKey = startFormDefinition.getFormKey();
    Expression orqueioFormDefinitionKey = startFormDefinition.getOrqueioFormDefinitionKey();
    String orqueioFormDefinitionBinding = startFormDefinition.getOrqueioFormDefinitionBinding();
    Expression orqueioFormDefinitionVersion = startFormDefinition.getOrqueioFormDefinitionVersion();

    if (formKey != null) {
      startFormData.setFormKey(formKey.getExpressionText());
    } else if (orqueioFormDefinitionKey != null && orqueioFormDefinitionBinding != null) {
      OrqueioFormRefImpl ref = new OrqueioFormRefImpl(orqueioFormDefinitionKey.getExpressionText(), orqueioFormDefinitionBinding);
      if (orqueioFormDefinitionBinding.equals(FORM_REF_BINDING_VERSION) && orqueioFormDefinitionVersion != null) {
        ref.setVersion(Integer.parseInt(orqueioFormDefinitionVersion.getExpressionText()));
      }
      startFormData.setOrqueioFormRef(ref);
    }

    startFormData.setDeploymentId(deploymentId);
    startFormData.setProcessDefinition(processDefinition);
    initializeFormProperties(startFormData, null);
    initializeFormFields(startFormData, null);
    return startFormData;
  }

  public ExecutionEntity submitStartFormData(ExecutionEntity processInstance, VariableMap properties) {
    submitFormVariables(properties, processInstance);
    return processInstance;
  }
}
