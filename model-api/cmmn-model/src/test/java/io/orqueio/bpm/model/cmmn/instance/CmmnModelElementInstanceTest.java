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
package io.orqueio.bpm.model.cmmn.instance;

import io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants;
import io.orqueio.bpm.model.cmmn.util.GetCmmnModelElementTypeRule;
import io.orqueio.bpm.model.xml.test.AbstractModelElementInstanceTest;
import org.junit.BeforeClass;
import org.junit.ClassRule;

/**
 * @author Roman Smirnov
 *
 */
public abstract class CmmnModelElementInstanceTest extends AbstractModelElementInstanceTest {

  @ClassRule
  public static final GetCmmnModelElementTypeRule modelElementTypeRule = new GetCmmnModelElementTypeRule();

  @BeforeClass
  public static void initModelElementType() {
    initModelElementType(modelElementTypeRule);
  }

  public String getDefaultNamespace() {
    return CmmnModelConstants.CMMN11_NS;
  }

}
