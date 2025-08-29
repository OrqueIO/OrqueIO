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
package io.orqueio.spin.plugin.variable.value.impl.builder;

import io.orqueio.bpm.engine.variable.value.SerializationDataFormat;
import io.orqueio.spin.json.SpinJsonNode;
import io.orqueio.spin.plugin.variable.value.JsonValue;
import io.orqueio.spin.plugin.variable.value.builder.JsonValueBuilder;
import io.orqueio.spin.plugin.variable.value.impl.JsonValueImpl;

/**
 * @author Roman Smirnov
 *
 */
public class JsonValueBuilderImpl extends SpinValueBuilderImpl<JsonValue> implements JsonValueBuilder {

  public JsonValueBuilderImpl(JsonValue value) {
    super(value);
  }

  public JsonValueBuilderImpl(String value) {
    this(new JsonValueImpl(value));
  }

  public JsonValueBuilderImpl(SpinJsonNode value) {
    this(new JsonValueImpl(value));
  }

  public JsonValueBuilder serializationDataFormat(SerializationDataFormat dataFormat) {
    return (JsonValueBuilderImpl) super.serializationDataFormat(dataFormat);
  }

  public JsonValueBuilder serializationDataFormat(String dataFormatName) {
    return (JsonValueBuilderImpl) super.serializationDataFormat(dataFormatName);
  }

}
