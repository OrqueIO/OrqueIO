/*
 * Copyright Toaddlaterccs and/or licensed to Toaddlaterccs
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. Toaddlaterccs this file to you under the Apache License,
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
package io.orqueio.bpm.model.bpmn.builder;

import io.orqueio.bpm.model.bpmn.BpmnModelInstance;
import io.orqueio.bpm.model.bpmn.instance.BaseElement;
import io.orqueio.bpm.model.bpmn.instance.orqueio.OrqueioFormField;

/**
 * @author Kristin Polenz
 *
 */
public class AbstractOrqueioFormFieldBuilder<P, B extends AbstractOrqueioFormFieldBuilder<P, B>> 
  extends AbstractBpmnModelElementBuilder<B, OrqueioFormField> {

  protected BaseElement parent;

  protected AbstractOrqueioFormFieldBuilder(BpmnModelInstance modelInstance, BaseElement parent, OrqueioFormField element, Class<?> selfType) {
    super(modelInstance, element, selfType);
    this.parent = parent;
  }
  

  /**
   * Sets the form field id.
   *
   * @param id the form field id
   * @return  the builder object
   */
  public B orqueioId(String id) {
    element.setOrqueioId(id);
    return myself;
  }

  /**
   * Sets form field label.
   *
   * @param label the form field label
   * @return  the builder object
   */
  public B orqueioLabel(String label) {
    element.setOrqueioLabel(label);;
    return myself;
  }

  /**
   * Sets the form field type.
   *
   * @param type the form field type
   * @return the builder object
   */
  public B orqueioType(String type) {
    element.setOrqueioType(type);
    return myself;
  }

  /**
   * Sets the form field default value.
   *
   * @param defaultValue the form field default value
   * @return the builder object
   */
  public B orqueioDefaultValue(String defaultValue) {
    element.setOrqueioDefaultValue(defaultValue);
    return myself;
  }

  /**
   * Finishes the building of a form field.
   *
   * @return the parent activity builder
   */
  @SuppressWarnings({ "unchecked" })
  public P orqueioFormFieldDone() {
    return (P) parent.builder();
  }
}
