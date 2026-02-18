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
// Deployment Interfaces
// ============================================

export interface Deployment {
  id: string;
  name: string | null;
  source: string | null;
  deploymentTime: string;
  tenantId: string | null;
}

export interface DeploymentResource {
  id: string;
  name: string;
  deploymentId: string;
}

export interface DeploymentWithResources extends Deployment {
  resources?: DeploymentResource[];
}

export interface DeploymentQueryParams {
  id?: string;
  name?: string;
  nameLike?: string;
  source?: string;
  withoutSource?: boolean;
  tenantIdIn?: string[];
  withoutTenantId?: boolean;
  deploymentBefore?: string;
  deploymentAfter?: string;
  sortBy?: 'id' | 'name' | 'deploymentTime';
  sortOrder?: 'asc' | 'desc';
  firstResult?: number;
  maxResults?: number;
}

export interface DeleteDeploymentOptions {
  cascade?: boolean;
  skipCustomListeners?: boolean;
  skipIoMappings?: boolean;
}

// Re-use types from other services for convenience
export interface ProcessDefinition {
  id: string;
  key: string;
  name: string;
  version: number;
  deploymentId: string;
  suspended: boolean;
  tenantId?: string;
}

export interface DecisionDefinition {
  id: string;
  key: string;
  name: string;
  version: number;
  deploymentId: string;
  tenantId?: string;
}

export interface CaseDefinition {
  id: string;
  key: string;
  name?: string;
  version: number;
  deploymentId: string;
  tenantId?: string;
}

/**
 * Service for deployment operations.
 *
 * This service handles:
 * - Deployment CRUD operations
 * - Deployment resources management
 * - Process/Decision/Case definitions by deployment
 * - Instance counts by deployment
 *
 * Extracted from CockpitService to follow Single Responsibility Principle.
 */
@Injectable({
  providedIn: 'root'
})
export class DeploymentService {
  private readonly baseUrl = '/orqueio/api/engine/engine/default';

  constructor(private http: HttpClient) {}

  // ============================================
  // Deployment CRUD
  // ============================================

  /**
   * Get deployments with optional filtering and pagination
   */
  getDeployments(params?: DeploymentQueryParams): Observable<Deployment[]> {
    let httpParams = new HttpParams();

    if (params?.id) httpParams = httpParams.set('id', params.id);
    if (params?.name) httpParams = httpParams.set('name', params.name);
    if (params?.nameLike) httpParams = httpParams.set('nameLike', params.nameLike);
    if (params?.source) httpParams = httpParams.set('source', params.source);
    if (params?.withoutSource) httpParams = httpParams.set('withoutSource', 'true');
    if (params?.tenantIdIn?.length) httpParams = httpParams.set('tenantIdIn', params.tenantIdIn.join(','));
    if (params?.withoutTenantId) httpParams = httpParams.set('withoutTenantId', 'true');
    if (params?.deploymentBefore) httpParams = httpParams.set('before', params.deploymentBefore);
    if (params?.deploymentAfter) httpParams = httpParams.set('after', params.deploymentAfter);
    if (params?.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
      if (params?.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);
    }
    if (params?.firstResult !== undefined) httpParams = httpParams.set('firstResult', params.firstResult.toString());

    const maxResults = params?.maxResults ?? 50;
    httpParams = httpParams.set('maxResults', maxResults.toString());

    return this.http.get<Deployment[]>(`${this.baseUrl}/deployment`, { params: httpParams })
      .pipe(catchError(() => of([])));
  }

  /**
   * Get deployments count with optional filtering
   */
  getDeploymentsCount(params?: DeploymentQueryParams): Observable<number> {
    let httpParams = new HttpParams();

    if (params?.id) httpParams = httpParams.set('id', params.id);
    if (params?.name) httpParams = httpParams.set('name', params.name);
    if (params?.nameLike) httpParams = httpParams.set('nameLike', params.nameLike);
    if (params?.source) httpParams = httpParams.set('source', params.source);
    if (params?.withoutSource) httpParams = httpParams.set('withoutSource', 'true');
    if (params?.tenantIdIn?.length) httpParams = httpParams.set('tenantIdIn', params.tenantIdIn.join(','));
    if (params?.withoutTenantId) httpParams = httpParams.set('withoutTenantId', 'true');
    if (params?.deploymentBefore) httpParams = httpParams.set('before', params.deploymentBefore);
    if (params?.deploymentAfter) httpParams = httpParams.set('after', params.deploymentAfter);

    return this.http.get<{ count: number }>(`${this.baseUrl}/deployment/count`, { params: httpParams })
      .pipe(
        map(res => res.count),
        catchError(() => of(0))
      );
  }

