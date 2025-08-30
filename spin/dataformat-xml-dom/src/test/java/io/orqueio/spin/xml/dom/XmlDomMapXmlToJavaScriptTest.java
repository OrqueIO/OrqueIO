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
package io.orqueio.spin.xml.dom;

import static io.orqueio.spin.xml.XmlTestConstants.EXAMPLE_VALIDATION_XML_FILE_NAME;
import static io.orqueio.spin.xml.XmlTestConstants.assertIsExampleOrder;

import io.orqueio.spin.impl.test.Script;
import io.orqueio.spin.impl.test.ScriptTest;
import io.orqueio.spin.impl.test.ScriptVariable;
import io.orqueio.spin.xml.SpinXmlDataFormatException;
import io.orqueio.spin.xml.mapping.Order;
import org.junit.Test;

/**
 * @author Stefan Hentschel.
 */
public abstract class XmlDomMapXmlToJavaScriptTest extends ScriptTest {

  @Test
  @Script
  @ScriptVariable(name = "input", file = EXAMPLE_VALIDATION_XML_FILE_NAME)
  public void shouldMapXmlToJava() {
    Order order = script.getVariable("order");
    assertIsExampleOrder(order);
  }

  @Test(expected = SpinXmlDataFormatException.class)
  @Script(execute = false)
  @ScriptVariable(name = "input", file = EXAMPLE_VALIDATION_XML_FILE_NAME)
  public void shouldFailMappingMalformedTypeString() throws Throwable {
    failingWithException();
  }

}