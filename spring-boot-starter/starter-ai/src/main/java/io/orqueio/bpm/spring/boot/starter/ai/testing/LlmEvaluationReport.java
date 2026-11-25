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

import java.util.List;
import java.util.stream.Collectors;

/**
 * The result of an LLM task evaluation: which cases passed, and for the others what differed.
 * Its {@link #toString()} is the readable report.
 */
public class LlmEvaluationReport {

  private final String processDefinitionKey;
  private final String activityId;
  private final List<CaseResult> results;

  LlmEvaluationReport(String processDefinitionKey, String activityId, List<CaseResult> results) {
    this.processDefinitionKey = processDefinitionKey;
    this.activityId = activityId;
    this.results = List.copyOf(results);
  }

  public List<CaseResult> results() {
    return results;
  }

  public long passed() {
    return results.stream().filter(CaseResult::passed).count();
  }

  public boolean allPassed() {
    return passed() == results.size();
  }

  /**
   * @throws AssertionError with the report, when a case did not pass
   */
  public LlmEvaluationReport assertAllPassed() {
    if (!allPassed()) {
      throw new AssertionError(this.toString());
    }
    return this;
  }

  @Override
  public String toString() {
    String models = results.stream().map(CaseResult::model).filter(model -> model != null)
        .distinct().collect(Collectors.joining(", "));
    StringBuilder report = new StringBuilder()
        .append("LLM task evaluation of ").append(processDefinitionKey).append(" / ").append(activityId)
        .append(models.isEmpty() ? "" : " with " + models).append(": ")
        .append(passed()).append(" of ").append(results.size()).append(" cases passed");
    for (CaseResult result : results) {
      report.append('\n').append(result.passed() ? "  [ok] " : "  [KO] ").append(result.name());
      for (String difference : result.differences()) {
        report.append("\n         ").append(difference);
      }
    }
    return report.toString();
  }

  /**
   * @param name the case's name
   * @param model the model that answered, when the call was recorded
   * @param differences what did not match, empty when the case passed
   */
  public record CaseResult(String name, String model, List<String> differences) {

    public CaseResult {
      differences = List.copyOf(differences);
    }

    public boolean passed() {
      return differences.isEmpty();
    }
  }

}
