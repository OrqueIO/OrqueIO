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
package io.orqueio.bpm.engine.cdi.test.impl.context;

import java.util.Arrays;

import io.orqueio.bpm.engine.cdi.BusinessProcess;
import io.orqueio.bpm.engine.cdi.test.CdiProcessEngineTestCase;
import io.orqueio.bpm.engine.test.Deployment;
import org.jboss.arquillian.junit.Arquillian;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * @author Daniel Meyer
 *
 */
@RunWith(Arquillian.class)
public class MultiInstanceTest extends CdiProcessEngineTestCase {

  @Test
  @Deployment
  public void testParallelMultiInstanceServiceTasks() {

    BusinessProcess businessProcess = getBeanInstance(BusinessProcess.class);
    businessProcess.setVariable("list", Arrays.asList("1","2"));
    businessProcess.startProcessByKey("miParallelScriptTask");

  }

}
