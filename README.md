# OrqueIO - The open source BPMN platform

[![Maven Central](https://maven-badges.herokuapp.com/maven-central/io.orqueio.bpm/orqueio-parent/badge.svg)](https://maven-badges.herokuapp.com/maven-central/io.orqueio.bpm/orqueio-parent) [![orqueio manual](https://img.shields.io/badge/manual-latest-brown.svg)](https://docs.orqueio.io) [![License](https://img.shields.io/github/license/orqueio/orqueio?color=blue&logo=apache)](https://github.com/orqueio/orqueio/blob/master/LICENSE)


OrqueIO is a flexible framework for workflow and process automation. Its core is a native BPMN 2.0 process engine that runs inside the Java Virtual Machine. It can be embedded inside any Java application and any Runtime Container. It integrates with Java EE 6 and is a perfect match for the Spring Framework. On top of the process engine, you can choose from a stack of tools for human workflow management, operations and monitoring.

- Web Site: https://www.orqueio.io/
- Getting Started: https://docs.orqueio.io/
- Issue Tracker: https://github.com/orqueio/orqueio/issues
- Contribution Guidelines: https://github.com/OrqueIO/OrqueIO/blob/master/CONTRIBUTING.md

## Components

OrqueIO provides a rich set of components centered around the BPM lifecycle.

#### Process Implementation and Execution

- OrqueIO Engine - The core component responsible for executing BPMN 2.0 processes.
- REST API - The REST API provides remote access to running processes.
- Spring, CDI Integration - Programming model integration that allows developers to write Java Applications that interact with running processes.


#### Process Operations

- OrqueIO Engine - JMX and advanced Runtime Container Integration for process engine monitoring.
- OrqueIO Cockpit - Web application tool for process operations.
- OrqueIO Admin - Web application for managing users, groups, and their access permissions.

#### Human Task Management

- OrqueIO Tasklist - Web application for managing and completing user tasks in the context of processes.

#### And there's more...

- [bpmn.io](https://bpmn.io/) - Toolkits for BPMN, CMMN, and DMN in JavaScript (rendering, modeling)
## A Framework

In contrast to other vendor BPM platforms, OrqueIO strives to be highly integrable and embeddable. We seek to deliver a great experience to developers that want to use BPM technology in their projects.

### Highly Integrable

Out of the box, OrqueIO provides infrastructure-level integration with Java EE Application Servers and Servlet Containers.

### Embeddable

Most of the components that make up the platform can even be completely embedded inside an application. For instance, you can add the process engine and the REST API as a library to your application and assemble your custom BPM platform configuration.

## Contributing

Please see our [contribution guidelines](CONTRIBUTING.md) for how to raise issues and how to contribute code to our project.

## Tests

To run the tests in this repository, please see our [testing tips and tricks](TESTING.md).


## License

The source files in this repository are made available under the [Apache License Version 2.0](./LICENSE).

Camunda is a registered trademark of Camunda Services GmbH.
OrqueIO is an independent project, not affiliated with, authorized by, or sponsored by Camunda Services GmbH.
