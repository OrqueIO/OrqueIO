/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. Camunda licenses this file to you under the Apache License,
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
package io.orqueio.bpm.run.test.config.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import io.orqueio.bpm.engine.IdentityService;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.identity.User;
import io.orqueio.bpm.engine.identity.UserQuery;
import io.orqueio.bpm.identity.impl.ldap.plugin.LdapIdentityProviderPlugin;
import io.orqueio.bpm.run.OrqueioBpmRun;
import io.orqueio.bpm.run.property.OrqueioBpmRunLdapProperties;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit4.SpringRunner;

@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@RunWith(SpringRunner.class)
@SpringBootTest(classes = { OrqueioBpmRun.class })
@ActiveProfiles(profiles = { "test-auth-disabled", "test-demo-user" })
public class DemoUserConfigurationTest {

  @Autowired
  ProcessEngine engine;
  IdentityService identityService;

  @Autowired(required = false)
  OrqueioBpmRunLdapProperties props;

  @Autowired(required = false)
  LdapIdentityProviderPlugin ldapPlugin;

  @Before
  public void init() {
    identityService = engine.getIdentityService();
  }

  @Test
  public void shouldFindDemoUser() {
    // given
    UserQuery userQuery = identityService.createUserQuery();

    // when
    long userCount = userQuery.count();
    List<User> userList = userQuery.list();

    // then
    assertThat(userCount).isEqualTo(1);
    String userId = userList.get(0).getId();
    assertThat(userId).isEqualTo("demo");
    assertThat(identityService.checkPassword(userId, "demo")).isTrue();
  }

  @Test
  public void shouldNotEnableLdap() {
    assertThat(props).isNull();
    assertThat(ldapPlugin).isNull();
  }
}
