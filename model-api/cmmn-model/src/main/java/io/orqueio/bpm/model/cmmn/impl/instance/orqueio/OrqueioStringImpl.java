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
package io.orqueio.bpm.model.cmmn.impl.instance.orqueio;

import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CAMUNDA_ELEMENT_STRING;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CAMUNDA_NS;

import io.orqueio.bpm.model.cmmn.impl.instance.CmmnModelElementInstanceImpl;
import io.orqueio.bpm.model.cmmn.instance.orqueio.OrqueioString;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.impl.instance.ModelTypeInstanceContext;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder;
import io.orqueio.bpm.model.xml.type.ModelElementTypeBuilder.ModelTypeInstanceProvider;

/**
 * @author Roman Smirnov
 *
 */
public class OrqueioStringImpl extends CmmnModelElementInstanceImpl implements OrqueioString {

  public static void registerType(ModelBuilder modelBuilder) {
    ModelElementTypeBuilder typeBuilder = modelBuilder.defineType(OrqueioString.class, CAMUNDA_ELEMENT_STRING)
      .namespaceUri(CAMUNDA_NS)
      .instanceProvider(new ModelTypeInstanceProvider<OrqueioString>() {
        public OrqueioString newInstance(ModelTypeInstanceContext instanceContext) {
          return new OrqueioStringImpl(instanceContext);
        }
      });

    typeBuilder.build();
  }

  public OrqueioStringImpl(ModelTypeInstanceContext instanceContext) {
    super(instanceContext);
  }

}
