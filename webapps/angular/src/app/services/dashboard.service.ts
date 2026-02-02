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
// Dashboard-specific interfaces
// ============================================

export interface DashboardStats {
  runningProcessInstances: number;
  openIncidents: number;
  openTasks: number;
  deployedDefinitions: number;
}

export interface ProcessStats {
  active: number;
  suspended: number;
  completed: number;
}

export interface TaskStats {
  assigned: number;
  unassigned: number;
  withCandidateGroups: number;
  withoutCandidateGroups: number;
}

export interface IncidentByType {
  type: string;
  count: number;
}

export interface IncidentByProcess {
  processKey: string;
  processName: string;
  incidentCount: number;
  instances: number;
}

export interface TimelineDataPoint {
  date: string;
  started: number;
  completed: number;
}

export interface ProcessDistributionItem {
  key: string;
  name: string;
  instanceCount: number;
  percentage: number;
}

export interface TasksByGroup {
  groupId: string;
  groupName: string;
  taskCount: number;
}

export interface DashboardChartsData {
  processStats: ProcessStats;
  taskStats: TaskStats;
  incidentsByType: IncidentByType[];
  incidentsByProcess: IncidentByProcess[];
  tasksByGroup: TasksByGroup[];
  processDistribution: ProcessDistributionItem[];
}

// Internal interfaces
interface ProcessDefinitionStatistics {
  id: string;
  key: string;
  name: string;
  version: number;
  suspended: boolean;
  instances: number;
  failedJobs: number;
  incidents: { incidentType: string; incidentCount: number }[];
  definition?: {
    id: string;
    key: string;
    name?: string;
  };
}

interface TaskGroupCount {
  id?: string;
  groupName: string | null;
  taskCount: number;
}

interface Incident {
  id: string;
  incidentType: string;
  [key: string]: any;
}

