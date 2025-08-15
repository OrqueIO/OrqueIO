# OrqueIO External Task Client (Java)


> Are you looking for the Spring Boot External Task Client? This way please: [Spring Boot External Task Client](../../spring-boot-starter/starter-client)

The **orqueio External Task Client (Java)** allows to set up remote Service Tasks for your workflow.

## Features
* Complete External Tasks
* Extend the lock duration of External Tasks
* Unlock External Tasks
* Report BPMN errors as well as failures
* Share primitive and object typed process variables with the Workflow Engine


## Configuration options
* The client can be configured with the fluent api of the [ExternalTaskClientBuilder](client/src/main/java/io/orqueio/bpm/client/ExternalTaskClientBuilder.java).
* The topic subscription can be configured with the fluent api of the [TopicSubscriptionBuilder](client/src/main/java/io/orqueio/bpm/client/topic/TopicSubscriptionBuilder.java).

## Prerequisites
* Java (supported version by the used OrqueIO)
* OrqueIO

## Maven coordinates
The following Maven coordinate needs to be added to the projects `pom.xml`:
```xml
<dependency>
  <groupId>io.orqueio.bpm</groupId>
  <artifactId>orqueio-external-task-client</artifactId>
  <version>${version}</version>
</dependency>
```

## Contributing

Have a look at our [contribution guide](https://github.com/orqueio/orqueio/blob/master/CONTRIBUTING.md) for how to contribute to this repository.


## License
The source files in this repository are made available under the [Apache License Version 2.0](./LICENSE).
