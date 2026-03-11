# Contributing to OrqueIO

We welcome contributions of all kinds to the OrqueIO project. Whether you want to report a bug, request a feature, improve documentation, or contribute code, your efforts help make OrqueIO better for everyone.

---

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Build from Source](#build-from-source)
- [How to Contribute](#how-to-contribute)
  - [Report Bugs or Request Features](#report-bugs-or-request-features)
  - [Contribute Code](#contribute-code)
  - [Browse Issues](#browse-issues)
- [Development Workflow](#development-workflow)
  - [Fork and Clone](#fork-and-clone)
  - [Create a Pull Request](#create-a-pull-request)
  - [Contribution Checklist](#contribution-checklist)
- [Conventions](#conventions)
  - [Commit Message Format](#commit-message-format)
  - [License Headers](#license-headers)
- [Review Process](#review-process)

---

## Getting Started

### Prerequisites

| Tool    | Version |
|---------|---------|
| Java    | 17+     |
| Maven   | 3.9+    |
| Node.js | 22+ (for web applications) |
| npm     | 10+     |

### Build from Source

Build all modules and run unit tests:

```bash
mvn clean install
```

To skip web application modules (if you don't have Node.js):

```bash
mvn clean install -pl '!webapps,!webapps/assembly,!webapps/assembly-jakarta'
```

---

## How to Contribute

### Report Bugs or Request Features

1. [Search existing issues](https://github.com/Orqueio/Orqueio/issues) to check if it is already tracked.
2. If not, [create a new issue](https://github.com/Orqueio/Orqueio/issues/new/choose).

When filing an issue, please include:

- A clear description of the problem or request.
- Steps to reproduce (for bugs).
- The environment (OrqueIO version, modules used).
- Code examples or configuration snippets where applicable.

### Contribute Code

1. Pick an issue from the [issue tracker](https://github.com/Orqueio/Orqueio/issues).
2. Leave a comment to indicate you are working on it (to avoid duplication).
3. Implement your changes following the [contribution checklist](#contribution-checklist).
4. [Open a pull request](#create-a-pull-request) — you may open it early for feedback, even before the work is complete.

### Browse Issues

All work is tracked in [GitHub Issues](https://github.com/Orqueio/Orqueio/issues). We use labels to organize issues by type, scope, and priority.

---

## Development Workflow

### Fork and Clone

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/<your-username>/OrqueIO.git
cd OrqueIO

# 3. Add the upstream remote
git remote add upstream https://github.com/Orqueio/OrqueIO.git
```

### Create a Pull Request

1. Create a feature branch from `main`.
2. Push your changes to your fork.
3. [Open a pull request](https://docs.github.com/en/pull-requests) targeting the `main` branch.
4. Reference the related issue in the PR description.

### Contribution Checklist

Before submitting your pull request, verify that:

- [ ] Code follows the project's style conventions.
- [ ] Tests are included for new functionality and bug fixes.
- [ ] All existing tests pass (`mvn clean install`).
- [ ] Commit messages follow the [conventions](#commit-message-format).
- [ ] Source files contain the proper [license header](#license-headers).

---

## Conventions

### Commit Message Format

We follow a structured commit message format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

| Type       | Description              |
|------------|--------------------------|
| `feat`     | New feature              |
| `fix`      | Bug fix                  |
| `docs`     | Documentation changes    |
| `style`    | Formatting changes       |
| `refactor` | Code refactoring         |
| `test`     | Adding or updating tests |
| `chore`    | Maintenance tasks        |

**Example:**

```
feat(engine): support BPMN error handling

- adds new validation logic
- updates engine tests accordingly

related to #123
```

### License Headers

Each source file must include the Apache 2.0 license header:

```
Copyright OrqueIO contributors
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## Review Process

- New pull requests are reviewed regularly by the maintainers.
- A reviewer will provide feedback and request changes if necessary.
- Once approved, the contribution will be merged into the main branch and included in the next release.

---

Thank you for contributing to OrqueIO!
