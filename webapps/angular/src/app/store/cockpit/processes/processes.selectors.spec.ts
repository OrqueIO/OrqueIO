import * as fromSelectors from './processes.selectors';
import { ProcessesState, initialProcessesState, processesAdapter } from './processes.state';
import { ProcessInstance, ProcessInstanceDetail } from '../../../services/cockpit.service';

describe('Processes Selectors', () => {
  const mockInstances: ProcessInstance[] = [
    {
      id: 'pi-1',
      processDefinitionId: 'pd-1',
      processDefinitionKey: 'invoice',
      startTime: '2026-01-01T00:00:00.000+0000',
      state: 'ACTIVE',
    },
    {
      id: 'pi-2',
      processDefinitionId: 'pd-1',
      processDefinitionKey: 'invoice',
      startTime: '2026-01-02T00:00:00.000+0000',
      state: 'COMPLETED',
      endTime: '2026-01-03T00:00:00.000+0000',
    },
  ];

  const mockDetail: ProcessInstanceDetail = {
    ...mockInstances[0],
    variables: [{ name: 'amount', type: 'Double', value: 100, processInstanceId: 'pi-1' }],
    activities: [
      {
        id: 'ai-1',
        activityId: 'UserTask_1',
        activityName: 'Approve',
        activityType: 'userTask',
        startTime: '2026-01-01T00:00:01.000+0000',
      },
    ],
  };

  const mockDefinitions = [
    { id: 'pd-1', key: 'invoice', name: 'Invoice', version: 1, deploymentId: 'd1', suspended: false },
    { id: 'pd-2', key: 'order', name: 'Order', version: 2, deploymentId: 'd2', suspended: false },
  ];

  function createState(overrides: Partial<ProcessesState> = {}): { cockpitProcesses: ProcessesState } {
    let state = { ...initialProcessesState, ...overrides };
    if (overrides.ids === undefined && mockInstances.length > 0) {
      state = processesAdapter.setAll(mockInstances, state);
    }
    return { cockpitProcesses: state };
  }

  describe('selectProcessesState', () => {
    it('should select the processes feature state', () => {
      const state = createState();
      const result = fromSelectors.selectProcessesState(state);
      expect(result).toBeDefined();
      expect(result.loading).toBe(false);
    });
  });

  describe('selectAllProcessInstances', () => {
    it('should return all process instances', () => {
      const state = createState();
      const result = fromSelectors.selectAllProcessInstances(state);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('pi-1');
      expect(result[1].id).toBe('pi-2');
    });

    it('should return empty array when no instances', () => {
      const state = createState({
        ids: [],
        entities: {},
      } as any);
      const result = fromSelectors.selectAllProcessInstances(state);
      expect(result).toEqual([]);
    });
  });

  describe('selectProcessInstanceEntities', () => {
    it('should return entities dictionary', () => {
      const state = createState();
      const result = fromSelectors.selectProcessInstanceEntities(state);
      expect(result['pi-1']).toBeDefined();
      expect(result['pi-2']).toBeDefined();
      expect(result['pi-1']!.processDefinitionKey).toBe('invoice');
    });
  });

  describe('selectProcessInstanceIds', () => {
    it('should return array of ids', () => {
      const state = createState();
      const result = fromSelectors.selectProcessInstanceIds(state);
      expect(result).toContain('pi-1');
      expect(result).toContain('pi-2');
    });
  });

  describe('selectProcessesLoading', () => {
    it('should return loading flag', () => {
      const state = createState({ loading: true });
      expect(fromSelectors.selectProcessesLoading(state)).toBe(true);
    });

    it('should return false when not loading', () => {
      const state = createState({ loading: false });
      expect(fromSelectors.selectProcessesLoading(state)).toBe(false);
    });
  });

  describe('selectProcessesTotal', () => {
    it('should return total count', () => {
      const state = createState({ total: 42 });
      expect(fromSelectors.selectProcessesTotal(state)).toBe(42);
    });
  });

  describe('selectProcessesQueryParams', () => {
    it('should return default query params', () => {
      const state = createState();
      const params = fromSelectors.selectProcessesQueryParams(state);
      expect(params.firstResult).toBe(0);
      expect(params.maxResults).toBe(10);
      expect(params.sortBy).toBe('startTime');
      expect(params.sortOrder).toBe('desc');
    });

    it('should return updated query params', () => {
      const customParams = {
        processDefinitionKey: 'invoice',
        firstResult: 10,
        maxResults: 25,
        sortBy: 'endTime',
        sortOrder: 'asc' as const,
      };
      const state = createState({ queryParams: customParams });
      expect(fromSelectors.selectProcessesQueryParams(state)).toEqual(customParams);
    });
  });

  describe('selectProcessesError', () => {
    it('should return null when no error', () => {
      const state = createState({ error: null });
      expect(fromSelectors.selectProcessesError(state)).toBeNull();
    });

    it('should return the error', () => {
      const error = { status: 500, message: 'Server Error' };
      const state = createState({ error });
      expect(fromSelectors.selectProcessesError(state)).toEqual(error);
    });
  });

  describe('selectSelectedProcess', () => {
    it('should return null when no process selected', () => {
      const state = createState({ selectedProcess: null });
      expect(fromSelectors.selectSelectedProcess(state)).toBeNull();
    });

    it('should return the selected process detail', () => {
      const state = createState({ selectedProcess: mockDetail });
      const result = fromSelectors.selectSelectedProcess(state);
      expect(result).toEqual(mockDetail);
      expect(result!.variables.length).toBe(1);
      expect(result!.activities.length).toBe(1);
    });
  });

  describe('selectProcessesLoadingDetail', () => {
    it('should return loadingDetail flag', () => {
      const state = createState({ loadingDetail: true });
      expect(fromSelectors.selectProcessesLoadingDetail(state)).toBe(true);
    });
  });

  describe('selectProcessDefinitions', () => {
    it('should return process definitions', () => {
      const state = createState({ processDefinitions: mockDefinitions });
      const result = fromSelectors.selectProcessDefinitions(state);
      expect(result.length).toBe(2);
      expect(result[0].key).toBe('invoice');
      expect(result[1].key).toBe('order');
    });

    it('should return empty array by default', () => {
      const state = createState();
      expect(fromSelectors.selectProcessDefinitions(state)).toEqual([]);
    });
  });

  describe('selectProcessDefinitionsLoading', () => {
    it('should return loadingDefinitions flag', () => {
      const state = createState({ loadingDefinitions: true });
      expect(fromSelectors.selectProcessDefinitionsLoading(state)).toBe(true);
    });
  });
});
