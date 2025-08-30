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
package io.orqueio.bpm.integrationtest.functional.spin.dataformat;

import io.orqueio.spin.impl.json.jackson.format.JacksonJsonDataFormat;
import io.orqueio.spin.spi.DataFormatConfigurator;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.joda.JodaModule;

/**
 * @author Thorben Lindhauer
 *
 */
public class JodaJsonDataFormatConfigurator implements DataFormatConfigurator<JacksonJsonDataFormat> {

  @Override
  public Class<JacksonJsonDataFormat> getDataFormatClass() {
    return JacksonJsonDataFormat.class;
  }

  @Override
  public void configure(JacksonJsonDataFormat dataFormat) {
    ObjectMapper objectMapper = dataFormat.getObjectMapper();

    objectMapper.registerModule(new JodaModule());
    objectMapper.configure(com.fasterxml.jackson.databind.SerializationFeature.
        WRITE_DATES_AS_TIMESTAMPS , false);
  }

}
