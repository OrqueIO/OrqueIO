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
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// ============================================
// Decision Interfaces
// ============================================

export interface DecisionDefinition {
  id: string;
  key: string;
  name: string;
  version: number;
  deploymentId: string;
  decisionRequirementsDefinitionId?: string;
  decisionRequirementsDefinitionKey?: string;
  tenantId?: string;
  versionTag?: string;
  historyTimeToLive?: number;
  resource?: string;
  drd?: {
    id: string;
    key: string;
    name?: string;
  };
}

export interface DecisionInstance {
  id: string;
  decisionDefinitionId: string;
  decisionDefinitionKey: string;
  decisionDefinitionName?: string;
  evaluationTime: string;
  processDefinitionId?: string;
  processDefinitionKey?: string;
  processInstanceId?: string;
  caseDefinitionId?: string;
  caseDefinitionKey?: string;
  caseInstanceId?: string;
  activityId?: string;
  activityInstanceId?: string;
  tenantId?: string;
  userId?: string;
  rootDecisionInstanceId?: string;
  decisionRequirementsDefinitionId?: string;
  decisionRequirementsDefinitionKey?: string;
  inputs?: DecisionInstanceInput[];
  outputs?: DecisionInstanceOutput[];
}

export interface DecisionInstanceInput {
  id: string;
  decisionInstanceId: string;
  clauseId: string;
  clauseName?: string;
  type: string;
  value: any;
  valueInfo?: Record<string, any>;
}

export interface DecisionInstanceOutput {
  id: string;
  decisionInstanceId: string;
  clauseId: string;
  clauseName?: string;
  ruleId: string;
  ruleOrder: number;
  variableName: string;
  type: string;
  value: any;
  valueInfo?: Record<string, any>;
}

export interface DecisionRequirementsDefinition {
  id: string;
  key: string;
  name?: string;
  version: number;
  deploymentId: string;
  resource?: string;
  tenantId?: string;
}

export interface DecisionInstanceQueryParams {
  decisionDefinitionId?: string;
  decisionDefinitionKey?: string;
  processDefinitionId?: string;
  processDefinitionKey?: string;
  processInstanceId?: string;
  caseDefinitionId?: string;
  caseDefinitionKey?: string;
  caseInstanceId?: string;
  activityIdIn?: string[];
  activityInstanceIdIn?: string[];
  evaluatedBefore?: string;
  evaluatedAfter?: string;
  firstResult?: number;
  maxResults?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeInputs?: boolean;
  includeOutputs?: boolean;
}

/**
 * Service for decision definition and instance operations.
 *
 * This service handles:
 * - Decision definition CRUD operations
 * - DMN XML retrieval
 * - Decision instances (history)
 * - Decision Requirements Definitions (DRD)
 *
 * Extracted from CockpitService to follow Single Responsibility Principle.
 */
@Injectable({
  providedIn: 'root'
})
export class DecisionService {
  private readonly baseUrl = '/orqueio/api/engine/engine/default';
  private readonly historyUrl = `${this.baseUrl}/history`;

  constructor(private http: HttpClient) {}

  // ============================================
  // Decision Definition CRUD
  // ============================================