/**
 * Service for dashboard statistics and analytics.
 *
 * This service provides all data needed for the cockpit dashboard,
 * including:
 * - Overall statistics (process instances, incidents, tasks, definitions)
 * - Chart data (process stats, task stats, incidents by type/process)
 * - Timeline data for trend analysis
 * - Distribution data for pie charts
 *
 * Extracted from CockpitService to follow Single Responsibility Principle.
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly baseUrl = '/orqueio/api/engine/engine/default';
  private readonly historyUrl = `${this.baseUrl}/history`;

  constructor(private http: HttpClient) {}

  // ============================================
  // Main Dashboard Statistics
  // ============================================

  /**
   * Get main dashboard statistics in a single call
   */
  getDashboardStats(): Observable<DashboardStats> {
    return forkJoin({
      runningProcessInstances: this.getRunningProcessCount(),
      openIncidents: this.getOpenIncidentsCount(),
      openTasks: this.getOpenTasksCount(),
      deployedDefinitions: this.getDeployedDefinitionsCount()
    });
  }

  /**
   * Get count of running (active) process instances
   */
  getRunningProcessCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/process-instance/count`)
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  /**
   * Get count of open incidents
   */
  getOpenIncidentsCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/incident/count`)
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  /**
   * Get count of open tasks
   */
  getOpenTasksCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/task/count`)
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  /**
   * Get count of deployed process definitions
   */
  getDeployedDefinitionsCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/process-definition/count`)
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  /**
   * Get count of process definitions (latest versions only)
   */
  getProcessDefinitionsCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/process-definition/count`, {
      params: { latestVersion: 'true' }
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get count of case definitions (latest versions only)
   */
  getCaseDefinitionsCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/case-definition/count`, {
      params: { latestVersion: 'true' }
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get count of deployments
   */
  getDeploymentsCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/deployment/count`)
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  // ============================================
  // Chart Statistics
  // ============================================

  /**
   * Get count of suspended process instances
   */
  getSuspendedProcessCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/process-instance/count`, {
      params: { suspended: 'true' }
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get count of finished process instances (from history)
   */
  getFinishedProcessCount(params?: {
    finishedAfter?: string;
    finishedBefore?: string;
  }): Observable<number> {
    let httpParams = new HttpParams().set('finished', 'true');
    if (params?.finishedAfter) {
      httpParams = httpParams.set('finishedAfter', params.finishedAfter);
    }
    if (params?.finishedBefore) {
      httpParams = httpParams.set('finishedBefore', params.finishedBefore);
    }
    return this.http.get<{ count: number }>(`${this.historyUrl}/process-instance/count`, {
      params: httpParams
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get process stats for charts (active, suspended, completed)
   */
  getProcessStatsForChart(): Observable<ProcessStats> {
    return forkJoin({
      active: this.getRunningProcessCount(),
      suspended: this.getSuspendedProcessCount(),
      completed: this.getFinishedProcessCount()
    });
  }

  /**
   * Get task stats for charts
   * Categories are mutually exclusive:
   * - assigned: tasks assigned to a specific user
   * - unassigned: unassigned tasks that have candidate groups
   * - withoutCandidateGroups: unassigned tasks without any candidate groups
   */
  getTaskStatsForChart(): Observable<TaskStats> {
    return forkJoin({
      assigned: this.getTasksCount({ assigned: true }),
      unassigned: this.getTasksCount({ unassigned: true, withCandidateGroups: true }),
      withCandidateGroups: this.getTasksCount({ unassigned: true, withCandidateGroups: true }),
      withoutCandidateGroups: this.getTasksCount({ unassigned: true, withoutCandidateGroups: true })
    });
  }

  /**
   * Get tasks count with optional filters
   */
  private getTasksCount(params: {
    assigned?: boolean;
    unassigned?: boolean;
    withCandidateGroups?: boolean;
    withoutCandidateGroups?: boolean;
  }): Observable<number> {
    let httpParams = new HttpParams();
    if (params.assigned) httpParams = httpParams.set('assigned', 'true');
    if (params.unassigned) httpParams = httpParams.set('unassigned', 'true');
    if (params.withCandidateGroups) httpParams = httpParams.set('withCandidateGroups', 'true');
    if (params.withoutCandidateGroups) httpParams = httpParams.set('withoutCandidateGroups', 'true');

    return this.http.get<{ count: number }>(`${this.baseUrl}/task/count`, { params: httpParams })
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  // ============================================
  // Incidents Analytics
  // ============================================

  /**
   * Get incidents grouped by type
   */
  getIncidentsByType(): Observable<IncidentByType[]> {
    return this.http.get<Incident[]>(`${this.baseUrl}/incident`, {
      params: { maxResults: '10000' }
    }).pipe(
      map(incidents => {
        const grouped = incidents.reduce((acc, inc) => {
          const type = inc.incidentType || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count);
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Get incidents aggregated by process definition
   * Uses /process-definition/statistics?rootIncidents=true
   */
  getIncidentsByProcess(): Observable<IncidentByProcess[]> {
    return this.http.get<ProcessDefinitionStatistics[]>(
      `${this.baseUrl}/process-definition/statistics`,
      { params: { rootIncidents: 'true' } }
    ).pipe(
      map(stats => {
        const aggregatedMap = new Map<string, {
          key: string;
          name: string;
          incidentCount: number;
          instances: number;
        }>();

        stats.forEach(stat => {
          const key = stat.definition?.key || stat.id;
          const name = stat.definition?.name || stat.definition?.key || stat.id;
          const incidentCount = stat.incidents?.reduce((sum, inc) => sum + inc.incidentCount, 0) || 0;

          if (incidentCount > 0) {
            const existing = aggregatedMap.get(key);
            if (existing) {
              existing.incidentCount += incidentCount;
              existing.instances += stat.instances;
            } else {
              aggregatedMap.set(key, {
                key,
                name,
                incidentCount,
                instances: stat.instances
              });
            }
          }
        });

        return Array.from(aggregatedMap.values())
          .map(item => ({
            processKey: item.key,
            processName: item.name,
            incidentCount: item.incidentCount,
            instances: item.instances
          }))
          .sort((a, b) => b.incidentCount - a.incidentCount);
      }),
      catchError(() => of([]))
    );
  }

  // ============================================
  // Timeline & Distribution
  // ============================================

  /**
   * Get process instances timeline data for a given number of days
   */
  getProcessInstancesTimeline(days: number): Observable<TimelineDataPoint[]> {
    const results: Observable<TimelineDataPoint>[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dateStr = date.toISOString().split('T')[0];
      const startOfDay = `${dateStr}T00:00:00.000+0000`;
      const endOfDay = `${dateStr}T23:59:59.999+0000`;

      results.push(
        forkJoin({
          started: this.getProcessInstancesCount({
            startedAfter: startOfDay,
            startedBefore: endOfDay
          }),
          completed: this.getFinishedProcessCount({
            finishedAfter: startOfDay,
            finishedBefore: endOfDay
          })
        }).pipe(
          map(r => ({ date: dateStr, ...r }))
        )
      );
    }

    return forkJoin(results);
  }

  /**
   * Get process instances count with date filters
   */
  private getProcessInstancesCount(params: {
    startedAfter?: string;
    startedBefore?: string;
  }): Observable<number> {
    let httpParams = new HttpParams();
    if (params.startedAfter) httpParams = httpParams.set('startedAfter', params.startedAfter);
    if (params.startedBefore) httpParams = httpParams.set('startedBefore', params.startedBefore);

    return this.http.get<{ count: number }>(`${this.historyUrl}/process-instance/count`, {
      params: httpParams
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get process distribution (instances per process definition)
   */
  getProcessDistribution(): Observable<ProcessDistributionItem[]> {
    return this.http.get<ProcessDefinitionStatistics[]>(
      `${this.baseUrl}/process-definition/statistics`
    ).pipe(
      map(stats => {
        const totalInstances = stats.reduce((sum, s) => sum + s.instances, 0);

        return stats
          .filter(s => s.instances > 0)
          .map(s => ({
            key: s.definition?.key || s.id,
            name: s.definition?.name || s.definition?.key || s.id,
            instanceCount: s.instances,
            percentage: totalInstances > 0 ? (s.instances / totalInstances) * 100 : 0
          }))
          .sort((a, b) => b.instanceCount - a.instanceCount);
      }),
      catchError(() => of([]))
    );
  }

  // ============================================
  // Task Analytics
  // ============================================

  /**
   * Get task count by candidate group
   */
  getTaskCountByCandidateGroup(): Observable<TaskGroupCount[]> {
    return this.http.get<TaskGroupCount[]>(`${this.baseUrl}/task/report/candidate-group-count`)
      .pipe(catchError(() => of([])));
  }

  /**
   * Get tasks grouped by candidate group with group names
   */
  getTasksByGroupWithNames(): Observable<TasksByGroup[]> {
    return this.getTaskCountByCandidateGroup().pipe(
      map(groups => {
        return groups
          .filter(g => g.groupName !== null)
          .map(g => ({
            groupId: g.id || g.groupName || 'unknown',
            groupName: g.groupName || 'Unknown Group',
            taskCount: g.taskCount
          }))
          .sort((a, b) => b.taskCount - a.taskCount);
      }),
      catchError(() => of([]))
    );
  }

  // ============================================
  // Aggregated Data
  // ============================================

  /**
   * Get all dashboard charts data in a single call
   */
  getDashboardChartsData(): Observable<DashboardChartsData> {
    return forkJoin({
      processStats: this.getProcessStatsForChart(),
      taskStats: this.getTaskStatsForChart(),
      incidentsByType: this.getIncidentsByType(),
      incidentsByProcess: this.getIncidentsByProcess(),
      tasksByGroup: this.getTasksByGroupWithNames(),
      processDistribution: this.getProcessDistribution()
    });
  }
}
