# camunda commons

[![Maven Central](https://maven-badges.herokuapp.com/maven-central/io.orqueio.commons/orqueio-commons-bom/badge.svg)](https://maven-badges.herokuapp.com/maven-central/io.orqueio.commons/orqueio-commons-bom)


orqueio commons is a collection of shared libraries used by camunda open source projects.

## List of libraries

* [orqueio commons logging][logging]
* [orqueio commons utils][utils]
* [orqueio-bpm-platform][typed-values]


## Getting started

If your project is a maven project, start by importing the `orqueio-commons-bom`.
This will ensure that your project uses all commons libraries in the same version:

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>io.orqueio.commons</groupId>
      <artifactId>orqueio-commons-bom</artifactId>
      <version>${version}</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

Now you can reference individual commons projects:

```xml
<dependency>
  <groupId>io.orqueio.commons</groupId>
  <artifactId>orqueio-commons-logging</artifactId>
</dependency>
```

## FAQ

### Which Java (JRE) Version is required?

Java JRE 11+ is required.

## Contributing

Have a look at our [contribution guide](https://github.com/orqueio/orqueio/blob/master/CONTRIBUTING.md) for how to contribute to this repository.


## License:

The source files in this repository are made available under the <a href="LICENSE">Apache License, Version 2.0</a>.

[logging]: logging/
[utils]: utils/
[typed-values]: typed-values/
