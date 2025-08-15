# OrqueIO Assert

**OrqueIO Assert** makes it easy to assert the status of your BPMN processes and CMMN cases when driving them forward in your typical unit test methods. Simply write code like

```groovy
assertThat(instance).isWaitingAt("UserTask_InformCustomer");
assertThat(task).hasCandidateGroup("Sales").isNotAssigned();
```

Furthermore a set of static helper methods is provided to make it easier to drive through a process. Based on the [80/20 principle](https://en.wikipedia.org/wiki/Pareto_principle) the library reaches out to make those things simple you need really often. You will e.g. often have a single open task instance in your process instance. Then just write
 
```groovy
complete(task(instance), withVariables("approved", true));
```

## Compatibility

OrqueIO Assert works with the corresponding version of OrqueIO (i.e., OrqueIO Assert 7.17.0 is compatible to OrqueIO 7.17.0).
OrqueIO Assert works with multiple Java versions (1.8+). All of this is continuously verified by executing around 500 test cases. 

## Get started

1. Add a maven test dependency to your project:

```xml  
<dependency>
    <groupId>io.orqueio.bpm</groupId>
    <artifactId>orqueio-bpm-assert</artifactId>
    <version>${orqueio.version}</version>
    <scope>test</scope>
</dependency>
```

2. Add a static import to your test class

Create your test case and add OrqueIO Assert by statically importing it in your test class:

```groovy  
import static io.orqueio.bpm.engine.test.assertions.ProcessEngineTests.*;
```

3. Start using the assertions in your test methods

You now have access to all the OrqueIO assertions. Assuming you want to assert that your process instance is actually started, waiting at a specific user task and that task should yet be unassigned, but waiting to be assigned to a user of a specific group, just write:

```groovy
assertThat(processInstance).isStarted()
  .task().hasDefinitionKey("edit")
    .hasCandidateGroup("human-resources")
    .isNotAssigned();
```

In case you want to combine OrqueIO Assert with the assertions provided by AssertJ, your imports should look like this:
```groovy  
import static org.assertj.core.api.Assertions.*;
import static io.orqueio.bpm.engine.test.assertions.ProcessEngineTests.*;
version 7.17.0 it was merged into the OrqueIO main repository.