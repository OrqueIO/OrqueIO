import { of, throwError, firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { ProcessesEffects } from './processes.effects';
import * as ProcessesActions from './processes.actions';
import { CockpitService } from '../../../services/cockpit.service';
import { ProcessInstance, ProcessInstanceDetail, ProcessDefinition } from '../../../services/cockpit.service';
import { initTestEnvironment } from '../../../testing/test-utils';

describe('ProcessesEffects', () => {
  beforeAll(() => { initTestEnvironment(); });

  let cockpitService: any;

  const mockDefinitions: ProcessDefinition[] = [
    { id: 'pd-1', key: 'invoice', name: 'Invoice', version: 1, deploymentId: 'd1', suspended: false },
  ];

  const mockInstances: ProcessInstance[] = [
    {
      id: 'pi-1',
      processDefinitionId: 'pd-1',
      processDefinitionKey: 'invoice',
      startTime: '2026-01-01T00:00:00.000+0000',
      state: 'ACTIVE',
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

  function createEffects(actions$: Actions): ProcessesEffects {
    cockpitService = {
      getProcessDefinitions: vi.fn(),
      getProcessInstances: vi.fn(),
      getProcessInstancesCount: vi.fn(),
      getProcessInstance: vi.fn(),
      getProcessInstanceVariables: vi.fn(),
      getProcessInstanceActivities: vi.fn(),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ProcessesEffects,
        { provide: Actions, useValue: actions$ },
        { provide: CockpitService, useValue: cockpitService },
      ],
    });

    return TestBed.inject(ProcessesEffects);
  }

  // =============================================
  // loadProcessDefinitions$
  // =============================================

  describe('loadProcessDefinitions$', () => {
    it('should return loadProcessDefinitionsSuccess on success', async () => {
      const actions$ = new Actions(of(ProcessesActions.loadProcessDefinitions()));
      const effects = createEffects(actions$);
      cockpitService.getProcessDefinitions.mockReturnValue(of(mockDefinitions));

      const action = await firstValueFrom(effects.loadProcessDefinitions$);
      expect(action).toEqual(
        ProcessesActions.loadProcessDefinitionsSuccess({ definitions: mockDefinitions })
      );
    });

    it('should return loadProcessDefinitionsFailure on error', async () => {
      const error = new Error('Network error');
      const actions$ = new Actions(of(ProcessesActions.loadProcessDefinitions()));
      const effects = createEffects(actions$);
      cockpitService.getProcessDefinitions.mockReturnValue(throwError(() => error));

      const action = await firstValueFrom(effects.loadProcessDefinitions$);
      expect(action.type).toBe('[Processes] Load Process Definitions Failure');
    });
  });

  // =============================================
  // loadProcessInstances$
  // =============================================

  describe('loadProcessInstances$', () => {
    it('should return loadProcessInstancesSuccess with instances and count', async () => {
      const params = { processDefinitionKey: 'invoice' };
      const actions$ = new Actions(of(ProcessesActions.loadProcessInstances({ params })));
      const effects = createEffects(actions$);
      cockpitService.getProcessInstances.mockReturnValue(of(mockInstances));
      cockpitService.getProcessInstancesCount.mockReturnValue(of(5));

      const action = await firstValueFrom(effects.loadProcessInstances$);
      expect(action).toEqual(
        ProcessesActions.loadProcessInstancesSuccess({
          instances: mockInstances,
          total: 5,
        })
      );
      expect(cockpitService.getProcessInstances).toHaveBeenCalledWith(params);
      expect(cockpitService.getProcessInstancesCount).toHaveBeenCalledWith(params);
    });

    it('should return loadProcessInstancesFailure on error', async () => {
      const error = new Error('Server error');
      const actions$ = new Actions(of(ProcessesActions.loadProcessInstances({ params: {} })));
      const effects = createEffects(actions$);
      cockpitService.getProcessInstances.mockReturnValue(throwError(() => error));
      cockpitService.getProcessInstancesCount.mockReturnValue(of(0));

      const action = await firstValueFrom(effects.loadProcessInstances$);
      expect(action.type).toBe('[Processes] Load Process Instances Failure');
    });
  });

  // =============================================
  // loadProcessInstance$
  // =============================================

  describe('loadProcessInstance$', () => {
    it('should return loadProcessInstanceSuccess with merged detail', async () => {
      const actions$ = new Actions(of(ProcessesActions.loadProcessInstance({ processId: 'pi-1' })));
      const effects = createEffects(actions$);
      cockpitService.getProcessInstance.mockReturnValue(of(mockDetail));
      cockpitService.getProcessInstanceVariables.mockReturnValue(of(mockDetail.variables));
      cockpitService.getProcessInstanceActivities.mockReturnValue(of(mockDetail.activities));

      const action: any = await firstValueFrom(effects.loadProcessInstance$);
      expect(action.type).toBe('[Processes] Load Process Instance Success');
      expect(action.process.id).toBe('pi-1');
      expect(action.process.variables.length).toBe(1);
      expect(action.process.activities.length).toBe(1);
    });

    it('should return loadProcessInstanceFailure when process is null', async () => {
      const actions$ = new Actions(of(ProcessesActions.loadProcessInstance({ processId: 'missing' })));
      const effects = createEffects(actions$);
      cockpitService.getProcessInstance.mockReturnValue(of(null));
      cockpitService.getProcessInstanceVariables.mockReturnValue(of([]));
      cockpitService.getProcessInstanceActivities.mockReturnValue(of([]));

      const action = await firstValueFrom(effects.loadProcessInstance$);
      expect(action.type).toBe('[Processes] Load Process Instance Failure');
    });

    it('should return loadProcessInstanceFailure on error', async () => {
      const error = new Error('Not found');
      const actions$ = new Actions(of(ProcessesActions.loadProcessInstance({ processId: 'pi-1' })));
      const effects = createEffects(actions$);
      cockpitService.getProcessInstance.mockReturnValue(throwError(() => error));
      cockpitService.getProcessInstanceVariables.mockReturnValue(of([]));
      cockpitService.getProcessInstanceActivities.mockReturnValue(of([]));

      const action = await firstValueFrom(effects.loadProcessInstance$);
      expect(action.type).toBe('[Processes] Load Process Instance Failure');
    });
  });
});
