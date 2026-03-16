# OrqueIO Platform - Webapps

<p>
  <a href="https://www.orqueio.io/">Home</a> |
  <a href="https://docs.orqueio.io/">Documentation</a> |
  <a href="https://github.com/OrqueIO/OrqueIO/issues">Issues</a>
</p>

Web applications for the OrqueIO BPM Platform, providing administration, process monitoring, and task management interfaces.

## Requirements

* Java 21 or higher
* Node.js >= 22 and npm
* Maven

## Project Structure

| Module               | Description                                                                 |
|----------------------|-----------------------------------------------------------------------------|
| `assembly`           | Java backend (WAR) for the web applications using the `javax` namespace     |
| `assembly-jakarta`   | Java backend (WAR) using the `jakarta` namespace (generated from `assembly` via code transformation) |
| `angular`            | Angular 21 frontend application (TypeScript, NgRx, Chart.js)               |

## Web Applications

The platform provides 4 web applications:

* **Cockpit** - Administration interface for processes, decisions, and incidents
* **Tasklist** - Interface for managing and completing user tasks
* **Admin** - User, group, tenant, and authorization management
* **Welcome** - Landing page and navigation hub

## Technology Stack

### Backend
* JAX-RS 2.1 (REST API)
* Jackson (JSON serialization)
* Jetty 9.4 (javax) / Jetty 11 (jakarta)
* RESTEasy 6.2.x (Jakarta)
* MyBatis 3.5.x (persistence)

### Frontend
* Angular 21 with TypeScript 5.9
* NgRx 21 (state management)
* RxJS 7.8
* Chart.js (data visualization)
* bpmn.js / cmmn.js / dmn.js (process modeling)
* FontAwesome 7

## Getting Started

### Build

Clean, package, and install via Maven:

```sh
cd orqueio-bpm-platform/webapps
mvn clean install
```

### Development Mode

Start the Angular frontend:

```sh
cd orqueio-bpm-platform/webapps/angular
npm install
npm start
```

In a separate terminal, start the backend server:

```sh
cd orqueio-bpm-platform/webapps/assembly
mvn jetty:run -Pdevelop
```

The application is available at [http://localhost:8080/orqueio](http://localhost:8080/orqueio).
Use `jonny1` / `jonny1` to log in as admin.

#### Jakarta Variant

To run with Jakarta EE support, use the `assembly-jakarta` module instead:

```sh
cd orqueio-bpm-platform/webapps/assembly-jakarta
mvn jetty:run -Pdevelop
```

### Adjusting Maven Settings

See the [contribution guide](https://github.com/orqueio/orqueio-bpm-platform/blob/master/CONTRIBUTING.md#build-from-source) for Maven configuration details.

## Plugins

The web applications support extension through plugins. See the [plugin development guide](https://docs.orqueio.io/latest/real-life/how-to/#cockpit-how-to-develop-a-cockpit-plugin) for details.

## Browser Support

* Chrome (latest)
* Firefox (latest)
* Edge (latest)

## Contributing

See the [contribution guide](https://github.com/orqueio/orqueio-bpm-platform/blob/master/CONTRIBUTING.md).

## License

The source files in this repository are made available under the [Apache License Version 2.0](./LICENSE).
