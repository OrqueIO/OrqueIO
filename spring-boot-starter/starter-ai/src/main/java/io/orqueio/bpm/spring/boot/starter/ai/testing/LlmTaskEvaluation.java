/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. Camunda licenses this file to you under the Apache License,
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
package io.orqueio.bpm.spring.boot.starter.ai.testing;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import io.orqueio.bpm.engine.HistoryService;
import io.orqueio.bpm.engine.ManagementService;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.RuntimeService;
import io.orqueio.bpm.engine.history.HistoricVariableInstance;
import io.orqueio.bpm.engine.impl.cfg.ProcessEngineConfigurationImpl;
import io.orqueio.bpm.engine.impl.history.HistoryLevel;
import io.orqueio.bpm.engine.impl.jobexecutor.JobExecutor;
import io.orqueio.bpm.engine.runtime.Job;
import io.orqueio.bpm.engine.runtime.ProcessInstance;
import io.orqueio.bpm.spring.boot.starter.ai.task.LlmInvalidAnswerException;
import io.orqueio.bpm.spring.boot.starter.ai.task.LlmTaskAuditor;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Evaluates an LLM task's prompt against a set of cases, with the model the application
 * configures: to see whether the answers are still right after a change of prompt, model or
 * provider.
 *
 * <p>Each case starts the process with its variables and runs the LLM task through the
 * engine, exactly as in production: the same instructions, the data sent apart, the output
 * bounds and allowed values. The output fields the task wrote are then compared with the
 * expected ones; numbers are compared by value.
 * <pre>{@code
 * LlmTaskEvaluation.of(processEngine, "claimTriage", "Task_Extract")
 *     .casesFrom("claim-triage-cases.json")
 *     .run()
 *     .assertAllPassed();
 * }</pre>
 *
 * <p>It calls the real model, so it costs tokens and needs the provider's configuration: run it
 * on demand, for example in a test tagged and left out of the default build. It needs:
 * <ul>
 *   <li>the engine's job executor off, so the evaluation runs the LLM task itself;</li>
 *   <li>a history level that keeps variables ({@code audit} or {@code full});</li>
 *   <li>the LLM task's audit on (the default), whose record tells an accepted answer from a refused one.</li>
 * </ul>
 * The rest of the process runs too, up to its next wait state; the instance and its history
 * are then deleted. A case that cannot run is reported as such, and the other cases still run.
 */
public class LlmTaskEvaluation {

  private static final int MAX_JOBS_BEFORE_THE_TASK = 20;

  private static final List<String> CASE_FIELDS = List.of("name", "variables", "expected", "expectInvalidAnswer");

  private final ProcessEngine processEngine;
  private final String processDefinitionKey;
  private final String activityId;
  private final List<LlmEvaluationCase> cases = new ArrayList<>();

  protected LlmTaskEvaluation(ProcessEngine processEngine, String processDefinitionKey, String activityId) {
    this.processEngine = Objects.requireNonNull(processEngine, "processEngine");
    this.processDefinitionKey = Objects.requireNonNull(processDefinitionKey, "processDefinitionKey");
    this.activityId = Objects.requireNonNull(activityId, "activityId");
  }

  /**
   * @param processDefinitionKey the deployed process, in its latest version
   * @param activityId the LLM task to evaluate
   */
  public static LlmTaskEvaluation of(ProcessEngine processEngine, String processDefinitionKey, String activityId) {
    return new LlmTaskEvaluation(processEngine, processDefinitionKey, activityId);
  }

  public LlmTaskEvaluation cases(List<LlmEvaluationCase> cases) {
    this.cases.addAll(cases);
    return this;
  }

  public LlmTaskEvaluation cases(LlmEvaluationCase... cases) {
    return cases(List.of(cases));
  }

  /**
   * Adds the cases of a JSON file on the classpath: a list of {@link LlmEvaluationCase}.
   */
  public LlmTaskEvaluation casesFrom(String classpathResource) {
    InputStream json = Thread.currentThread().getContextClassLoader().getResourceAsStream(classpathResource);
    if (json == null) {
      throw new IllegalArgumentException("No evaluation cases at classpath resource " + classpathResource);
    }
    try (json) {
      // A case may leave expectInvalidAnswer out; a misspelt field is reported rather than ignored
      JsonMapper mapper = JsonMapper.builder()
          .disable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
          .build();
      JsonNode root = mapper.readTree(json);
      if (!root.isArray()) {
        throw new IllegalArgumentException("Expected a list of evaluation cases");
      }
      for (JsonNode evaluationCase : root) {
        for (String field : evaluationCase.propertyNames()) {
          if (!CASE_FIELDS.contains(field)) {
            throw new IllegalArgumentException("Unknown field '" + field + "' in case '" + evaluationCase.path("name").asString("")
                + "'; a case has the fields " + CASE_FIELDS);
          }
        }
      }
      return cases(mapper.treeToValue(root, new TypeReference<List<LlmEvaluationCase>>() { }));
    }
    catch (IOException | RuntimeException e) {
      throw new IllegalArgumentException("Cannot read the evaluation cases of " + classpathResource + ": " + e.getMessage(), e);
    }
  }

