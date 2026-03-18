import { processesReducer } from './processes.reducer';
import { initialProcessesState, ProcessesState, processesAdapter } from './processes.state';
import * as ProcessesActions from './processes.actions';
import { ProcessInstance, ProcessInstanceDetail, ProcessDefinition } from '../../../services/cockpit.service';

describe('Processes Reducer', () => {
  const mockProcessInstance: ProcessInstance = {
    id: 'pi-1',
    processDefinitionId: 'pd-1',
    processDefinitionKey: 'invoice',
    startTime: '2026-01-01T00:00:00.000+0000',
    state: 'ACTIVE',
  };

  const mockProcessInstance2: ProcessInstance = {
    id: 'pi-2',
    processDefinitionId: 'pd-1',
    processDefinitionKey: 'invoice',
    startTime: '2026-01-02T00:00:00.000+0000',
    state: 'ACTIVE',
  };

  const mockProcessDetail: ProcessInstanceDetail = {
    ...mockProcessInstance,
    variables: [
      { name: 'amount', type: 'Double', value: 300.0, processInstanceId: 'pi-1' },
    ],
    activities: [
      {
        id: 'ai-1',
        activityId: 'UserTask_1',
        activityName: 'Approve Invoice',
        activityType: 'userTask',
        startTime: '2026-01-01T00:00:01.000+0000',
      },
    ],
  };

  const mockDefinitions: ProcessDefinition[] = [
    {
      id: 'pd-1',
      key: 'invoice',
      name: 'Invoice Process',
      version: 1,
      deploymentId: 'dep-1',
      suspended: false,
    },
    {
      id: 'pd-2',
      key: 'order',
      name: 'Order Process',
      version: 1,
      deploymentId: 'dep-2',
      suspended: false,
    },
  ];

  describe('unknown action', () => {
    it('should return the initial state', () => {
      const action = { type: 'UNKNOWN' } as any;
      const state = processesReducer(initialProcessesState, action);
      expect(state).toBe(initialProcessesState);
    });
  });

  // =============================================
  // Load Process Definitions
  // =============================================

  describe('loadProcessDefinitions', () => {
    it('should set loadingDefinitions to true and clear error', () => {
      const stateWithError: ProcessesState = {
        ...initialProcessesState,
        error: 'previous error',
        loadingDefinitions: false,
      };
      const action = ProcessesActions.loadProcessDefinitions();
      const state = processesReducer(stateWithError, action);

      expect(state.loadingDefinitions).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('loadProcessDefinitionsSuccess', () => {
    it('should set definitions and clear loadingDefinitions', () => {
      const loadingState: ProcessesState = {
        ...initialProcessesState,
        loadingDefinitions: true,
      };
      const action = ProcessesActions.loadProcessDefinitionsSuccess({
        definitions: mockDefinitions,
      });
      const state = processesReducer(loadingState, action);

      expect(state.processDefinitions).toEqual(mockDefinitions);
      expect(state.loadingDefinitions).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadProcessDefinitionsFailure', () => {
    it('should set error and clear loadingDefinitions', () => {
      const loadingState: ProcessesState = {
        ...initialProcessesState,
        loadingDefinitions: true,
      };
      const error = { message: 'Network error' };
      const action = ProcessesActions.loadProcessDefinitionsFailure({ error });
      const state = processesReducer(loadingState, action);

      expect(state.loadingDefinitions).toBe(false);
      expect(state.error).toEqual(error);
    });
  });

  // =============================================
  // Load Process Instances
  // =============================================

  describe('loadProcessInstances', () => {
    it('should set loading to true and clear error', () => {
      const stateWithError: ProcessesState = {
        ...initialProcessesState,
        error: 'previous error',
      };
      const action = ProcessesActions.loadProcessInstances({ params: {} });
      const state = processesReducer(stateWithError, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('loadProcessInstancesSuccess', () => {
    it('should replace all entities, set total, and clear loading', () => {
      const loadingState: ProcessesState = {
        ...initialProcessesState,
        loading: true,
      };
      const action = ProcessesActions.loadProcessInstancesSuccess({
        instances: [mockProcessInstance, mockProcessInstance2],
        total: 42,
      });
      const state = processesReducer(loadingState, action);

      const allInstances = processesAdapter.getSelectors().selectAll(state);
      expect(allInstances.length).toBe(2);
      expect(allInstances[0].id).toBe('pi-1');
      expect(allInstances[1].id).toBe('pi-2');
      expect(state.total).toBe(42);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should replace previous entities with new set', () => {
      // First load
      const action1 = ProcessesActions.loadProcessInstancesSuccess({
        instances: [mockProcessInstance],
        total: 1,
      });
      const state1 = processesReducer(initialProcessesState, action1);

      // Second load with different data
      const action2 = ProcessesActions.loadProcessInstancesSuccess({
        instances: [mockProcessInstance2],
        total: 1,
      });
      const state2 = processesReducer(state1, action2);

      const allInstances = processesAdapter.getSelectors().selectAll(state2);
      expect(allInstances.length).toBe(1);
      expect(allInstances[0].id).toBe('pi-2');
    });
  });

  describe('loadProcessInstancesFailure', () => {
    it('should set error and clear loading', () => {
      const loadingState: ProcessesState = {
        ...initialProcessesState,
        loading: true,
      };
      const error = { status: 500, message: 'Server error' };
      const action = ProcessesActions.loadProcessInstancesFailure({ error });
      const state = processesReducer(loadingState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toEqual(error);
    });
  });

  // =============================================
  // Load Process Instance Detail
  // =============================================

  describe('loadProcessInstance', () => {
    it('should set loadingDetail to true and clear error', () => {
      const action = ProcessesActions.loadProcessInstance({ processId: 'pi-1' });
      const state = processesReducer(initialProcessesState, action);

      expect(state.loadingDetail).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('loadProcessInstanceSuccess', () => {
    it('should set selectedProcess and clear loadingDetail', () => {
      const loadingState: ProcessesState = {
        ...initialProcessesState,
        loadingDetail: true,
      };
      const action = ProcessesActions.loadProcessInstanceSuccess({
        process: mockProcessDetail,
      });
      const state = processesReducer(loadingState, action);

      expect(state.selectedProcess).toEqual(mockProcessDetail);
      expect(state.loadingDetail).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadProcessInstanceFailure', () => {
    it('should set error and clear loadingDetail', () => {
      const loadingState: ProcessesState = {
        ...initialProcessesState,
        loadingDetail: true,
      };
      const error = 'Process not found';
      const action = ProcessesActions.loadProcessInstanceFailure({ error });
      const state = processesReducer(loadingState, action);

      expect(state.loadingDetail).toBe(false);
      expect(state.error).toBe('Process not found');
    });
  });

  // =============================================
  // Set Query Params
  // =============================================

  describe('setProcessesQueryParams', () => {
    it('should update query params', () => {
      const params = {
        processDefinitionKey: 'invoice',
        firstResult: 10,
        maxResults: 25,
        sortBy: 'startTime',
        sortOrder: 'asc' as const,
      };
      const action = ProcessesActions.setProcessesQueryParams({ params });
      const state = processesReducer(initialProcessesState, action);

      expect(state.queryParams).toEqual(params);
    });

    it('should overwrite previous query params entirely', () => {
      const params1 = {
        processDefinitionKey: 'invoice',
        firstResult: 0,
        maxResults: 10,
        sortBy: 'startTime',
        sortOrder: 'desc' as const,
      };
      const state1 = processesReducer(
        initialProcessesState,
        ProcessesActions.setProcessesQueryParams({ params: params1 })
      );

      const params2 = {
        firstResult: 20,
        maxResults: 50,
        sortBy: 'endTime',
        sortOrder: 'asc' as const,
      };
      const state2 = processesReducer(
        state1,
        ProcessesActions.setProcessesQueryParams({ params: params2 })
      );

      expect(state2.queryParams).toEqual(params2);
      expect(state2.queryParams.processDefinitionKey).toBeUndefined();
    });
  });

  // =============================================
  // Clear Selected Process
  // =============================================

  describe('clearSelectedProcess', () => {
    it('should set selectedProcess to null', () => {
      const stateWithSelected: ProcessesState = {
        ...initialProcessesState,
        selectedProcess: mockProcessDetail,
      };
      const action = ProcessesActions.clearSelectedProcess();
      const state = processesReducer(stateWithSelected, action);

      expect(state.selectedProcess).toBeNull();
    });

    it('should not affect other state properties', () => {
      const stateWithData: ProcessesState = {
        ...initialProcessesState,
        selectedProcess: mockProcessDetail,
        processDefinitions: mockDefinitions,
        total: 42,
        loading: false,
      };
      const action = ProcessesActions.clearSelectedProcess();
      const state = processesReducer(stateWithData, action);

      expect(state.selectedProcess).toBeNull();
      expect(state.processDefinitions).toEqual(mockDefinitions);
      expect(state.total).toBe(42);
    });
  });

  // =============================================
  // Initial State
  // =============================================

  describe('initial state', () => {
    it('should have correct default values', () => {
      expect(initialProcessesState.selectedProcess).toBeNull();
      expect(initialProcessesState.processDefinitions).toEqual([]);
      expect(initialProcessesState.total).toBe(0);
      expect(initialProcessesState.loading).toBe(false);
      expect(initialProcessesState.loadingDefinitions).toBe(false);
      expect(initialProcessesState.loadingDetail).toBe(false);
      expect(initialProcessesState.error).toBeNull();
      expect(initialProcessesState.queryParams).toEqual({
        firstResult: 0,
        maxResults: 10,
        sortBy: 'startTime',
        sortOrder: 'desc',
      });
    });
  });
});
