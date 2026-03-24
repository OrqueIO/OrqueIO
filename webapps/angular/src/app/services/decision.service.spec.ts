import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  DecisionService,
  DecisionDefinition,
  DecisionInstance,
  DecisionRequirementsDefinition,
  DecisionInstanceQueryParams,
} from './decision.service';
import { initTestEnvironment } from '../testing/test-utils';

describe('DecisionService', () => {
  let service: DecisionService;
  let httpMock: HttpTestingController;

  const baseUrl = '/orqueio/api/engine/engine/default';
  const historyUrl = `${baseUrl}/history`;

  beforeAll(() => { initTestEnvironment(); });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DecisionService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(DecisionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  const mockDef: DecisionDefinition = {
    id: 'dd-1',
    key: 'approveInvoice',
    name: 'Approve Invoice',
    version: 1,
    deploymentId: 'dep-1',
  };

  const mockDef2: DecisionDefinition = {
    id: 'dd-2',
    key: 'denyInvoice',
    name: 'Deny Invoice',
    version: 2,
    deploymentId: 'dep-1',
    tenantId: 'tenant-a',
  };

  const mockInstance: DecisionInstance = {
    id: 'di-1',
    decisionDefinitionId: 'dd-1',
    decisionDefinitionKey: 'approveInvoice',
    evaluationTime: '2026-01-01T10:00:00.000+0000',
  };

  // =============================================
  // Decision Definition CRUD
  // =============================================

  describe('getDecisionDefinitions', () => {
    it('should fetch latest definitions sorted by name with default maxResults', () => {
      service.getDecisionDefinitions().subscribe(defs => {
        expect(defs).toEqual([mockDef, mockDef2]);
      });

      const req = httpMock.expectOne(
        r => r.url === `${baseUrl}/decision-definition` && r.params.get('latestVersion') === 'true'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('sortBy')).toBe('name');
      expect(req.request.params.get('sortOrder')).toBe('asc');
      expect(req.request.params.get('maxResults')).toBe('1000');
      req.flush([mockDef, mockDef2]);
    });

    it('should accept custom maxResults', () => {
      service.getDecisionDefinitions(25).subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${baseUrl}/decision-definition` && r.params.get('maxResults') === '25'
      );
      req.flush([]);
    });

    it('should return empty array on error', () => {
      service.getDecisionDefinitions().subscribe(defs => {
        expect(defs).toEqual([]);
      });
      const req = httpMock.expectOne(r => r.url === `${baseUrl}/decision-definition`);
      req.error(new ProgressEvent('Network error'));
    });
  });

  describe('getDecisionDefinition', () => {
    it('should fetch a decision definition by id', () => {
      service.getDecisionDefinition('dd-1').subscribe(def => {
        expect(def).toEqual(mockDef);
      });
      const req = httpMock.expectOne(`${baseUrl}/decision-definition/dd-1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockDef);
    });

    it('should return null on error', () => {
      service.getDecisionDefinition('missing').subscribe(def => {
        expect(def).toBeNull();
      });
      const req = httpMock.expectOne(`${baseUrl}/decision-definition/missing`);
      req.error(new ProgressEvent('404'));
    });
  });

  describe('getDecisionDefinitionVersions', () => {
    it('should fetch all versions sorted desc without tenant', () => {
      service.getDecisionDefinitionVersions('approveInvoice').subscribe(versions => {
        expect(versions).toEqual([mockDef]);
      });

      const req = httpMock.expectOne(
        r => r.url === `${baseUrl}/decision-definition` && r.params.get('key') === 'approveInvoice'
      );
      expect(req.request.params.get('sortBy')).toBe('version');
      expect(req.request.params.get('sortOrder')).toBe('desc');
      expect(req.request.params.get('withoutTenantId')).toBe('true');
      req.flush([mockDef]);
    });

    it('should add tenantIdIn param when tenantId is provided', () => {
      service.getDecisionDefinitionVersions('approveInvoice', 'tenant-a').subscribe();

      const req = httpMock.expectOne(
        r => r.url === `${baseUrl}/decision-definition` && r.params.get('tenantIdIn') === 'tenant-a'
      );
      expect(req.request.params.has('withoutTenantId')).toBe(false);
      req.flush([]);
    });

    it('should return empty array on error', () => {
      service.getDecisionDefinitionVersions('bad-key').subscribe(v => {
        expect(v).toEqual([]);
      });
      const req = httpMock.expectOne(r => r.url === `${baseUrl}/decision-definition`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('getDecisionDefinitionsCount', () => {
    it('should return count with latestVersion=true by default', () => {
      service.getDecisionDefinitionsCount().subscribe(count => {
        expect(count).toBe(5);
      });
      const req = httpMock.expectOne(
        r => r.url === `${baseUrl}/decision-definition/count` && r.params.get('latestVersion') === 'true'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ count: 5 });
    });

    it('should pass nameLike param', () => {
      service.getDecisionDefinitionsCount(true, '%invoice%').subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${baseUrl}/decision-definition/count` && r.params.get('nameLike') === '%invoice%'
      );
      req.flush({ count: 2 });
    });

    it('should pass keyLike param', () => {
      service.getDecisionDefinitionsCount(true, undefined, '%approve%').subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${baseUrl}/decision-definition/count` && r.params.get('keyLike') === '%approve%'
      );
      req.flush({ count: 3 });
    });

    it('should return 0 on error', () => {
      service.getDecisionDefinitionsCount().subscribe(count => {
        expect(count).toBe(0);
      });
      const req = httpMock.expectOne(r => r.url === `${baseUrl}/decision-definition/count`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('getDecisionDefinitionsPaginated', () => {
    it('should pass firstResult and maxResults', () => {
      service.getDecisionDefinitionsPaginated({ firstResult: 50, maxResults: 25 }).subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${baseUrl}/decision-definition`
          && r.params.get('firstResult') === '50'
          && r.params.get('maxResults') === '25'
      );
      req.flush([]);
    });

    it('should pass sortBy and sortOrder', () => {
      service.getDecisionDefinitionsPaginated({ sortBy: 'key', sortOrder: 'desc' }).subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${baseUrl}/decision-definition`
          && r.params.get('sortBy') === 'key'
          && r.params.get('sortOrder') === 'desc'
      );
      req.flush([]);
    });

    it('should set latestVersion=true when not explicitly false', () => {
      service.getDecisionDefinitionsPaginated({}).subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${baseUrl}/decision-definition` && r.params.get('latestVersion') === 'true'
      );
      req.flush([]);
    });

    it('should pass nameLike and keyLike filters', () => {
      service.getDecisionDefinitionsPaginated({ nameLike: '%approve%', keyLike: '%inv%' }).subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${baseUrl}/decision-definition`
          && r.params.get('nameLike') === '%approve%'
          && r.params.get('keyLike') === '%inv%'
      );
      req.flush([mockDef]);
    });

    it('should return empty array on error', () => {
      service.getDecisionDefinitionsPaginated({}).subscribe(defs => {
        expect(defs).toEqual([]);
      });
      const req = httpMock.expectOne(r => r.url === `${baseUrl}/decision-definition`);
      req.error(new ProgressEvent('error'));
    });
  });

  // =============================================
  // DMN XML
  // =============================================

  describe('getDecisionXml', () => {
    it('should fetch DMN XML for a decision definition', () => {
      const mockXml = { id: 'dd-1', dmnXml: '<definitions>...</definitions>' };
      service.getDecisionXml('dd-1').subscribe(result => {
        expect(result).toEqual(mockXml);
      });
      const req = httpMock.expectOne(`${baseUrl}/decision-definition/dd-1/xml`);
      expect(req.request.method).toBe('GET');
      req.flush(mockXml);
    });

    it('should return null on error', () => {
      service.getDecisionXml('bad-id').subscribe(result => {
        expect(result).toBeNull();
      });
      const req = httpMock.expectOne(`${baseUrl}/decision-definition/bad-id/xml`);
      req.error(new ProgressEvent('error'));
    });
  });

  // =============================================
  // Decision Requirements Definitions (DRD)
  // =============================================

  describe('getDecisionRequirementsDefinitions', () => {
    it('should fetch DRDs sorted by name with latestVersion', () => {
      const mockDrd: DecisionRequirementsDefinition = {
        id: 'drd-1', key: 'invoiceDrd', version: 1, deploymentId: 'dep-1',
      };

      service.getDecisionRequirementsDefinitions().subscribe(drds => {
        expect(drds).toEqual([mockDrd]);
      });

      const req = httpMock.expectOne(
        r => r.url === `${baseUrl}/decision-requirements-definition`
          && r.params.get('latestVersion') === 'true'
      );
      expect(req.request.params.get('sortBy')).toBe('name');
      expect(req.request.params.get('sortOrder')).toBe('asc');
      expect(req.request.params.get('maxResults')).toBe('1000');
      req.flush([mockDrd]);
    });

    it('should accept custom maxResults', () => {
      service.getDecisionRequirementsDefinitions(50).subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${baseUrl}/decision-requirements-definition` && r.params.get('maxResults') === '50'
      );
      req.flush([]);
    });

    it('should return empty array on error', () => {
      service.getDecisionRequirementsDefinitions().subscribe(drds => {
        expect(drds).toEqual([]);
      });
      const req = httpMock.expectOne(r => r.url === `${baseUrl}/decision-requirements-definition`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('getDecisionRequirementsDefinition', () => {
    it('should fetch a single DRD by id', () => {
      const mockDrd: DecisionRequirementsDefinition = {
        id: 'drd-1', key: 'invoiceDrd', version: 1, deploymentId: 'dep-1',
      };
      service.getDecisionRequirementsDefinition('drd-1').subscribe(drd => {
        expect(drd).toEqual(mockDrd);
      });
      const req = httpMock.expectOne(`${baseUrl}/decision-requirements-definition/drd-1`);
      req.flush(mockDrd);
    });

    it('should return null on error', () => {
      service.getDecisionRequirementsDefinition('missing').subscribe(drd => {
        expect(drd).toBeNull();
      });
      const req = httpMock.expectOne(`${baseUrl}/decision-requirements-definition/missing`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('getDecisionRequirementsDefinitionXml', () => {
    it('should fetch DMN XML for a DRD', () => {
      const mockXml = { id: 'drd-1', dmnXml: '<definitions drd/>' };
      service.getDecisionRequirementsDefinitionXml('drd-1').subscribe(result => {
        expect(result).toEqual(mockXml);
      });
      const req = httpMock.expectOne(`${baseUrl}/decision-requirements-definition/drd-1/xml`);
      req.flush(mockXml);
    });

    it('should return null on error', () => {
      service.getDecisionRequirementsDefinitionXml('bad').subscribe(result => {
        expect(result).toBeNull();
      });
      const req = httpMock.expectOne(`${baseUrl}/decision-requirements-definition/bad/xml`);
      req.error(new ProgressEvent('error'));
    });
  });

  // =============================================
  // Decision Instances
  // =============================================

  describe('getDecisionInstances', () => {
    it('should fetch instances sorted by evaluationTime desc with default maxResults', () => {
      service.getDecisionInstances().subscribe(instances => {
        expect(instances).toEqual([mockInstance]);
      });

      const req = httpMock.expectOne(
        r => r.url === `${historyUrl}/decision-instance`
          && r.params.get('sortBy') === 'evaluationTime'
          && r.params.get('sortOrder') === 'desc'
          && r.params.get('maxResults') === '100'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.has('decisionDefinitionId')).toBe(false);
      req.flush([mockInstance]);
    });

    it('should add decisionDefinitionId param when provided', () => {
      service.getDecisionInstances('dd-1').subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${historyUrl}/decision-instance` && r.params.get('decisionDefinitionId') === 'dd-1'
      );
      req.flush([mockInstance]);
    });

    it('should accept custom maxResults', () => {
      service.getDecisionInstances(undefined, 200).subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${historyUrl}/decision-instance` && r.params.get('maxResults') === '200'
      );
      req.flush([]);
    });

    it('should return empty array on error', () => {
      service.getDecisionInstances().subscribe(instances => {
        expect(instances).toEqual([]);
      });
      const req = httpMock.expectOne(r => r.url === `${historyUrl}/decision-instance`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('getDecisionInstancesPaginated', () => {
    it('should pass decisionDefinitionId', () => {
      const params: DecisionInstanceQueryParams = { decisionDefinitionId: 'dd-1' };
      service.getDecisionInstancesPaginated(params).subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${historyUrl}/decision-instance` && r.params.get('decisionDefinitionId') === 'dd-1'
      );
      req.flush([]);
    });

    it('should pass decisionDefinitionKey', () => {
      service.getDecisionInstancesPaginated({ decisionDefinitionKey: 'approveInvoice' }).subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${historyUrl}/decision-instance` && r.params.get('decisionDefinitionKey') === 'approveInvoice'
      );
      req.flush([]);
    });

    it('should pass date range filters', () => {
      service.getDecisionInstancesPaginated({
        evaluatedBefore: '2026-01-31T00:00:00',
        evaluatedAfter: '2026-01-01T00:00:00',
      }).subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${historyUrl}/decision-instance`
          && r.params.get('evaluatedBefore') === '2026-01-31T00:00:00'
          && r.params.get('evaluatedAfter') === '2026-01-01T00:00:00'
      );
      req.flush([]);
    });

    it('should pass activityIdIn as comma-separated string', () => {
      service.getDecisionInstancesPaginated({ activityIdIn: ['act1', 'act2'] }).subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${historyUrl}/decision-instance` && r.params.get('activityIdIn') === 'act1,act2'
      );
      req.flush([]);
    });

    it('should pass pagination params', () => {
      service.getDecisionInstancesPaginated({ firstResult: 50, maxResults: 25 }).subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${historyUrl}/decision-instance`
          && r.params.get('firstResult') === '50'
          && r.params.get('maxResults') === '25'
      );
      req.flush([]);
    });

    it('should pass sorting params', () => {
      service.getDecisionInstancesPaginated({ sortBy: 'evaluationTime', sortOrder: 'asc' }).subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${historyUrl}/decision-instance`
          && r.params.get('sortBy') === 'evaluationTime'
          && r.params.get('sortOrder') === 'asc'
      );
      req.flush([]);
    });

    it('should pass includeInputs and includeOutputs', () => {
      service.getDecisionInstancesPaginated({ includeInputs: true, includeOutputs: true }).subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${historyUrl}/decision-instance`
          && r.params.get('includeInputs') === 'true'
          && r.params.get('includeOutputs') === 'true'
      );
      req.flush([]);
    });

    it('should return empty array on error', () => {
      service.getDecisionInstancesPaginated({}).subscribe(instances => {
        expect(instances).toEqual([]);
      });
      const req = httpMock.expectOne(r => r.url === `${historyUrl}/decision-instance`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('getDecisionInstancesCount', () => {
    it('should return count without filter', () => {
      service.getDecisionInstancesCount().subscribe(count => {
        expect(count).toBe(42);
      });
      const req = httpMock.expectOne(`${historyUrl}/decision-instance/count`);
      req.flush({ count: 42 });
    });

    it('should pass decisionDefinitionId when provided', () => {
      service.getDecisionInstancesCount('dd-1').subscribe();
      const req = httpMock.expectOne(
        r => r.url === `${historyUrl}/decision-instance/count` && r.params.get('decisionDefinitionId') === 'dd-1'
      );
      req.flush({ count: 7 });
    });

    it('should return 0 on error', () => {
      service.getDecisionInstancesCount().subscribe(count => {
        expect(count).toBe(0);
      });
      const req = httpMock.expectOne(r => r.url === `${historyUrl}/decision-instance/count`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('getDecisionInstance', () => {
    it('should fetch a single instance by id with inputs and outputs', () => {
      const fullInstance: DecisionInstance = {
        ...mockInstance,
        inputs: [{ id: 'in-1', decisionInstanceId: 'di-1', clauseId: 'c1', type: 'String', value: 'ok' }],
        outputs: [{ id: 'out-1', decisionInstanceId: 'di-1', clauseId: 'c2', ruleId: 'r1', ruleOrder: 1, variableName: 'result', type: 'String', value: 'approved' }],
      };

      service.getDecisionInstance('di-1').subscribe(instance => {
        expect(instance).toEqual(fullInstance);
      });

      const req = httpMock.expectOne(
        r => r.url === `${historyUrl}/decision-instance`
          && r.params.get('decisionInstanceId') === 'di-1'
          && r.params.get('includeInputs') === 'true'
          && r.params.get('includeOutputs') === 'true'
          && r.params.get('maxResults') === '1'
      );
      expect(req.request.method).toBe('GET');
      req.flush([fullInstance]);
    });

    it('should return null when no results returned', () => {
      service.getDecisionInstance('di-999').subscribe(instance => {
        expect(instance).toBeNull();
      });
      const req = httpMock.expectOne(r => r.params.get('decisionInstanceId') === 'di-999');
      req.flush([]);
    });

    it('should return null on HTTP error', () => {
      service.getDecisionInstance('di-err').subscribe(instance => {
        expect(instance).toBeNull();
      });
      const req = httpMock.expectOne(r => r.params.get('decisionInstanceId') === 'di-err');
      req.error(new ProgressEvent('error'));
    });
  });
});
