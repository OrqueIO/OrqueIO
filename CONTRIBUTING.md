# Contributing to OrqueIO

We welcome contributions of all kinds to the OrqueIO project. Whether you want to report a bug, request a feature, improve documentation, or contribute code, your efforts help make OrqueIO better for everyone.

* [Ways to contribute](#ways-to-contribute)
* [Browse our issues](#browse-our-issues)
* [Build from source](#build-from-source)
* [Create a pull request](#create-a-pull-request)
* [Contribution checklist](#contribution-checklist)
* [Commit message conventions](#commit-message-conventions)
* [License headers](#license-headers)
* [Review process](#review-process)

---

## Ways to contribute

There are several ways you can contribute to OrqueIO:

### File bugs or feature requests

If you find a bug or would like to request a new feature:

* First, [search existing issues](https://github.com/Orqueio/Orqueio/issues) to see if it is already tracked.
* If not, [create a new issue](https://github.com/Orqueio/Orqueio/issues/new/choose).

When filing an issue, please include:

* A clear description of the problem or request.
* Steps to reproduce (for bugs).
* The environment (e.g., OrqueIO version, modules used).
* Code examples or configuration snippets where applicable.

### Contribute code

You can contribute code that fixes bugs, adds features, or improves existing functionality. The process is:

1. Pick an issue to work on from our [issue tracker](https://github.com/Orqueio/Orqueio/issues).
2. Leave a comment to indicate you are working on it (to avoid duplication).
3. Implement your changes and check them against our [contribution checklist](#contribution-checklist).
4. [Open a pull request](#create-a-pull-request) — you may open it early for feedback, even before the work is complete.

---

## Browse our issues

All development work and requests are tracked in [GitHub Issues](https://github.com/Orqueio/Orqueio/issues).
We use labels to organize issues by type, scope, and priority.

---

## Build from source

OrqueIO uses **Maven** for build and dependency management. To build the project:

```bash
mvn clean install
```

This will build all modules and run unit tests. You can also run the command in a specific module directory to build only that module.

Some modules may require Node.js (e.g., for web applications). To skip building those, run:

```bash
mvn clean install -pl '!webapps,!webapps/assembly,!webapps/assembly-jakarta'
```

---

## Create a pull request

To submit your work:

1. [Fork the OrqueIO repository](https://docs.github.com/en/get-started/quickstart/fork-a-repo).
2. Push your changes to a branch in your fork.
3. [Open a pull request](https://docs.github.com/en/pull-requests) to the `main` branch of OrqueIO.
4. Reference the issue you are addressing in the pull request description.

---

## Contribution checklist

Before submitting your pull request:

* Code follows our style conventions.
* Tests are included for new functionality and bug fixes.
* Commit messages follow our [conventions](#commit-message-conventions).
* Files contain the proper [license header](#license-headers).

---

## Commit message conventions

We follow a structured format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:

* `feat` – New feature
* `fix` – Bug fix
* `docs` – Documentation changes
* `style` – Formatting changes
* `refactor` – Code refactoring
* `test` – Adding or updating tests
* `chore` – Maintenance tasks

**Example**:

```
feat(engine): support BPMN error handling

- adds new validation logic
- updates engine tests accordingly

related to #123
```

---

## License headers

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

## Review process

* New pull requests are reviewed regularly by the maintainers.
* A reviewer will provide feedback and request changes if necessary.
* Once approved, the contribution will be merged into the main branch and included in the next release.

Thank you for contributing to OrqueIO. Your efforts help improve the platform for the entire community.
