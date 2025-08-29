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
package io.orqueio.bpm.engine.test.api.variables;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static io.orqueio.bpm.engine.test.util.TypedValueAssert.assertObjectValueDeserialized;
import static io.orqueio.bpm.engine.test.util.TypedValueAssert.assertObjectValueSerializedJava;
import static io.orqueio.bpm.engine.variable.Variables.objectValue;
import static io.orqueio.bpm.engine.variable.Variables.serializedObjectValue;
import static org.junit.Assert.assertEquals;

import java.io.ByteArrayOutputStream;
import java.io.ObjectOutputStream;

import io.orqueio.bpm.engine.ProcessEngineException;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.TaskService;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.digest._apacheCommonsCodec.Base64;
import io.orqueio.bpm.engine.impl.util.StringUtil;
import io.orqueio.bpm.engine.impl.variable.serializer.JavaObjectSerializer;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.engine.task.Task;
import io.orqueio.bpm.engine.test.Deployment;
import io.orqueio.bpm.engine.test.util.ProcessEngineBootstrapRule;
import io.orqueio.bpm.engine.test.util.ProcessEngineTestRule;
import io.orqueio.bpm.engine.test.util.ProvidedProcessEngineRule;
import io.orqueio.bpm.engine.variable.Variables;
import io.orqueio.bpm.engine.variable.value.ObjectValue;
import io.orqueio.bpm.engine.variable.value.TypedValue;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;

/**
 * @author Svetlana Dorokhova
 */
public class JavaSerializationProhibitedTest {

  protected static final String ONE_TASK_PROCESS = "io/orqueio/bpm/engine/test/api/variables/oneTaskProcess.bpmn20.xml";

  protected static final String JAVA_DATA_FORMAT = Variables.SerializationDataFormats.JAVA.getName();

  @ClassRule
  public static ProcessEngineBootstrapRule bootstrapRule = new ProcessEngineBootstrapRule();

  protected ProvidedProcessEngineRule engineRule = new ProvidedProcessEngineRule(bootstrapRule);
  public ProcessEngineTestRule testRule = new ProcessEngineTestRule(engineRule);

  @Rule
  public RuleChain ruleChain = RuleChain.outerRule(engineRule).around(testRule);

  private RuntimeService runtimeService;
  private TaskService taskService;

  @Before
  public void init() {
    runtimeService = engineRule.getRuntimeService();
    taskService = engineRule.getTaskService();
    ((ProcessEngineConfigurationImpl) engineRule.getProcessEngine().getProcessEngineConfiguration())
        .getVariableSerializers()
        .addSerializer(new JavaCustomSerializer());
  }

  //still works for normal objects (not serialized)
  @Test
  @Deployment(resources = ONE_TASK_PROCESS)
  public void testSetJavaObject() throws Exception {
    ProcessInstance instance = runtimeService.startProcessInstanceByKey("oneTaskProcess");

    JavaSerializable javaSerializable = new JavaSerializable("foo");
    runtimeService.setVariable(instance.getId(), "simpleBean", objectValue(javaSerializable).serializationDataFormat(JAVA_DATA_FORMAT).create());

    // validate untyped value
    JavaSerializable value = (JavaSerializable) runtimeService.getVariable(instance.getId(), "simpleBean");

    assertEquals(javaSerializable, value);

    // validate typed value
    ObjectValue typedValue = runtimeService.getVariableTyped(instance.getId(), "simpleBean");
    assertObjectValueDeserialized(typedValue, javaSerializable);
    assertObjectValueSerializedJava(typedValue, javaSerializable);
  }

  @Test
  @Deployment(resources = ONE_TASK_PROCESS)
  public void testSetJavaObjectSerialized() throws Exception {
    ProcessInstance instance = runtimeService.startProcessInstanceByKey("oneTaskProcess");

    JavaSerializable javaSerializable = new JavaSerializable("foo");

    ByteArrayOutputStream baos = new ByteArrayOutputStream();
    new ObjectOutputStream(baos).writeObject(javaSerializable);
    String serializedObject = StringUtil.fromBytes(Base64.encodeBase64(baos.toByteArray()), engineRule.getProcessEngine());

    // when/then
    assertThatThrownBy(() -> runtimeService.setVariable(instance.getId(), "simpleBean",
        serializedObjectValue(serializedObject)
        .serializationDataFormat(JAVA_DATA_FORMAT)
        .objectTypeName(JavaSerializable.class.getName())
        .create()))
      .isInstanceOf(ProcessEngineException.class)
      .hasMessageContaining("Cannot set variable with name simpleBean. Java serialization format is prohibited");

  }

  @Test
  @Deployment(resources = ONE_TASK_PROCESS)
  public void testSetJavaObjectSerializedEmptySerializationDataFormat() throws Exception {
    ProcessInstance instance = runtimeService.startProcessInstanceByKey("oneTaskProcess");

    JavaSerializable javaSerializable = new JavaSerializable("foo");

    ByteArrayOutputStream baos = new ByteArrayOutputStream();
    new ObjectOutputStream(baos).writeObject(javaSerializable);
    String serializedObject = StringUtil.fromBytes(Base64.encodeBase64(baos.toByteArray()), engineRule.getProcessEngine());

    // when/then
    assertThatThrownBy(() -> runtimeService.setVariable(instance.getId(), "simpleBean",
      serializedObjectValue(serializedObject)
        .objectTypeName(JavaSerializable.class.getName())
        .create()))
      .isInstanceOf(ProcessEngineException.class)
      .hasMessageContaining("Cannot set variable with name simpleBean. Java serialization format is prohibited");

  }

  @Test
  public void testStandaloneTaskTransientVariableSerializedObject() {
    Task task = taskService.newTask();
    task.setName("gonzoTask");
    taskService.saveTask(task);
    String taskId = task.getId();

    try {
      // when/then
      assertThatThrownBy(() -> taskService.setVariable(taskId, "instrument",
        Variables.serializedObjectValue("any value")
          .serializationDataFormat(Variables.SerializationDataFormats.JAVA)
          .setTransient(true)
          .create()))
        .isInstanceOf(ProcessEngineException.class)
        .hasMessageContaining("Cannot set variable with name instrument. Java serialization format is prohibited");
    } finally {
      taskService.deleteTask(taskId, true);
    }

  }

  private class JavaCustomSerializer extends JavaObjectSerializer {

    @Override
    protected boolean canWriteValue(TypedValue typedValue) {
      //do NOT check serializationDataFormat
      return true;
    }
  }
}
