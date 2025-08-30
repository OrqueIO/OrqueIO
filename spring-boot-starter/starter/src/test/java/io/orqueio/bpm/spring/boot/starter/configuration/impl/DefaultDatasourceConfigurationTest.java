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

import static org.junit.Assert.assertSame;
import static org.mockito.Mockito.mock;

import javax.sql.DataSource;

import io.orqueio.bpm.engine.spring.SpringProcessEngineConfiguration;
import io.orqueio.bpm.spring.boot.starter.property.OrqueioBpmProperties;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.springframework.jdbc.datasource.TransactionAwareDataSourceProxy;
import org.springframework.transaction.PlatformTransactionManager;

@RunWith(MockitoJUnitRunner.class)
public class DefaultDatasourceConfigurationTest {

  @Mock
  private PlatformTransactionManager platformTransactionManager;

  private OrqueioBpmProperties orqueioBpmProperties;

  @InjectMocks
  private DefaultDatasourceConfiguration defaultDatasourceConfiguration;

  private SpringProcessEngineConfiguration configuration;

  @Before
  public void before() {
    configuration = new SpringProcessEngineConfiguration();
    orqueioBpmProperties = new OrqueioBpmProperties();
    defaultDatasourceConfiguration.orqueioBpmProperties = orqueioBpmProperties;
  }

  @Test
  public void transactionManagerTest() {
    defaultDatasourceConfiguration.dataSource = mock(DataSource.class);
    defaultDatasourceConfiguration.preInit(configuration);
    assertSame(platformTransactionManager, configuration.getTransactionManager());
  }

  @Test
  public void orqueioTransactionManagerTest() {
    defaultDatasourceConfiguration.dataSource = mock(DataSource.class);
    PlatformTransactionManager orqueioTransactionManager = mock(PlatformTransactionManager.class);
    defaultDatasourceConfiguration.orqueioTransactionManager = orqueioTransactionManager;
    defaultDatasourceConfiguration.preInit(configuration);
    assertSame(orqueioTransactionManager, configuration.getTransactionManager());
  }

  @Test
  public void defaultDataSourceTest() {
    DataSource datasourceMock = mock(DataSource.class);
    defaultDatasourceConfiguration.dataSource = datasourceMock;
    defaultDatasourceConfiguration.preInit(configuration);
    assertSame(datasourceMock, getDataSourceFromConfiguration());
  }

  @Test
  public void orqueioDataSourceTest() {
    DataSource orqueioDatasourceMock = mock(DataSource.class);
    defaultDatasourceConfiguration.orqueioDataSource = orqueioDatasourceMock;
    defaultDatasourceConfiguration.dataSource = mock(DataSource.class);
    defaultDatasourceConfiguration.preInit(configuration);
    assertSame(orqueioDatasourceMock, getDataSourceFromConfiguration());
  }

  private DataSource getDataSourceFromConfiguration() {
    return ((TransactionAwareDataSourceProxy) configuration.getDataSource()).getTargetDataSource();
  }
}
