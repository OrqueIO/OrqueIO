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
package io.orqueio.spin.plugin.variable;

import io.orqueio.spin.json.SpinJsonNode;
import io.orqueio.spin.plugin.variable.value.builder.JsonValueBuilder;
import io.orqueio.spin.plugin.variable.value.builder.XmlValueBuilder;
import io.orqueio.spin.plugin.variable.value.impl.builder.JsonValueBuilderImpl;
import io.orqueio.spin.plugin.variable.value.impl.builder.XmlValueBuilderImpl;
import io.orqueio.spin.xml.SpinXmlElement;

/**
 * @author Roman Smirnov
 *
 */
public class SpinValues {

  public static JsonValueBuilder jsonValue(SpinJsonNode value) {
    return jsonValue(value, false);
  }

  public static JsonValueBuilder jsonValue(String value) {
    return jsonValue(value, false);
  }

  public static JsonValueBuilder jsonValue(SpinJsonNode value, boolean isTransient) {
    return (JsonValueBuilder) new JsonValueBuilderImpl(value).setTransient(isTransient);
  }

  public static JsonValueBuilder jsonValue(String value, boolean isTransient) {
    return (JsonValueBuilder) new JsonValueBuilderImpl(value).setTransient(isTransient);
  }

  public static XmlValueBuilder xmlValue(SpinXmlElement value) {
    return xmlValue(value, false);
  }

  public static XmlValueBuilder xmlValue(String value) {
    return xmlValue(value, false);
  }

  public static XmlValueBuilder xmlValue(SpinXmlElement value, boolean isTransient) {
    return (XmlValueBuilder) new XmlValueBuilderImpl(value).setTransient(isTransient);
  }

  public static XmlValueBuilder xmlValue(String value, boolean isTransient) {
    return (XmlValueBuilder) new XmlValueBuilderImpl(value).setTransient(isTransient);
  }
}
