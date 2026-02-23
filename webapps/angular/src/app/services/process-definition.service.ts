/*
 * Copyright 2026 OrqueIO (https://www.orqueio.io/).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// ============================================
// Process Definition Interfaces
// ============================================

export interface ProcessDefinition {
  id: string;
  key: string;
  name: string;
  version: number;
  deploymentId: string;
  suspended: boolean;
  tenantId?: string;
  instancesCount?: number;
  versionTag?: string;
  historyTimeToLive?: number;
  startableInTasklist?: boolean;
  resource?: string;
}

export interface ActivityIncident {
  incidentType: string;
  incidentCount: number;
}

export interface ProcessDefinitionStatistics {
  id: string;
  key: string;
  name: string;
  version: number;
  suspended: boolean;
  instances: number;
  failedJobs: number;
  incidents: ActivityIncident[];
  definition: ProcessDefinition;
  tenantId?: string;
}

export interface ActivityStatistics {
  id: string;
  instances: number;
  failedJobs: number;
  incidents: ActivityIncident[];
}

export interface CalledProcessDefinition {
  id: string;
  key: string;
  name?: string;
  version: number;
  calledFromActivityIds: string[];
  callingProcessDefinitionId: string;
  state?: 'running' | 'referenced' | 'running-and-referenced';
}

export interface JobDefinition {
  id: string;
  processDefinitionId: string;
  processDefinitionKey: string;
  activityId: string;
  jobType: string;
  jobConfiguration?: string;
  suspended: boolean;
  overridingJobPriority?: number;
  tenantId?: string;
  deploymentId?: string;
}

export interface Incident {
  id: string;
  processInstanceId: string;
  processDefinitionId?: string;
  activityId: string;
  incidentType: string;
  incidentMessage: string;
  createTime: string;
  endTime?: string;
  incidentTimestamp?: string;
  causeIncidentId?: string;
  rootCauseIncidentId?: string;
  configuration?: string;
  tenantId?: string;
  jobDefinitionId?: string;
  failedActivityId?: string;
  annotation?: string;
  open?: boolean;
  deleted?: boolean;
  resolved?: boolean;
}

/**
 * Service for process definition operations.
 *
 * This service handles:
 * - Process definition CRUD operations
 * - BPMN XML retrieval
 * - Activity statistics
 * - Called process definitions (Call Activities)
 * - Job definitions management
 * - Process definition suspension
 *
 * Extracted from CockpitService to follow Single Responsibility Principle.
 */
@Injectable({
  providedIn: 'root'
})
export class ProcessDefinitionService {
  private readonly baseUrl = '/orqueio/api/engine/engine/default';

  constructor(private http: HttpClient) {}

  // ============================================
  // Process Definition CRUD
  // ============================================

