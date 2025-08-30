/*
 * Copyright TOADDLATERCCS and/or licensed to TOADDLATERCCS
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. TOADDLATERCCS this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.orqueio.bpm.spring.boot.starter.configuration.impl;

import javax.sql.DataSource;

import io.orqueio.bpm.engine.spring.SpringProcessEngineConfiguration;
import io.orqueio.bpm.spring.boot.starter.configuration.OrqueioDatasourceConfiguration;
import io.orqueio.bpm.spring.boot.starter.property.DatabaseProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.util.StringUtils;

public class DefaultDatasourceConfiguration extends AbstractOrqueioConfiguration implements OrqueioDatasourceConfiguration {

  @Autowired
  protected PlatformTransactionManager transactionManager;

  @Autowired(required = false)
  @Qualifier("orqueioBpmTransactionManager")
  protected PlatformTransactionManager orqueioTransactionManager;

  @Autowired
  protected DataSource dataSource;

  @Autowired(required = false)
  @Qualifier("orqueioBpmDataSource")
  protected DataSource orqueioDataSource;

  @Override
  public void preInit(SpringProcessEngineConfiguration configuration) {
    final DatabaseProperty database = orqueioBpmProperties.getDatabase();

    if (orqueioTransactionManager == null) {
      configuration.setTransactionManager(transactionManager);
    } else {
      configuration.setTransactionManager(orqueioTransactionManager);
    }

    if (orqueioDataSource == null) {
      configuration.setDataSource(dataSource);
    } else {
      configuration.setDataSource(orqueioDataSource);
    }

    configuration.setDatabaseType(database.getType());
    configuration.setDatabaseSchemaUpdate(database.getSchemaUpdate());

    if (!StringUtils.isEmpty(database.getTablePrefix())) {
      configuration.setDatabaseTablePrefix(database.getTablePrefix());
    }

    if(!StringUtils.isEmpty(database.getSchemaName())) {
      configuration.setDatabaseSchema(database.getSchemaName());
    }

    configuration.setJdbcBatchProcessing(database.isJdbcBatchProcessing());
  }

  public PlatformTransactionManager getTransactionManager() {
    return transactionManager;
  }

  public void setTransactionManager(PlatformTransactionManager transactionManager) {
    this.transactionManager = transactionManager;
  }

  public PlatformTransactionManager getOrqueioTransactionManager() {
    return orqueioTransactionManager;
  }

  public void setOrqueioTransactionManager(PlatformTransactionManager orqueioTransactionManager) {
    this.orqueioTransactionManager = orqueioTransactionManager;
  }

  public DataSource getDataSource() {
    return dataSource;
  }

  public void setDataSource(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  public DataSource getOrqueioDataSource() {
    return orqueioDataSource;
  }

  public void setOrqueioDataSource(DataSource orqueioDataSource) {
    this.orqueioDataSource = orqueioDataSource;
  }

}
