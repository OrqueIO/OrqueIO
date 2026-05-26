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

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  DeploymentService,
  Deployment,
  DeploymentResource,
  ProcessDefinition,
  DecisionDefinition,
  CaseDefinition,
} from './deployment.service';
import { initTestEnvironment } from '../testing/test-utils';

describe('DeploymentService', () => {
  let service: DeploymentService;
  let httpMock: HttpTestingController;
  const baseUrl = '/orqueio/api/engine/engine/default';

  beforeAll(() => { initTestEnvironment(); });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DeploymentService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(DeploymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // =============================================
  // getDeployments
  // =============================================

  describe('getDeployments', () => {
    it('should fetch deployments with default maxResults of 50', () => {
      const mockDeployments: Deployment[] = [
        { id: 'd-1', name: 'Invoice', source: null, deploymentTime: '2026-01-01T00:00:00.000Z', tenantId: null },
        { id: 'd-2', name: 'Order', source: null, deploymentTime: '2026-01-02T00:00:00.000Z', tenantId: null },
      ];

      service.getDeployments().subscribe((deployments) => {
        expect(deployments).toEqual(mockDeployments);
        expect(deployments.length).toBe(2);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/deployment` && r.params.get('maxResults') === '50'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockDeployments);
    });

    it('should apply name filter when provided', () => {
      service.getDeployments({ name: 'Invoice' }).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/deployment` && r.params.get('name') === 'Invoice'
      );
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should apply sorting params when sortBy and sortOrder are provided', () => {
      service.getDeployments({ sortBy: 'name', sortOrder: 'asc' }).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/deployment` && r.params.get('sortBy') === 'name'
      );
      expect(req.request.params.get('sortOrder')).toBe('asc');
      req.flush([]);
    });

    it('should return empty array on error', () => {
      service.getDeployments().subscribe((deployments) => {
        expect(deployments).toEqual([]);
      });

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/deployment`);
      req.error(new ProgressEvent('Network error'));
    });
  });

  // =============================================
  // getDeploymentsCount
  // =============================================

  describe('getDeploymentsCount', () => {
    it('should return the count of deployments', () => {
      service.getDeploymentsCount().subscribe((count) => {
        expect(count).toBe(5);
      });

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/deployment/count`);
      expect(req.request.method).toBe('GET');
      req.flush({ count: 5 });
    });

    it('should return 0 on error', () => {
      service.getDeploymentsCount().subscribe((count) => {
        expect(count).toBe(0);
      });

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/deployment/count`);
      req.error(new ProgressEvent('Network error'));
    });

    it('should apply name filter when provided', () => {
      service.getDeploymentsCount({ name: 'Invoice' }).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/deployment/count` && r.params.get('name') === 'Invoice'
      );
      req.flush({ count: 1 });
    });
  });

  // =============================================
  // deleteDeployment
  // =============================================

  describe('deleteDeployment', () => {
    it('should send DELETE request to correct URL', () => {
      service.deleteDeployment('d-1').subscribe();

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/deployment/d-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should set cascade param when option is true', () => {
      service.deleteDeployment('d-1', { cascade: true }).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/deployment/d-1` && r.params.get('cascade') === 'true'
      );
      req.flush(null);
    });

    it('should set skipCustomListeners param when option is true', () => {
      service.deleteDeployment('d-1', { skipCustomListeners: true }).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/deployment/d-1` && r.params.get('skipCustomListeners') === 'true'
      );
      req.flush(null);
    });
  });

  // =============================================
  // getDeploymentResources
  // =============================================

  describe('getDeploymentResources', () => {
    it('should fetch resources for a deployment', () => {
      const mockResources: DeploymentResource[] = [
        { id: 'r-1', name: 'invoice.bpmn', deploymentId: 'd-1' },
        { id: 'r-2', name: 'invoice.png', deploymentId: 'd-1' },
      ];

      service.getDeploymentResources('d-1').subscribe((resources) => {
        expect(resources).toEqual(mockResources);
        expect(resources.length).toBe(2);
      });

      const req = httpMock.expectOne(`${baseUrl}/deployment/d-1/resources`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResources);
    });

    it('should return empty array on error', () => {
      service.getDeploymentResources('d-1').subscribe((resources) => {
        expect(resources).toEqual([]);
      });

      const req = httpMock.expectOne(`${baseUrl}/deployment/d-1/resources`);
      req.error(new ProgressEvent('Network error'));
    });
  });

  // =============================================
  // getResourceDownloadUrl
  // =============================================

  describe('getResourceDownloadUrl', () => {
    it('should return the correct download URL', () => {
      const url = service.getResourceDownloadUrl('d-1', 'r-1');
      expect(url).toBe(`${baseUrl}/deployment/d-1/resources/r-1/data`);
    });
  });

  // =============================================
  // getProcessDefinitionsByDeployment
  // =============================================

  describe('getProcessDefinitionsByDeployment', () => {
    it('should fetch process definitions for a deployment', () => {
      const mockDefs: ProcessDefinition[] = [
        { id: 'pd-1', key: 'invoice', name: 'Invoice', version: 1, deploymentId: 'd-1', suspended: false },
      ];

      service.getProcessDefinitionsByDeployment('d-1').subscribe((defs) => {
        expect(defs).toEqual(mockDefs);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/process-definition` && r.params.get('deploymentId') === 'd-1'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockDefs);
    });

    it('should return empty array on error', () => {
      service.getProcessDefinitionsByDeployment('d-1').subscribe((defs) => {
        expect(defs).toEqual([]);
      });

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/process-definition`);
      req.error(new ProgressEvent('Network error'));
    });
  });

  // =============================================
  // getDecisionDefinitionsByDeployment
  // =============================================

  describe('getDecisionDefinitionsByDeployment', () => {
    it('should fetch decision definitions for a deployment', () => {
      const mockDefs: DecisionDefinition[] = [
        { id: 'dd-1', key: 'discount', name: 'Discount', version: 1, deploymentId: 'd-1' },
      ];

      service.getDecisionDefinitionsByDeployment('d-1').subscribe((defs) => {
        expect(defs).toEqual(mockDefs);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/decision-definition` && r.params.get('deploymentId') === 'd-1'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockDefs);
    });

    it('should return empty array on error', () => {
      service.getDecisionDefinitionsByDeployment('d-1').subscribe((defs) => {
        expect(defs).toEqual([]);
      });

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/decision-definition`);
      req.error(new ProgressEvent('Network error'));
    });
  });

  // =============================================
  // getCaseDefinitionsByDeployment
  // =============================================

  describe('getCaseDefinitionsByDeployment', () => {
    it('should fetch case definitions for a deployment', () => {
      const mockDefs: CaseDefinition[] = [
        { id: 'cd-1', key: 'support', name: 'Support Case', version: 1, deploymentId: 'd-1' },
      ];

      service.getCaseDefinitionsByDeployment('d-1').subscribe((defs) => {
        expect(defs).toEqual(mockDefs);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/case-definition` && r.params.get('deploymentId') === 'd-1'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockDefs);
    });

    it('should return empty array on error', () => {
      service.getCaseDefinitionsByDeployment('d-1').subscribe((defs) => {
        expect(defs).toEqual([]);
      });

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/case-definition`);
      req.error(new ProgressEvent('Network error'));
    });
  });

  // =============================================
  // getProcessInstanceCountByDeployment
  // =============================================

  describe('getProcessInstanceCountByDeployment', () => {
    it('should return process instance count for a deployment', () => {
      service.getProcessInstanceCountByDeployment('d-1').subscribe((count) => {
        expect(count).toBe(12);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/process-instance/count` && r.params.get('deploymentId') === 'd-1'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ count: 12 });
    });

    it('should return 0 on error', () => {
      service.getProcessInstanceCountByDeployment('d-1').subscribe((count) => {
        expect(count).toBe(0);
      });

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/process-instance/count`);
      req.error(new ProgressEvent('Network error'));
    });
  });

  // =============================================
  // getCaseInstanceCountByDeployment
  // =============================================

  describe('getCaseInstanceCountByDeployment', () => {
    it('should return case instance count for a deployment', () => {
      service.getCaseInstanceCountByDeployment('d-1').subscribe((count) => {
        expect(count).toBe(3);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/case-instance/count` && r.params.get('deploymentId') === 'd-1'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ count: 3 });
    });

    it('should return 0 on error', () => {
      service.getCaseInstanceCountByDeployment('d-1').subscribe((count) => {
        expect(count).toBe(0);
      });

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/case-instance/count`);
      req.error(new ProgressEvent('Network error'));
    });
  });
});
