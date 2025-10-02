This is a distribution of

       Orqueio Platform v${project.version}

visit
       http://docs.orqueio.io/

The Orqueio Platform is a dual-license Java-based framework.
This particular copy of the Orqueio Platform is released either
under the Apache License 2.0 (Community Platform) OR a commercial
license agreement (Enterprise Platform).

License information can be found in the LICENSE file.
 
The Orqueio Platform includes libraries developed by third
parties. For license and attribution notices for these libraries,
please refer to the documentation that accompanies this distribution
(see the LICENSE_BOOK-${project.version} file).

The packaged Apache Tomcat server is licensed under 
the Apache License v2.0 license.

==================

Contents:

  lib/
        This directory contains the java libraries for application 
        development.

  server/
        This directory contains a preconfigured distribution 
        of Apache Tomcat with Orqueio Platform readily
        installed. 

        run the
            server/apache-tomcat-${version.tomcat}/bin/startup.{bat/sh}
        script to start up the the server.

        After starting the server, you can access the 
        following web applications:

        http://localhost:8080/orqueio
        http://localhost:8080/engine-rest

  sql/
        This directory contains the create and upgrade sql script
        for the different databases.
        The engine create script contain the engine and history tables.

        Execute the current upgrade script to make the database compatible
        with the newest Orqueio Platform release.

==================

Orqueio Platform version: ${project.version}
Apache Tomcat Server version: ${version.tomcat}

=================
