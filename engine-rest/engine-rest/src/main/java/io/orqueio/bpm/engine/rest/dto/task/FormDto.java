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
package io.orqueio.bpm.engine.rest.dto.task;

import io.orqueio.bpm.engine.form.OrqueioFormRef;
import io.orqueio.bpm.engine.form.FormData;

/**
 *
 * @author nico.rehwaldt
 */
public class FormDto {

  private String key;
  private OrqueioFormRef orqueioFormRef;
  private String contextPath;

  public void setKey(String form) {
    this.key = form;
  }

  public String getKey() {
    return key;
  }

  public OrqueioFormRef getOrqueioFormRef() {
    return orqueioFormRef;
  }

  public void setOrqueioFormRef(OrqueioFormRef orqueioFormRef) {
    this.orqueioFormRef = orqueioFormRef;
  }

  public void setContextPath(String contextPath) {
    this.contextPath = contextPath;
  }

  public String getContextPath() {
    return contextPath;
  }

  public static FormDto fromFormData(FormData formData) {
    FormDto dto = new FormDto();

    if (formData != null) {
      dto.key = formData.getFormKey();
      dto.orqueioFormRef = formData.getOrqueioFormRef();
    }

    return dto;
  }
}
