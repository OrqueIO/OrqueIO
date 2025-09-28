# Orque IO - The open source BPMN platform

[![Maven Central](https://maven-badges.herokuapp.com/maven-central/io.orqueio.bpm/camunda-parent/badge.svg)](https://maven-badges.herokuapp.com/maven-central/io.orqueio.bpm/camunda-parent) [![camunda manual latest](https://img.shields.io/badge/manual-latest-brown.svg)](https://docs.camunda.org/manual/latest/) [![License](https://img.shields.io/github/license/camunda/camunda-bpm-platform?color=blue&logo=apache)](https://github.com/camunda/camunda-bpm-platform/blob/master/LICENSE) [![Forum](https://img.shields.io/badge/forum-camunda-green)](https://forum.camunda.org/)


Orque IO is a flexible framework for workflow and process automation. Its core is a native BPMN 2.0 process engine that runs inside the Java Virtual Machine. It can be embedded inside any Java application and any Runtime Container. It integrates with Java EE 6 and is a perfect match for the Spring Framework. On top of the process engine, you can choose from a stack of tools for human workflow management, operations and monitoring.

- Web Site: https://www.orqueio.io/
- Getting Started: https://docs.orqueio.io/
- User Forum: https://forum.camunda.org/
- Issue Tracker: https://github.com/orqueio/orqueio/issues
- Contribution Guidelines: https://orqueio.io/contribute/

## Components

Orque IO provides a rich set of components centered around the BPM lifecycle.

#### Process Implementation and Execution

- Orque IO Engine - The core component responsible for executing BPMN 2.0 processes.
- REST API - The REST API provides remote access to running processes.
- Spring, CDI Integration - Programming model integration that allows developers to write Java Applications that interact with running processes.

#### Process Design

- Camunda Modeler - A [standalone desktop application](https://github.com/camunda/camunda-modeler) that allows business users and developers to design & configure processes.

#### Process Operations

- Camunda Engine - JMX and advanced Runtime Container Integration for process engine monitoring.
- Camunda Cockpit - Web application tool for process operations.
- Camunda Admin - Web application for managing users, groups, and their access permissions.

#### Human Task Management

- Camunda Tasklist - Web application for managing and completing user tasks in the context of processes.

#### And there's more...

- [bpmn.io](https://bpmn.io/) - Toolkits for BPMN, CMMN, and DMN in JavaScript (rendering, modeling)
- [Community Extensions](https://docs.camunda.org/manual/7.5/introduction/extensions/) - Extensions on top of Orque IO provided and maintained by our great open source community

## A Framework

In contrast to other vendor BPM platforms, Orque IO strives to be highly integrable and embeddable. We seek to deliver a great experience to developers that want to use BPM technology in their projects.

### Highly Integrable

Out of the box, Orque IO provides infrastructure-level integration with Java EE Application Servers and Servlet Containers.

### Embeddable

Most of the components that make up the platform can even be completely embedded inside an application. For instance, you can add the process engine and the REST API as a library to your application and assemble your custom BPM platform configuration.

## Contributing

Please see our [contribution guidelines](CONTRIBUTING.md) for how to raise issues and how to contribute code to our project.

## Tests

To run the tests in this repository, please see our [testing tips and tricks](TESTING.md).


## License

The source files in this repository are made available under the [Apache License Version 2.0](./LICENSE).

Orque IO uses and includes third-party dependencies published under various licenses. By downloading and using Orque IO artifacts, you agree to their terms and conditions. Refer to https://docs.camunda.org/manual/latest/introduction/third-party-libraries/ for an overview of third-party libraries and particularly important third-party licenses we want to make you aware of.
