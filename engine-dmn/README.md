# OrqueIO DMN Engine

Lightweight Execution Engine for DMN (Decision Model and Notation) written in Java.

<p>
  <a href="https://www.orqueio.io/">Home</a> |
  <a href="https://docs.orqueio.io/">Documentation</a> |
  <a href="https://github.com/OrqueIO/OrqueIO/issues">Issues</a>
</p>

The Decision Engine can be used seamlessly in combination with BPMN and CMMN or standalone.

## Requirements

* Java 21 or higher

## Standalone Usage

Add the following Maven Coordinates to your project:

```xml
<dependency>
  <groupId>io.orqueio.bpm.dmn</groupId>
  <artifactId>orqueio-engine-dmn</artifactId>
  <version>${version.orqueio}</version>
</dependency>
```

Now you can use the DMN engine inside your Java Code:

```java
public class DmnApp {

  public static void main(String[] args) {

    // configure and build the DMN engine
    DmnEngine dmnEngine = DmnEngineConfiguration
        .createDefaultDmnEngineConfiguration()
        .buildEngine();

    // parse a decision
    DmnDecision decision = dmnEngine.parseDecision("orderDecision", "CheckOrder.dmn");

    Map<String, Object> data = new HashMap<>();
    data.put("status", "gold");
    data.put("sum", 354.12d);

    // evaluate a decision
    DmnDecisionTableResult result = dmnEngine.evaluateDecisionTable(decision, data);

  }

}
```

## Use DMN Engine for implementing a BPMN Business Rule Task

Add the following Maven Coordinates to your project:

```xml
<dependency>
  <groupId>io.orqueio.bpm</groupId>
  <artifactId>orqueio-engine</artifactId>
  <version>${version.orqueio}</version>
</dependency>
<dependency>
  <groupId>com.h2database</groupId>
  <artifactId>h2</artifactId>
  <version>2.3.232</version>
  <scope>test</scope>
</dependency>
```

Next, reference a DMN decision from a BPMN Business Rule Task:

```xml
<bpmn:businessRuleTask id="assignApprover"
  orqueio:decisionRef="invoice-assign-approver"
  orqueio:resultVariable="approverGroups"
  name="Assign Approver Group(s)">
</bpmn:businessRuleTask>
```

The `orqueio:decisionRef` attribute references the id of the decision in the DMN file:

```xml
<dmn:decision id="invoice-assign-approver" name="Assign Approver">
  ...
</dmn:decision>
```

Now you can start the BPMN process inside your application:

```java
public class App {

  public static void main(String[] args) {

    ProcessEngine processEngine = ProcessEngineConfiguration
        .createStandaloneInMemProcessEngineConfiguration()
        .buildProcessEngine();

    try {
      processEngine.getRepositoryService()
        .createDeployment()
        .name("invoice deployment")
        .addClasspathResource("invoice.bpmn")
        .addClasspathResource("assign-approver-groups.dmn")
        .deploy();

      processEngine.getRuntimeService()
        .startProcessInstanceByKey("invoice", createVariables()
            .putValue("invoiceNumber", "2323"));
    }
    finally {
      processEngine.close();
    }
  }
}
```

## License

The source files in this repository are made available under the [Apache License Version 2.0](../LICENSE).
