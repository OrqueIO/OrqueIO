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
package io.orqueio.bpm.engine.cdi.impl.el;

import java.beans.FeatureDescriptor;
import java.util.Iterator;
import javax.enterprise.inject.spi.BeanManager;
import io.orqueio.bpm.engine.cdi.impl.util.BeanManagerLookup;
import io.orqueio.bpm.engine.cdi.impl.util.ProgrammaticBeanLookup;
import io.orqueio.bpm.impl.juel.jakarta.el.ELContext;
import io.orqueio.bpm.impl.juel.jakarta.el.ELResolver;


/**
 * Resolves CDI beans referenced as the root of an EL expression, e.g. the
 * {@code bean} in <code>${bean.method(execution)}</code>.
 *
 * <p>This resolver only resolves the <em>root</em> bean name, via
 * {@link ProgrammaticBeanLookup} (which uses {@link BeanManager#getBeans} and is
 * supported by every CDI container, including CDI Lite runtimes such as Quarkus
 * ArC). It intentionally does <em>not</em> delegate to
 * {@link BeanManager#getELResolver()}: that method is optional under CDI Lite,
 * and Quarkus ArC throws {@link UnsupportedOperationException} for it, which
 * previously made every {@code ${bean.method(...)}} expression fail at runtime
 * under Quarkus. The delegation is also unnecessary: property access and method
 * invocation on the resolved bean are handled by the {@code ArrayELResolver},
 * {@code ListELResolver}, {@code MapELResolver} and {@code BeanELResolver} that
 * {@code CdiExpressionManager} already adds to the resolver chain after this
 * one. Dropping it is therefore behaviourally equivalent on a full CDI container
 * (Weld already routed method invocation through a {@code BeanELResolver}) while
 * also working under CDI Lite.
 *
 * @author Daniel Meyer
 */
public class CdiResolver extends ELResolver {

  protected BeanManager getBeanManager() {
    return BeanManagerLookup.getBeanManager();
  }

  @Override
  public Object getValue(ELContext context, Object base, Object property) {
    //we need to resolve a bean only for the first "member" of expression, e.g. bean.property1.property2
    if (base == null && property != null) {
      Object result = ProgrammaticBeanLookup.lookup(property.toString(), getBeanManager());
      if (result != null) {
        context.setPropertyResolved(true);
      }
      return result;
    }
    return null;
  }

  @Override
  public Class< ? > getType(ELContext context, Object base, Object property) {
    if (base == null && property != null) {
      Object result = ProgrammaticBeanLookup.lookup(property.toString(), getBeanManager());
      if (result != null) {
        context.setPropertyResolved(true);
        return result.getClass();
      }
    }
    return null;
  }

  @Override
  public boolean isReadOnly(ELContext context, Object base, Object property) {
    // a CDI bean resolved by name cannot be reassigned through that name
    if (base == null && property != null
        && ProgrammaticBeanLookup.lookup(property.toString(), getBeanManager()) != null) {
      context.setPropertyResolved(true);
      return true;
    }
    return false;
  }

  @Override
  public void setValue(ELContext context, Object base, Object property, Object value) {
    // assigning to a CDI bean root is not supported; left to the rest of the chain
  }

  @Override
  public Object invoke(ELContext context, Object base, Object method, java.lang.Class< ? >[] paramTypes, Object[] params) {
    // method invocation happens on the already-resolved base and is handled by the
    // BeanELResolver further down the CdiExpressionManager chain
    return null;
  }

  @Override
  public Class< ? > getCommonPropertyType(ELContext context, Object base) {
    return base == null ? Object.class : null;
  }

  @Override
  public Iterator<FeatureDescriptor> getFeatureDescriptors(ELContext context, Object base) {
    return null;
  }

}
