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
package io.orqueio.bpm.engine.impl.cmd;

import static io.orqueio.bpm.engine.impl.util.EnsureUtil.ensureNotNull;

import java.io.Serializable;

import io.orqueio.bpm.engine.filter.Filter;
import io.orqueio.bpm.engine.impl.AbstractQuery;
import io.orqueio.bpm.engine.impl.interceptor.CommandContext;
import io.orqueio.bpm.engine.impl.persistence.entity.FilterEntity;
import io.orqueio.bpm.engine.query.Query;
import io.orqueio.bpm.engine.task.TaskQuery;

/**
 * @author Sebastian Menski
 */
public abstract class AbstractExecuteFilterCmd implements Serializable {

  private static final long serialVersionUID = 1L;

  protected String filterId;
  protected Query<?, ?> extendingQuery;

  public AbstractExecuteFilterCmd(String filterId) {
    this.filterId = filterId;
  }

  public AbstractExecuteFilterCmd(String filterId, Query<?, ?> extendingQuery) {
    this.filterId = filterId;
    this.extendingQuery = extendingQuery;
  }

  protected Filter getFilter(CommandContext commandContext) {
    ensureNotNull("No filter id given to execute", "filterId", filterId);
    FilterEntity filter = commandContext
      .getFilterManager()
      .findFilterById(filterId);

    ensureNotNull("No filter found for id '" + filterId + "'", "filter", filter);

    if (extendingQuery != null) {
      ((AbstractQuery<?, ?>) extendingQuery).validate();
      filter = (FilterEntity) filter.extend(extendingQuery);
    }

    return filter;
  }

  protected Query<?, ?> getFilterQuery(CommandContext commandContext) {
    Filter filter = getFilter(commandContext);
    Query<?, ?> query = filter.getQuery();
    if (query instanceof TaskQuery) {
      ((TaskQuery) query).initializeFormKeys();
    }
    return query;
  }

}
