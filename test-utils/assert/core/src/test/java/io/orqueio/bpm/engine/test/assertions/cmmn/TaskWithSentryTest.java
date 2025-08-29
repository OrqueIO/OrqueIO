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
package io.orqueio.bpm.engine.test.assertions.cmmn;

import static io.orqueio.bpm.engine.test.assertions.cmmn.CmmnAwareTests.assertThat;
import static io.orqueio.bpm.engine.test.assertions.cmmn.CmmnAwareTests.caseExecution;
import static io.orqueio.bpm.engine.test.assertions.cmmn.CmmnAwareTests.caseService;

import io.orqueio.bpm.engine.runtime.CaseInstance;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.ProcessEngineRule;
import io.orqueio.bpm.engine.test.assertions.helpers.ProcessAssertTestCase;
import org.junit.Rule;
import org.junit.Test;

public class TaskWithSentryTest extends ProcessAssertTestCase {

	public static final String TASK_A = "PI_HT_A";
	public static final String TASK_B = "PI_HT_B";
	public static final String CASE_KEY = "Case_TaskWithSentryTests";

	@Rule
	public ProcessEngineRule processEngineRule = new ProcessEngineRule();

	@Test
	@Deployment(resources = { "cmmn/TaskWithSentryTest.cmmn" })
	public void task_b_should_be_available() {
		// Given
		CaseInstance caseInstance = caseService().createCaseInstanceByKey(CASE_KEY);
		// Then
		assertThat(caseExecution(TASK_A, caseInstance)).isActive();
		// And
		assertThat(caseExecution(TASK_B, caseInstance)).isAvailable();
	}

}