  /**
   * Get all process definitions (latest versions only)
   */
  getProcessDefinitions(maxResults: number = 1000): Observable<ProcessDefinition[]> {
    return this.http.get<ProcessDefinition[]>(`${this.baseUrl}/process-definition`, {
      params: {
        latestVersion: 'true',
        sortBy: 'name',
        sortOrder: 'asc',
        maxResults: maxResults.toString()
      }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Get a process definition by ID
   */
  getProcessDefinition(id: string): Observable<ProcessDefinition | null> {
    return this.http.get<ProcessDefinition>(`${this.baseUrl}/process-definition/${id}`)
      .pipe(catchError(() => of(null)));
  }

  /**
   * Get a process definition by key (latest version)
   */
  getProcessDefinitionByKey(key: string): Observable<ProcessDefinition | null> {
    return this.http.get<ProcessDefinition>(`${this.baseUrl}/process-definition/key/${key}`)
      .pipe(catchError(() => of(null)));
  }

  /**
   * Get all versions of a process definition by key
   */
  getProcessDefinitionVersions(key: string): Observable<ProcessDefinition[]> {
    return this.http.get<ProcessDefinition[]>(`${this.baseUrl}/process-definition`, {
      params: { key, sortBy: 'version', sortOrder: 'desc', firstResult: '0', maxResults: '1000' }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Get process definition count
   */
  getProcessDefinitionsCount(latestVersion = true): Observable<number> {
    const params: Record<string, string> = {};
    if (latestVersion) {
      params['latestVersion'] = 'true';
    }
    return this.http.get<{ count: number }>(`${this.baseUrl}/process-definition/count`, { params })
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get process definitions with running instances count and incidents
   * Aggregates statistics by process definition key (combines all versions)
   */
  getProcessDefinitionsWithStatistics(includeIncidents = true): Observable<ProcessDefinitionStatistics[]> {
    let params = new HttpParams();
    if (includeIncidents) {
      params = params.set('incidents', 'true');
    }
    return this.http.get<ProcessDefinitionStatistics[]>(
      `${this.baseUrl}/process-definition/statistics`,
      { params }
    ).pipe(
      map(stats => this.aggregateStatisticsByKey(stats)),
      catchError(() => of([]))
    );
  }

  /**
   * Get raw statistics without aggregation
   */
  getProcessDefinitionsStatisticsRaw(includeIncidents = true): Observable<ProcessDefinitionStatistics[]> {
    let params = new HttpParams();
    if (includeIncidents) {
      params = params.set('incidents', 'true');
    }
    return this.http.get<ProcessDefinitionStatistics[]>(
      `${this.baseUrl}/process-definition/statistics`,
      { params }
    ).pipe(catchError(() => of([])));
  }

  /**
   * Aggregate statistics by process definition key
   */
  private aggregateStatisticsByKey(stats: ProcessDefinitionStatistics[]): ProcessDefinitionStatistics[] {
    const aggregatedMap = new Map<string, ProcessDefinitionStatistics>();

    stats.forEach(stat => {
      const key = stat.definition?.key || stat.id;
      const existing = aggregatedMap.get(key);

      if (existing) {
        existing.instances += stat.instances;
        existing.failedJobs += stat.failedJobs;
        stat.incidents?.forEach(incident => {
          const existingIncident = existing.incidents.find(i => i.incidentType === incident.incidentType);
          if (existingIncident) {
            existingIncident.incidentCount += incident.incidentCount;
          } else {
            existing.incidents.push({ ...incident });
          }
        });
      } else {
        aggregatedMap.set(key, {
          ...stat,
          incidents: stat.incidents ? [...stat.incidents] : []
        });
      }
    });

    return Array.from(aggregatedMap.values()).sort((a, b) => {
      const nameA = a.definition?.name || a.definition?.key || '';
      const nameB = b.definition?.name || b.definition?.key || '';
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Get running instances count for a specific process definition key
   */
  getRunningInstancesCount(processDefinitionKey: string): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/process-instance/count`, {
      params: { processDefinitionKey }
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get activity statistics for a process definition (instance counts per activity)
   */
  getActivityStatistics(processDefinitionId: string, includeIncidents = true): Observable<ActivityStatistics[]> {
    let params = new HttpParams();
    if (includeIncidents) {
      params = params.set('incidents', 'true');
    }
    return this.http.get<ActivityStatistics[]>(
      `${this.baseUrl}/process-definition/${processDefinitionId}/statistics`,
      { params }
    ).pipe(catchError(() => of([])));
  }

  // ============================================
  // BPMN XML
  // ============================================

  /**
   * Get BPMN 2.0 XML for a process definition
   */
  getBpmn20Xml(processDefinitionId: string): Observable<{ bpmn20Xml: string } | null> {
    return this.http.get<{ bpmn20Xml: string }>(
      `${this.baseUrl}/process-definition/${processDefinitionId}/xml`
    ).pipe(catchError(() => of(null)));
  }

  // ============================================
  // Incidents
  // ============================================

  /**
   * Get incidents for a process definition key (all versions)
   */
  getIncidentsByProcessDefinitionKey(processDefinitionKey: string, maxResults = 1000): Observable<Incident[]> {
    return this.http.get<Incident[]>(`${this.baseUrl}/incident`, {
      params: { processDefinitionKey, maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Get incidents for a specific process definition ID (specific version)
   */
  getIncidentsByProcessDefinitionId(processDefinitionId: string, maxResults = 1000): Observable<Incident[]> {
    return this.http.get<Incident[]>(`${this.baseUrl}/incident`, {
      params: { processDefinitionId, maxResults: maxResults.toString() }
    }).pipe(catchError(() => of([])));
  }

  // ============================================
  // Job Definitions
  // ============================================

  /**
   * Get job definitions for a process definition key with count
   */
  getJobDefinitionsByProcessDefinitionKey(
    processDefinitionKey: string,
    firstResult = 0,
    maxResults = 50
  ): Observable<{ jobDefinitions: JobDefinition[]; count: number }> {
    return forkJoin({
      jobDefinitions: this.http.get<JobDefinition[]>(`${this.baseUrl}/job-definition`, {
        params: {
          processDefinitionKey,
          firstResult: firstResult.toString(),
          maxResults: maxResults.toString()
        }
      }),
      count: this.http.get<{ count: number }>(`${this.baseUrl}/job-definition/count`, {
        params: { processDefinitionKey }
      }).pipe(map(res => res.count))
    }).pipe(catchError(() => of({ jobDefinitions: [], count: 0 })));
  }

  /**
   * Get job definitions for a specific process definition ID with count
   */
  getJobDefinitionsByProcessDefinitionId(
    processDefinitionId: string,
    firstResult = 0,
    maxResults = 50
  ): Observable<{ jobDefinitions: JobDefinition[]; count: number }> {
    return forkJoin({
      jobDefinitions: this.http.get<JobDefinition[]>(`${this.baseUrl}/job-definition`, {
        params: {
          processDefinitionId,
          firstResult: firstResult.toString(),
          maxResults: maxResults.toString()
        }
      }),
      count: this.http.get<{ count: number }>(`${this.baseUrl}/job-definition/count`, {
        params: { processDefinitionId }
      }).pipe(map(res => res.count))
    }).pipe(catchError(() => of({ jobDefinitions: [], count: 0 })));
  }

  /**
   * Suspend or activate a job definition
   */
  updateJobDefinitionSuspensionState(jobDefinitionId: string, suspended: boolean): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/job-definition/${jobDefinitionId}/suspended`, {
      suspended,
      includeJobs: true
    });
  }

  // ============================================
  // Called Process Definitions (Call Activities)
  // ============================================

  /**
   * Get called process definitions - merges running and static references
   */
  getCalledProcessDefinitions(processDefinitionId: string): Observable<CalledProcessDefinition[]> {
    return forkJoin({
      running: this.http.post<any[]>(
        `${this.baseUrl}/process-definition/${processDefinitionId}/called-process-definitions`,
        {}
      ).pipe(catchError(() => of([]))),
      static: this.http.get<any[]>(
        `${this.baseUrl}/process-definition/${processDefinitionId}/static-called-process-definitions`
      ).pipe(catchError(() => of([])))
    }).pipe(
      map(({ running, static: staticDefs }) =>
        this.mergeCalledProcessDefinitions(running, staticDefs, processDefinitionId)
      ),
      catchError(() => of([]))
    );
  }

  /**
   * Merge running instances and static references
   */
  private mergeCalledProcessDefinitions(
    running: any[],
    staticDefs: any[],
    callingProcessDefinitionId: string
  ): CalledProcessDefinition[] {
    const map = new Map<string, CalledProcessDefinition>();

    running.forEach(dto => {
      map.set(dto.id, {
        id: dto.id,
        key: dto.key,
        name: dto.name,
        version: dto.version,
        calledFromActivityIds: dto.calledFromActivityIds || [],
        callingProcessDefinitionId,
        state: 'running'
      });
    });

    staticDefs.forEach(dto => {
      if (map.has(dto.id)) {
        const existing = map.get(dto.id)!;
        const merged = new Set([...existing.calledFromActivityIds, ...(dto.calledFromActivityIds || [])]);
        existing.calledFromActivityIds = Array.from(merged).sort();
        existing.state = 'running-and-referenced';
      } else {
        map.set(dto.id, {
          id: dto.id,
          key: dto.key,
          name: dto.name,
          version: dto.version,
          calledFromActivityIds: (dto.calledFromActivityIds || []).sort(),
          callingProcessDefinitionId,
          state: 'referenced'
        });
      }
    });

    return Array.from(map.values());
  }

  // ============================================
  // Suspension State
  // ============================================

  /**
   * Suspend a process definition
   */
  suspendProcessDefinition(processDefinitionId: string, includeInstances = true): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/process-definition/${processDefinitionId}/suspended`,
      {
        suspended: true,
        includeProcessInstances: includeInstances,
        executionDate: null
      }
    );
  }

  /**
   * Activate a process definition
   */
  activateProcessDefinition(processDefinitionId: string, includeInstances = true): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/process-definition/${processDefinitionId}/suspended`,
      {
        suspended: false,
        includeProcessInstances: includeInstances,
        executionDate: null
      }
    );
  }
}