  /**
   * Delete a deployment with optional cascade and skip options
   */
  deleteDeployment(id: string, options?: DeleteDeploymentOptions): Observable<void> {
    let httpParams = new HttpParams();

    if (options?.cascade) httpParams = httpParams.set('cascade', 'true');
    if (options?.skipCustomListeners) httpParams = httpParams.set('skipCustomListeners', 'true');
    if (options?.skipIoMappings) httpParams = httpParams.set('skipIoMappings', 'true');

    return this.http.delete<void>(`${this.baseUrl}/deployment/${id}`, { params: httpParams })
      .pipe(catchError((err) => {
        throw err;
      }));
  }

  // ============================================
  // Deployment Resources
  // ============================================

  /**
   * Get all resources for a deployment
   */
  getDeploymentResources(deploymentId: string): Observable<DeploymentResource[]> {
    return this.http.get<DeploymentResource[]>(`${this.baseUrl}/deployment/${deploymentId}/resources`)
      .pipe(catchError(() => of([])));
  }

  /**
   * Get a specific resource data (binary)
   */
  getDeploymentResourceData(deploymentId: string, resourceId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/deployment/${deploymentId}/resources/${resourceId}/data`, {
      responseType: 'blob'
    }).pipe(catchError(() => of(new Blob())));
  }

  /**
   * Get resource data as text (for BPMN XML, DMN XML, etc.)
   */
  getDeploymentResourceText(deploymentId: string, resourceId: string): Observable<string> {
    return this.http.get(`${this.baseUrl}/deployment/${deploymentId}/resources/${resourceId}/data`, {
      responseType: 'text'
    }).pipe(catchError(() => of('')));
  }

  /**
   * Get URL for downloading a resource
   */
  getResourceDownloadUrl(deploymentId: string, resourceId: string): string {
    return `${this.baseUrl}/deployment/${deploymentId}/resources/${resourceId}/data`;
  }

  // ============================================
  // Definitions by Deployment
  // ============================================

  /**
   * Get process definitions for a deployment
   */
  getProcessDefinitionsByDeployment(deploymentId: string): Observable<ProcessDefinition[]> {
    return this.http.get<ProcessDefinition[]>(`${this.baseUrl}/process-definition`, {
      params: { deploymentId, maxResults: '1000' }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Get decision definitions for a deployment
   */
  getDecisionDefinitionsByDeployment(deploymentId: string): Observable<DecisionDefinition[]> {
    return this.http.get<DecisionDefinition[]>(`${this.baseUrl}/decision-definition`, {
      params: { deploymentId, maxResults: '1000' }
    }).pipe(catchError(() => of([])));
  }

  /**
   * Get case definitions for a deployment
   */
  getCaseDefinitionsByDeployment(deploymentId: string): Observable<CaseDefinition[]> {
    return this.http.get<CaseDefinition[]>(`${this.baseUrl}/case-definition`, {
      params: { deploymentId, maxResults: '1000' }
    }).pipe(catchError(() => of([])));
  }

  // ============================================
  // Instance Counts by Deployment
  // ============================================

  /**
   * Get process instance count by deployment ID
   */
  getProcessInstanceCountByDeployment(deploymentId: string): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/process-instance/count`, {
      params: { deploymentId }
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }

  /**
   * Get case instance count by deployment ID
   */
  getCaseInstanceCountByDeployment(deploymentId: string): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/case-instance/count`, {
      params: { deploymentId }
    }).pipe(
      map(res => res.count),
      catchError(() => of(0))
    );
  }
}