  /**
   * Runs every case, one after the other.
   *
   * @throws IllegalStateException when the engine cannot run an evaluation: job executor on,
   *         or a history level that keeps no variables
   */
  public LlmEvaluationReport run() {
    if (cases.isEmpty()) {
      throw new IllegalStateException("No evaluation case: add some with cases(...) or casesFrom(...)");
    }
    checkEngine();
    List<LlmEvaluationReport.CaseResult> results = new ArrayList<>();
    for (LlmEvaluationCase evaluationCase : cases) {
      results.add(evaluate(evaluationCase));
    }
    return new LlmEvaluationReport(processDefinitionKey, activityId, results);
  }

  protected void checkEngine() {
    if (!(processEngine.getProcessEngineConfiguration() instanceof ProcessEngineConfigurationImpl configuration)) {
      return;
    }
    JobExecutor jobExecutor = configuration.getJobExecutor();
    if (jobExecutor != null && jobExecutor.isActive()) {
      throw new IllegalStateException("The engine's job executor is on: it would run the LLM task in place of the "
          + "evaluation. Turn it off, for example with camunda.bpm.job-execution.enabled=false");
    }
    HistoryLevel historyLevel = configuration.getHistoryLevel();
    if (historyLevel != null && historyLevel.getId() < HistoryLevel.HISTORY_LEVEL_AUDIT.getId()) {
      throw new IllegalStateException("The history level '" + historyLevel.getName() + "' keeps no variables: the "
          + "evaluation reads the written fields from the history. Use the history level audit or full");
    }
  }

  protected LlmEvaluationReport.CaseResult evaluate(LlmEvaluationCase evaluationCase) {
    RuntimeService runtimeService = processEngine.getRuntimeService();
    String processInstanceId = null;
    try {
      ProcessInstance instance = runtimeService.startProcessInstanceByKey(processDefinitionKey, evaluationCase.variables());
      processInstanceId = instance.getId();
      TaskRun run = runLlmTask(processInstanceId);
      Map<String, Object> written = writtenVariables(processInstanceId);
      LlmTaskRecord record = LlmTaskRecord.parse(written.get(LlmTaskAuditor.variableName(activityId)));
      return new LlmEvaluationReport.CaseResult(evaluationCase.name(), record.model(),
          differences(evaluationCase, run, written, record));
    }
    catch (RuntimeException e) {
      // One case that cannot run does not lose the results of the others
      return new LlmEvaluationReport.CaseResult(evaluationCase.name(), null,
          List.of("the case could not run: " + e.getMessage()));
    }
    finally {
      delete(processInstanceId);
    }
  }

  protected void delete(String processInstanceId) {
    if (processInstanceId == null) {
      return;
    }
    RuntimeService runtimeService = processEngine.getRuntimeService();
    if (runtimeService.createProcessInstanceQuery().processInstanceId(processInstanceId).count() > 0) {
      runtimeService.deleteProcessInstance(processInstanceId, "LLM task evaluation", true, true);
    }
    // Its history holds the case's data, and the prompt and answer when the audit includes them
    processEngine.getHistoryService().deleteHistoricProcessInstanceIfExists(processInstanceId);
  }

  /**
   * How running the LLM task went: {@code problem} says why it did not run, {@code failure}
   * is what the task threw, both {@code null} when it ran.
   */
  protected record TaskRun(String problem, RuntimeException failure) {

    static final TaskRun RAN = new TaskRun(null, null);

