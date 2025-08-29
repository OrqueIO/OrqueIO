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
package io.orqueio.bpm.engine.telemetry;

import io.orqueio.bpm.engine.ManagementService;

/**
 * This class represents the data structure used for collecting information
 * about executed commands for telemetry data. A command is an action usually
 * triggered by a user and performed by the engine. This class counts the number
 * of executions per command.
 *
 * This information is sent to Orqueio when telemetry is enabled.
 *
 * When used for telemetry data collection, all command execution counts reset
 * on sending the data. Retrieval through
 * {@link ManagementService#getTelemetryData()} will not reset the counter.
 *
 * @see <a href=
 *      "https://docs.orqueio.io/manual/latest/introduction/telemetry/#collected-data">Orqueio
 *      Documentation: Collected Telemetry Data</a>
 */
public interface Command {

  /**
   * The count of this command i.e., how often did the engine engine execute
   * this command.
   */
  public long getCount();
}
