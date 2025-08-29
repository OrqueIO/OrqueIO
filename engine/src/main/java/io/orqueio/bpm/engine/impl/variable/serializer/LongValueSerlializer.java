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
package io.orqueio.bpm.engine.impl.variable.serializer;

import io.orqueio.bpm.engine.variable.Variables;
import io.orqueio.bpm.engine.variable.impl.value.UntypedValueImpl;
import io.orqueio.bpm.engine.variable.type.ValueType;
import io.orqueio.bpm.engine.variable.value.LongValue;

/**
 * @author Tom Baeyens
 * @author Daniel Meyer
 */
public class LongValueSerlializer extends PrimitiveValueSerializer<LongValue> {

  public LongValueSerlializer() {
    super(ValueType.LONG);
  }

  public LongValue convertToTypedValue(UntypedValueImpl untypedValue) {
    return Variables.longValue((Long) untypedValue.getValue(), untypedValue.isTransient());
  }

  public LongValue readValue(ValueFields valueFields, boolean asTransientValue) {
    return Variables.longValue(valueFields.getLongValue(), asTransientValue);
  }

  public void writeValue(LongValue value, ValueFields valueFields) {

    final Long longValue = value.getValue();

    valueFields.setLongValue(longValue);

    if (longValue!=null) {
      valueFields.setTextValue(longValue.toString());
    }
    else {
      valueFields.setTextValue(null);
    }
  }

}