    boolean refusedAnswer() {
      for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
        if (cause instanceof LlmInvalidAnswerException) {
          return true;
        }
      }
      return false;
    }
  }

  /**
   * Runs the instance's jobs up to and including the LLM task's.
   */
  protected TaskRun runLlmTask(String processInstanceId) {
    ManagementService managementService = processEngine.getManagementService();
    for (int i = 0; i < MAX_JOBS_BEFORE_THE_TASK; i++) {
      List<Job> taskJobs = managementService.createJobQuery().processInstanceId(processInstanceId)
          .activityId(activityId).list();
      if (taskJobs.size() > 1) {
        return new TaskRun("the LLM task waits in " + taskJobs.size() + " jobs, as a multi-instance task does: "
            + "evaluate it in a process where it runs once", null);
      }
      Job taskJob = taskJobs.isEmpty() ? null : taskJobs.get(0);
      Job job = taskJob != null ? taskJob
          : managementService.createJobQuery().processInstanceId(processInstanceId).executable().listPage(0, 1)
              .stream().findFirst().orElse(null);
      if (job == null) {
        boolean waiting = managementService.createJobQuery().processInstanceId(processInstanceId).count() > 0;
        return new TaskRun(waiting
            ? "the process waits in a job that is not due yet, such as a timer, before the LLM task"
            : "the LLM task did not wait in a job: it must run asynchronously (asyncBefore)", null);
      }
      try {
        managementService.executeJob(job.getId());
      }
      catch (RuntimeException e) {
        if (taskJob != null) {
          return new TaskRun("the LLM task failed: " + e.getMessage(), e);
        }
        return new TaskRun("a job before the LLM task failed: " + e.getMessage(), null);
      }
      if (taskJob != null) {
        return TaskRun.RAN;
      }
    }
    return new TaskRun("the LLM task was not reached after " + MAX_JOBS_BEFORE_THE_TASK + " jobs", null);
  }

  protected Map<String, Object> writtenVariables(String processInstanceId) {
    HistoryService historyService = processEngine.getHistoryService();
    Map<String, Object> variables = new HashMap<>();
    for (HistoricVariableInstance variable : historyService.createHistoricVariableInstanceQuery()
        .processInstanceId(processInstanceId).list()) {
      variables.put(variable.getName(), variable.getValue());
    }
    return variables;
  }

  protected List<String> differences(LlmEvaluationCase evaluationCase, TaskRun run, Map<String, Object> written,
                                     LlmTaskRecord record) {
    List<String> differences = new ArrayList<>();
    // Without an error code, a refused answer fails the task instead of throwing a BPMN error
    if (run.refusedAnswer()) {
      if (!evaluationCase.expectInvalidAnswer()) {
        differences.add("the answer was refused: " + run.failure().getMessage());
      }
      return differences;
    }
    if (run.problem() != null) {
      differences.add(run.problem());
      return differences;
    }
    if (record.missing()) {
      differences.add("the LLM task left no record, so the evaluation cannot tell an accepted answer from a "
          + "refused one: keep its audit on (camunda.bpm.ai.audit.enabled)");
      return differences;
    }
    if (evaluationCase.expectInvalidAnswer()) {
      if (!record.refused()) {
        differences.add("expected the answer to be refused, but it was accepted"
            + (record.answer() != null ? ": " + record.answer() : ""));
      }
      return differences;
    }
    if (record.refused()) {
      differences.add("the answer was refused (the task threw its BPMN error)"
          + (record.answer() != null ? ": " + record.answer() : ""));
      return differences;
    }
    evaluationCase.expected().forEach((field, expectedValue) -> {
      if (!written.containsKey(field)) {
        differences.add(field + ": expected " + expectedValue + ", not written");
      }
      else if (!sameValue(expectedValue, written.get(field))) {
        Object actual = written.get(field);
        boolean sameKind = expectedValue != null && actual != null && expectedValue.getClass() == actual.getClass();
        differences.add(field + ": expected " + describe(expectedValue, sameKind) + ", got " + describe(actual, sameKind));
      }
    });
    return differences;
  }

  /**
   * Numbers are compared by value, whatever their type (2400 and 2400.0 are the same); other
   * values must be equal and of the same kind, so a number written as text is a difference.
   */
  protected static boolean sameValue(Object expected, Object actual) {
    if (expected instanceof Number && actual instanceof Number) {
      return new BigDecimal(expected.toString()).compareTo(new BigDecimal(actual.toString())) == 0;
    }
    return Objects.equals(expected, actual);
  }

  // When the types differ, text is shown in quotes, so "2400" and 2400 read differently
  private static String describe(Object value, boolean sameKind) {
    return !sameKind && value instanceof String text ? "\"" + text + "\"" : String.valueOf(value);
  }

  /**
   * What the evaluation reads of the LLM task's record, when the audit is on.
   */
  protected record LlmTaskRecord(boolean missing, String model, String outcome, String answer) {

    static LlmTaskRecord parse(Object value) {
      if (!(value instanceof String json)) {
        return new LlmTaskRecord(true, null, null, null);
      }
      try {
        Map<String, Object> record = JsonMapper.builder().build().readValue(json, new TypeReference<Map<String, Object>>() { });
        return new LlmTaskRecord(false, (String) record.get("model"), (String) record.get("outcome"),
            record.get("answer") instanceof String answer ? answer : null);
      }
      catch (RuntimeException e) {
        return new LlmTaskRecord(true, null, null, null);
      }
    }

    boolean refused() {
      return LlmTaskAuditor.Outcome.BPMN_ERROR.name().equals(outcome);
    }
  }

}
