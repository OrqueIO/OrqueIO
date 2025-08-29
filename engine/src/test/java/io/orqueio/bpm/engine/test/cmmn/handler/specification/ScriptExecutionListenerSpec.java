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
package io.orqueio.bpm.engine.test.cmmn.handler.specification;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import io.orqueio.bpm.engine.delegate.BaseDelegateExecution;
import io.orqueio.bpm.engine.delegate.DelegateListener;
import io.orqueio.bpm.engine.impl.cmmn.listener.ScriptCaseExecutionListener;
import io.orqueio.bpm.engine.impl.scripting.ExecutableScript;
import io.orqueio.bpm.model.cmmn.CmmnModelInstance;
import io.orqueio.bpm.model.cmmn.instance.orqueio.OrqueioCaseExecutionListener;
import io.orqueio.bpm.model.cmmn.instance.orqueio.OrqueioScript;

public class ScriptExecutionListenerSpec extends AbstractExecutionListenerSpec {

  //could be configurable
  protected static final String SCRIPT_FORMAT = "io.orqueio.bpm.test.caseexecutionlistener.ABC";

  public ScriptExecutionListenerSpec(String eventName) {
    super(eventName);
  }

  protected void configureCaseExecutionListener(CmmnModelInstance modelInstance, OrqueioCaseExecutionListener listener) {
    OrqueioScript script = SpecUtil.createElement(modelInstance, listener, null, OrqueioScript.class);
    String scriptValue = "${myScript}";
    script.setOrqueioScriptFormat(SCRIPT_FORMAT);
    script.setTextContent(scriptValue);
  }

  public void verifyListener(DelegateListener<? extends BaseDelegateExecution> listener) {
    assertTrue(listener instanceof ScriptCaseExecutionListener);

    ScriptCaseExecutionListener scriptListener = (ScriptCaseExecutionListener) listener;
    ExecutableScript executableScript = scriptListener.getScript();
    assertNotNull(executableScript);
    assertEquals(SCRIPT_FORMAT, executableScript.getLanguage());
  }

}
