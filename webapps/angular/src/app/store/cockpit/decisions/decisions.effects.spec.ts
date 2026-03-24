import { of, throwError, firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { DecisionsEffects } from './decisions.effects';
import * as DecisionsActions from './decisions.actions';
import { CockpitService, DecisionDefinition, DecisionInstance } from '../../../services/cockpit.service';
import { initTestEnvironment } from '../../../testing/test-utils';

describe('DecisionsEffects', () => {
  beforeAll(() => { initTestEnvironment(); });

  let cockpitService: any;

  const mockDefinitions: DecisionDefinition[] = [
    { id: 'dd-1', key: 'approveInvoice', name: 'Approve Invoice', version: 1, deploymentId: 'dep-1' },
    { id: 'dd-2', key: 'denyInvoice', name: 'Deny Invoice', version: 1, deploymentId: 'dep-2' },
  ];

  const mockInstances: DecisionInstance[] = [
    {
      id: 'di-1',
      decisionDefinitionId: 'dd-1',
      decisionDefinitionKey: 'approveInvoice',
      evaluationTime: '2026-01-01T10:00:00.000+0000',
    },
    {
      id: 'di-2',
      decisionDefinitionId: 'dd-1',
      decisionDefinitionKey: 'approveInvoice',
      evaluationTime: '2026-01-02T10:00:00.000+0000',
    },
  ];

  const mockInstanceWithIO: DecisionInstance = {
    id: 'di-1',
    decisionDefinitionId: 'dd-1',
    decisionDefinitionKey: 'approveInvoice',
    evaluationTime: '2026-01-01T10:00:00.000+0000',
    inputs: [{ id: 'in-1', decisionInstanceId: 'di-1', clauseId: 'c1', type: 'String', value: 'approved' }],
    outputs: [{ id: 'out-1', decisionInstanceId: 'di-1', clauseId: 'c2', ruleId: 'r1', ruleOrder: 1, variableName: 'result', type: 'String', value: 'approved' }],
  };

  function createEffects(actions$: Actions): DecisionsEffects {
    cockpitService = {
      getDecisionDefinitions: vi.fn(),
      getDecisionInstances: vi.fn(),
      getDecisionInstance: vi.fn(),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        DecisionsEffects,
        { provide: Actions, useValue: actions$ },
        { provide: CockpitService, useValue: cockpitService },
      ],
    });

    return TestBed.inject(DecisionsEffects);
  }

  // =============================================
  // loadDecisionDefinitions$
  // =============================================

  describe('loadDecisionDefinitions$', () => {
    it('should dispatch loadDecisionDefinitionsSuccess on success', async () => {
      const actions$ = new Actions(of(DecisionsActions.loadDecisionDefinitions()));
      const effects = createEffects(actions$);
      cockpitService.getDecisionDefinitions.mockReturnValue(of(mockDefinitions));

      const action = await firstValueFrom(effects.loadDecisionDefinitions$);
      expect(action).toEqual(
        DecisionsActions.loadDecisionDefinitionsSuccess({ definitions: mockDefinitions })
      );
    });

    it('should dispatch loadDecisionDefinitionsFailure on error', async () => {
      const error = new Error('HTTP 500');
      const actions$ = new Actions(of(DecisionsActions.loadDecisionDefinitions()));
      const effects = createEffects(actions$);
      cockpitService.getDecisionDefinitions.mockReturnValue(throwError(() => error));

      const action = await firstValueFrom(effects.loadDecisionDefinitions$);
      expect(action).toEqual(
        DecisionsActions.loadDecisionDefinitionsFailure({ error })
      );
    });
  });

  // =============================================
  // loadDecisionInstances$
  // =============================================

  describe('loadDecisionInstances$', () => {
    it('should dispatch loadDecisionInstancesSuccess on success', async () => {
      const actions$ = new Actions(
        of(DecisionsActions.loadDecisionInstances({ definitionId: 'dd-1', maxResults: 50 }))
      );
      const effects = createEffects(actions$);
      cockpitService.getDecisionInstances.mockReturnValue(of(mockInstances));

      const action = await firstValueFrom(effects.loadDecisionInstances$);
      expect(action).toEqual(
        DecisionsActions.loadDecisionInstancesSuccess({ instances: mockInstances })
      );
    });

    it('should pass definitionId and maxResults to the service', async () => {
      const actions$ = new Actions(
        of(DecisionsActions.loadDecisionInstances({ definitionId: 'dd-1', maxResults: 25 }))
      );
      const effects = createEffects(actions$);
      cockpitService.getDecisionInstances.mockReturnValue(of([]));

      await firstValueFrom(effects.loadDecisionInstances$);
      expect(cockpitService.getDecisionInstances).toHaveBeenCalledWith('dd-1', 25);
    });

    it('should handle undefined definitionId (all instances)', async () => {
      const actions$ = new Actions(
        of(DecisionsActions.loadDecisionInstances({}))
      );
      const effects = createEffects(actions$);
      cockpitService.getDecisionInstances.mockReturnValue(of(mockInstances));

      const action = await firstValueFrom(effects.loadDecisionInstances$);
      expect(action).toEqual(
        DecisionsActions.loadDecisionInstancesSuccess({ instances: mockInstances })
      );
      expect(cockpitService.getDecisionInstances).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should dispatch loadDecisionInstancesFailure on error', async () => {
      const error = new Error('Timeout');
      const actions$ = new Actions(
        of(DecisionsActions.loadDecisionInstances({}))
      );
      const effects = createEffects(actions$);
      cockpitService.getDecisionInstances.mockReturnValue(throwError(() => error));

      const action = await firstValueFrom(effects.loadDecisionInstances$);
      expect(action).toEqual(
        DecisionsActions.loadDecisionInstancesFailure({ error })
      );
    });
  });

  // =============================================
  // loadDecisionInstance$
  // =============================================

  describe('loadDecisionInstance$', () => {
    it('should dispatch loadDecisionInstanceSuccess when instance found', async () => {
      const actions$ = new Actions(
        of(DecisionsActions.loadDecisionInstance({ decisionId: 'di-1' }))
      );
      const effects = createEffects(actions$);
      cockpitService.getDecisionInstance.mockReturnValue(of(mockInstanceWithIO));

      const action = await firstValueFrom(effects.loadDecisionInstance$);
      expect(action).toEqual(
        DecisionsActions.loadDecisionInstanceSuccess({ decision: mockInstanceWithIO })
      );
    });

    it('should dispatch loadDecisionInstanceFailure when instance is null (not found)', async () => {
      const actions$ = new Actions(
        of(DecisionsActions.loadDecisionInstance({ decisionId: 'di-999' }))
      );
      const effects = createEffects(actions$);
      cockpitService.getDecisionInstance.mockReturnValue(of(null));

      const action = await firstValueFrom(effects.loadDecisionInstance$);
      expect(action).toEqual(
        DecisionsActions.loadDecisionInstanceFailure({ error: 'Decision not found' })
      );
    });

    it('should dispatch loadDecisionInstanceFailure on HTTP error', async () => {
      const error = new Error('HTTP 404');
      const actions$ = new Actions(
        of(DecisionsActions.loadDecisionInstance({ decisionId: 'di-1' }))
      );
      const effects = createEffects(actions$);
      cockpitService.getDecisionInstance.mockReturnValue(throwError(() => error));

      const action = await firstValueFrom(effects.loadDecisionInstance$);
      expect(action).toEqual(
        DecisionsActions.loadDecisionInstanceFailure({ error })
      );
    });
  });
});
