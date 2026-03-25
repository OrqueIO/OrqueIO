# OrqueIO - The Open Source BPMN Platform

[![Maven Central Version](https://img.shields.io/maven-central/v/io.orqueio.bpm/orqueio-parent?label=Maven%20Central)](https://central.sonatype.com/artifact/io.orqueio.bpm/orqueio-parent) [![orqueio manual](https://img.shields.io/badge/manual-latest-brown.svg)](https://docs.orqueio.io) [![License](https://img.shields.io/github/license/orqueio/orqueio?color=blue&logo=apache)](https://github.com/orqueio/orqueio/blob/master/LICENSE)

OrqueIO is a flexible framework for workflow and process automation. Its core is a native BPMN 2.0 process engine that runs inside the Java Virtual Machine. It can be embedded inside any Java application and any Runtime Container. It integrates with Java EE 6 and is a perfect match for the Spring Framework. On top of the process engine, you can choose from a stack of tools for human workflow management, operations and monitoring.

- Web Site: https://www.orqueio.io/
- Getting Started: https://docs.orqueio.io/
- Issue Tracker: https://github.com/orqueio/orqueio/issues
- Contribution Guidelines: https://github.com/OrqueIO/OrqueIO/blob/master/CONTRIBUTING.md

---

## Table of Contents

- [Components](#components)
- [Authentication & SSO](#authentication--sso)
- [Frontend - Angular 21](#frontend---angular-21)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [Tests](#tests)
- [License](#license)

---

## Components

OrqueIO provides a rich set of components centered around the BPM lifecycle.

### Process Implementation and Execution

- **OrqueIO Engine** - The core component responsible for executing BPMN 2.0 processes.
- **REST API** - The REST API provides remote access to running processes.
- **Spring / CDI Integration** - Programming model integration that allows developers to write Java applications that interact with running processes.

### Process Operations

- **OrqueIO Engine** - JMX and advanced Runtime Container Integration for process engine monitoring.
- **OrqueIO Cockpit** - Web application tool for process operations.
- **OrqueIO Admin** - Web application for managing users, groups, and their access permissions.

### Human Task Management

- **OrqueIO Tasklist** - Web application for managing and completing user tasks in the context of processes.

### Additional Tooling

- [bpmn.io](https://bpmn.io/) - Toolkits for BPMN, CMMN, and DMN in JavaScript (rendering, modeling)

---

## Authentication & SSO

OrqueIO supports Single Sign-On (SSO) with the following identity providers:

| Identity Provider | Status |
|-------------------|--------|
| Google            | Available |
| Keycloak          | Available |
| GitHub            | Available |
| Okta              | Available |
| Auth0             | Available |

---

## Frontend - Angular 21

The OrqueIO web applications (Cockpit, Admin, Tasklist) are built with **Angular 21**.

### Prerequisites

- **Node.js** >= 22
- **npm** >= 10

### Key Features

- **Standalone Components** - The application uses Angular's standalone component architecture, removing the need for NgModules.
- **Signal-based Reactivity** - Leverages Angular Signals for efficient state management and change detection.
- **Built-in Control Flow** - Uses `@if`, `@for`, and `@switch` template syntax instead of structural directives.
- **Zoneless Change Detection** - Runs without Zone.js for improved performance.
- **esbuild** - Uses the esbuild-based build system for fast compilation and bundling.

### Development

```bash
cd webapps/angular
npm install
npm start
```

The development server runs at `http://localhost:4200` with hot module replacement enabled.

### Build

```bash
npm run build
```

The production build outputs to `dist/` with optimized bundles.

---

## Architecture

OrqueIO is designed to be highly integrable and embeddable, unlike traditional vendor BPM platforms.

### Highly Integrable

Out of the box, OrqueIO provides infrastructure-level integration with Java EE Application Servers and Servlet Containers.

### Embeddable

Most of the components that make up the platform can be completely embedded inside an application. For instance, you can add the process engine and the REST API as a library to your application and assemble your custom BPM platform configuration.

### Project Modules

| Module | Description |
|--------|-------------|
| `engine/` | Core BPMN 2.0 process engine |
| `engine-dmn/` | DMN (Decision Model and Notation) support |
| `engine-rest/` | REST API |
| `engine-spring/` | Spring Framework integration |
| `engine-cdi/` | CDI integration |
| `engine-plugins/` | Plugin system |
| `spring-boot-starter/` | Spring Boot starter |
| `quarkus-extension/` | Quarkus extension |
| `webapps/` | Web applications (Cockpit, Admin, Tasklist) |
| `model-api/` | Model API definitions |
| `database/` | Database support |
| `clients/` | Client libraries |
| `examples/` | Example implementations |

---

## Getting Started

```bash
git clone https://github.com/orqueio/orqueio.git
cd orqueio
./mvnw clean install
```

For detailed documentation, visit [docs.orqueio.io](https://docs.orqueio.io/).

---

## Contributing

Please see our [contribution guidelines](CONTRIBUTING.md) for how to raise issues and how to contribute code to our project.

## Tests

To run the tests in this repository, please see our [testing tips and tricks](TESTING.md).

---

## License

The source files in this repository are made available under the [Apache License Version 2.0](./LICENSE).

Camunda is a registered trademark of Camunda Services GmbH.
OrqueIO is an independent project, not affiliated with, authorized by, or sponsored by Camunda Services GmbH.
