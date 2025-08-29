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
package io.orqueio.bpm.engine.cdi;

import io.orqueio.bpm.engine.cdi.impl.el.CdiResolver;
import io.orqueio.bpm.engine.impl.el.ExpressionManager;
import io.orqueio.bpm.engine.impl.el.JuelExpressionManager;
import io.orqueio.bpm.engine.impl.el.VariableContextElResolver;
import io.orqueio.bpm.engine.impl.el.VariableScopeElResolver;
import io.orqueio.bpm.impl.juel.jakarta.el.ArrayELResolver;
import io.orqueio.bpm.impl.juel.jakarta.el.BeanELResolver;
import io.orqueio.bpm.impl.juel.jakarta.el.CompositeELResolver;
import io.orqueio.bpm.impl.juel.jakarta.el.ELResolver;
import io.orqueio.bpm.impl.juel.jakarta.el.ListELResolver;
import io.orqueio.bpm.impl.juel.jakarta.el.MapELResolver;

/**
 * {@link ExpressionManager} for resolving Cdi-managed beans.
 *
 * This {@link ExpressionManager} implementation performs lazy lookup of the
 * Cdi-BeanManager and can thus be configured using the spring-based
 * configuration of the process engine:
 *
 * <pre>
 * &lt;property name="expressionManager"&gt;
 *      &lt;bean class="io.orqueio.bpm.engine.test.cdi.CdiExpressionManager" /&gt;
 * &lt;/property&gt;
 * </pre>
 *
 * @author Daniel Meyer
 */
public class CdiExpressionManager extends JuelExpressionManager {

  @Override
  protected ELResolver createElResolver() {
    CompositeELResolver compositeElResolver = new CompositeELResolver();
    compositeElResolver.add(new VariableScopeElResolver());
    compositeElResolver.add(new VariableContextElResolver());

    compositeElResolver.add(new CdiResolver());

    compositeElResolver.add(new ArrayELResolver());
    compositeElResolver.add(new ListELResolver());
    compositeElResolver.add(new MapELResolver());
    compositeElResolver.add(new BeanELResolver());

    return compositeElResolver;
  }

}
