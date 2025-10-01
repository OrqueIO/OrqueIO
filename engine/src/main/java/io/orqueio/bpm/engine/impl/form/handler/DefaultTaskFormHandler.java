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
package io.orqueio.bpm.engine.impl.form.handler;

import io.orqueio.bpm.engine.delegate.Expression;
import io.orqueio.bpm.engine.form.TaskFormData;
import io.orqueio.bpm.engine.impl.form.OrqueioFormRefImpl;
import io.orqueio.bpm.engine.impl.form.FormDefinition;
import io.orqueio.bpm.engine.impl.form.TaskFormDataImpl;
import io.orqueio.bpm.engine.impl.persistence.entity.TaskEntity;
import io.orqueio.bpm.engine.impl.task.TaskDefinition;


/**
 * @author Tom Baeyens
 */
public class DefaultTaskFormHandler extends DefaultFormHandler implements TaskFormHandler {

  public TaskFormData createTaskForm(TaskEntity task) {
    TaskFormDataImpl taskFormData = new TaskFormDataImpl();

    TaskDefinition taskDefinition = task.getTaskDefinition();

    FormDefinition formDefinition = taskDefinition.getFormDefinition();
    Expression formKey = formDefinition.getFormKey();
    Expression orqueioFormDefinitionKey = formDefinition.getOrqueioFormDefinitionKey();
    String orqueioFormDefinitionBinding = formDefinition.getOrqueioFormDefinitionBinding();
    Expression orqueioFormDefinitionVersion = formDefinition.getOrqueioFormDefinitionVersion();

    if (formKey != null) {
      Object formValue = formKey.getValue(task);
      if (formValue != null) {
        taskFormData.setFormKey(formValue.toString());
      }
    } else if (orqueioFormDefinitionKey != null && orqueioFormDefinitionBinding != null) {
      Object formRefKeyValue = orqueioFormDefinitionKey.getValue(task);
      if(formRefKeyValue != null) {
        OrqueioFormRefImpl ref = new OrqueioFormRefImpl(formRefKeyValue.toString(), orqueioFormDefinitionBinding);
        if(orqueioFormDefinitionBinding.equals(FORM_REF_BINDING_VERSION) && orqueioFormDefinitionVersion != null) {
          Object formRefVersionValue = orqueioFormDefinitionVersion.getValue(task);
          if(formRefVersionValue != null) {
            ref.setVersion(Integer.parseInt((String)formRefVersionValue));
          }
        }
        taskFormData.setOrqueioFormRef(ref);
      }
    }

    taskFormData.setDeploymentId(deploymentId);
    taskFormData.setTask(task);
    initializeFormProperties(taskFormData, task.getExecution());
    initializeFormFields(taskFormData, task.getExecution());
    return taskFormData;
  }

}