  /**
   * Get all decision definitions (latest versions only)
   */
  getDecisionDefinitions(maxResults: number = 1000): Observable<DecisionDefinition[]> {
    return this.http.get<DecisionDefinition[]>(`${this.baseUrl}/decision-definition`, {
      params: {
        latestVersion: 'true',
        sortBy: 'name',
        sortOrder: 'asc',
        maxResults: maxResults.toString()
      }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Get a decision definition by ID
   */
  getDecisionDefinition(id: string): Observable<DecisionDefinition | null> {
    return this.http.get<DecisionDefinition>(`${this.baseUrl}/decision-definition/${id}`)
      .pipe(catchError(() => of(null)));
  }

  /**
   * Get all versions of a decision definition by key
   */
  getDecisionDefinitionVersions(key: string, tenantId?: string): Observable<DecisionDefinition[]> {
    const params: Record<string, string> = {
      key,
      sortBy: 'version',
      sortOrder: 'desc',
      maxResults: '100'
    };
    if (tenantId) {
      params['tenantIdIn'] = tenantId;
    } else {
      params['withoutTenantId'] = 'true';
    }
    return this.http.get<DecisionDefinition[]>(`${this.baseUrl}/decision-definition`, { params })
      .pipe(catchError(() => of([])));
  }

  /**
   * Get decision definitions count
   */
  getDecisionDefinitionsCount(latestVersion = true): Observable<number> {
    const params: Record<string, string> = {};
    if (latestVersion) {
      params['latestVersion'] = 'true';
    }
    return this.http.get<{ count: number }>(`${this.baseUrl}/decision-definition/count`, { params })
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  /**
   * Get decision definitions with pagination and sorting
   */
  getDecisionDefinitionsPaginated(params: {
    firstResult?: number;
    maxResults?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    latestVersion?: boolean;
  }): Observable<DecisionDefinition[]> {
    let httpParams = new HttpParams();
    if (params.firstResult !== undefined) {
      httpParams = httpParams.set('firstResult', params.firstResult.toString());
    }
    if (params.maxResults !== undefined) {
      httpParams = httpParams.set('maxResults', params.maxResults.toString());
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
      if (params.sortOrder) {
        httpParams = httpParams.set('sortOrder', params.sortOrder);
      }
    }
    if (params.latestVersion !== false) {
      httpParams = httpParams.set('latestVersion', 'true');
    }
    return this.http.get<DecisionDefinition[]>(`${this.baseUrl}/decision-definition`, { params: httpParams })
      .pipe(catchError(() => of([])));
  }

  // ============================================
  // DMN XML
  // ============================================

  /**
   * Get DMN XML for a decision definition
   */
  getDecisionXml(decisionDefinitionId: string): Observable<{ id: string; dmnXml: string } | null> {
    return this.http.get<{ id: string; dmnXml: string }>(
      `${this.baseUrl}/decision-definition/${decisionDefinitionId}/xml`
    ).pipe(catchError(() => of(null)));
  }

  // ============================================
  // Decision Requirements Definition (DRD)
  // ============================================

  /**
   * Get all decision requirements definitions (latest versions only)
   */
  getDecisionRequirementsDefinitions(maxResults: number = 1000): Observable<DecisionRequirementsDefinition[]> {
    return this.http.get<DecisionRequirementsDefinition[]>(`${this.baseUrl}/decision-requirements-definition`, {
      params: {
        latestVersion: 'true',
        sortBy: 'name',
        sortOrder: 'asc',
        maxResults: maxResults.toString()
      }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Get a decision requirements definition by ID
   */
  getDecisionRequirementsDefinition(id: string): Observable<DecisionRequirementsDefinition | null> {
    return this.http.get<DecisionRequirementsDefinition>(`${this.baseUrl}/decision-requirements-definition/${id}`)
      .pipe(catchError(() => of(null)));
  }

  /**
   * Get DRD XML
   */
  getDecisionRequirementsDefinitionXml(id: string): Observable<{ id: string; dmnXml: string } | null> {
    return this.http.get<{ id: string; dmnXml: string }>(
      `${this.baseUrl}/decision-requirements-definition/${id}/xml`
    ).pipe(catchError(() => of(null)));
  }

  // ============================================
  // Decision Instances
  // ============================================

  /**
   * Get decision instances
   */
  getDecisionInstances(definitionId?: string, maxResults: number = 100): Observable<DecisionInstance[]> {
    let httpParams = new HttpParams()
      .set('sortBy', 'evaluationTime')
      .set('sortOrder', 'desc')
      .set('maxResults', maxResults.toString());

    if (definitionId) {
      httpParams = httpParams.set('decisionDefinitionId', definitionId);
    }

    return this.http.get<DecisionInstance[]>(`${this.historyUrl}/decision-instance`, { params: httpParams })
      .pipe(catchError(() => of([])));
  }

  /**
   * Get decision instances with advanced filtering
   */
  getDecisionInstancesPaginated(params: DecisionInstanceQueryParams): Observable<DecisionInstance[]> {
    let httpParams = new HttpParams();

    if (params.decisionDefinitionId) {
      httpParams = httpParams.set('decisionDefinitionId', params.decisionDefinitionId);
    }
    if (params.decisionDefinitionKey) {
      httpParams = httpParams.set('decisionDefinitionKey', params.decisionDefinitionKey);
    }
    if (params.processDefinitionId) {
      httpParams = httpParams.set('processDefinitionId', params.processDefinitionId);
    }
    if (params.processDefinitionKey) {
      httpParams = httpParams.set('processDefinitionKey', params.processDefinitionKey);
    }
    if (params.processInstanceId) {
      httpParams = httpParams.set('processInstanceId', params.processInstanceId);
    }
    if (params.caseDefinitionId) {
      httpParams = httpParams.set('caseDefinitionId', params.caseDefinitionId);
    }
    if (params.caseDefinitionKey) {
      httpParams = httpParams.set('caseDefinitionKey', params.caseDefinitionKey);
    }
    if (params.caseInstanceId) {
      httpParams = httpParams.set('caseInstanceId', params.caseInstanceId);
    }
    if (params.activityIdIn?.length) {
      httpParams = httpParams.set('activityIdIn', params.activityIdIn.join(','));
    }
    if (params.activityInstanceIdIn?.length) {
      httpParams = httpParams.set('activityInstanceIdIn', params.activityInstanceIdIn.join(','));
    }
    if (params.evaluatedBefore) {
      httpParams = httpParams.set('evaluatedBefore', params.evaluatedBefore);
    }
    if (params.evaluatedAfter) {
      httpParams = httpParams.set('evaluatedAfter', params.evaluatedAfter);
    }
    if (params.firstResult !== undefined) {
      httpParams = httpParams.set('firstResult', params.firstResult.toString());
    }
    if (params.maxResults !== undefined) {
      httpParams = httpParams.set('maxResults', params.maxResults.toString());
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
      if (params.sortOrder) {
        httpParams = httpParams.set('sortOrder', params.sortOrder);
      }
    }
    if (params.includeInputs) {
      httpParams = httpParams.set('includeInputs', 'true');
    }
    if (params.includeOutputs) {
      httpParams = httpParams.set('includeOutputs', 'true');
    }

    return this.http.get<DecisionInstance[]>(`${this.historyUrl}/decision-instance`, { params: httpParams })
      .pipe(catchError(() => of([])));
  }

  /**
   * Get decision instances count
   */
  getDecisionInstancesCount(decisionDefinitionId?: string): Observable<number> {
    let httpParams = new HttpParams();
    if (decisionDefinitionId) {
      httpParams = httpParams.set('decisionDefinitionId', decisionDefinitionId);
    }
    return this.http.get<{ count: number }>(`${this.historyUrl}/decision-instance/count`, { params: httpParams })
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  /**
   * Get a single decision instance by ID (with inputs and outputs)
   */
  getDecisionInstance(id: string): Observable<DecisionInstance | null> {
    return this.http.get<DecisionInstance[]>(`${this.historyUrl}/decision-instance`, {
      params: {
        decisionInstanceId: id,
        includeInputs: 'true',
        includeOutputs: 'true',
        disableBinaryFetching: 'true',
        disableCustomObjectDeserialization: 'true',
        maxResults: '1'
      }
    }).pipe(
      map(results => results.length > 0 ? results[0] : null),
      catchError(() => of(null))
    );
  }
}
