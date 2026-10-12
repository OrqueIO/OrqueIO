/**
 * Test: Non-regression for buildDisplayStatePill
 *
 * Ensures that adding removal-time-process logic did NOT affect
 * existing operations' state pill behavior
 */

import { describe, it, expect } from 'vitest';
import { BatchOperationsWizardComponent } from './batch-operations-wizard';
import { MultiValueFilter } from '../../../../services/cockpit.service';

describe('BatchOperationsWizardComponent — buildDisplayStatePill NON-REGRESSION', () => {

  const component = Object.create(BatchOperationsWizardComponent.prototype);

  it('suspend → returns active state pill (unchanged)', () => {
    const result = component.buildDisplayStatePill('suspend', []);

    expect(result).toEqual({ field: 'state', values: ['active'] });
  });

  it('activate → returns suspended state pill (unchanged)', () => {
    const result = component.buildDisplayStatePill('activate', []);

    expect(result).toEqual({ field: 'state', values: ['suspended'] });
  });

  it('delete-finished with stateCompleted → returns completed pill (unchanged)', () => {
    const filters: MultiValueFilter[] = [
      { field: 'stateCompleted', values: [] }
    ];

    const result = component.buildDisplayStatePill('delete-finished', filters);

    expect(result).toEqual({ field: 'state', values: ['completed'] });
  });

  it('delete-finished with stateTerminated → returns terminated pill (unchanged)', () => {
    const filters: MultiValueFilter[] = [
      { field: 'stateTerminated', values: [] }
    ];

    const result = component.buildDisplayStatePill('delete-finished', filters);

    expect(result).toEqual({ field: 'state', values: ['terminated'] });
  });

  it('delete-finished with both states → returns finished pill (unchanged)', () => {
    const filters: MultiValueFilter[] = [
      { field: 'stateCompleted', values: [] },
      { field: 'stateTerminated', values: [] }
    ];

    const result = component.buildDisplayStatePill('delete-finished', filters);

    expect(result).toEqual({ field: 'state', values: ['finished'] });
  });

  it('delete-running with stateActive → returns active pill (unchanged)', () => {
    const filters: MultiValueFilter[] = [
      { field: 'stateActive', values: [] }
    ];

    const result = component.buildDisplayStatePill('delete-running', filters);

    expect(result).toEqual({ field: 'state', values: ['active'] });
  });

  it('delete-running with stateSuspended → returns suspended pill (unchanged)', () => {
    const filters: MultiValueFilter[] = [
      { field: 'stateSuspended', values: [] }
    ];

    const result = component.buildDisplayStatePill('delete-running', filters);

    expect(result).toEqual({ field: 'state', values: ['suspended'] });
  });

  it('delete-running with both states → returns unfinished pill (unchanged)', () => {
    const filters: MultiValueFilter[] = [
      { field: 'stateActive', values: [] },
      { field: 'stateSuspended', values: [] }
    ];

    const result = component.buildDisplayStatePill('delete-running', filters);

    expect(result).toEqual({ field: 'state', values: ['unfinished'] });
  });

  it('set-retries-jobs with stateActive → returns active pill (unchanged)', () => {
    const filters: MultiValueFilter[] = [
      { field: 'stateActive', values: [] }
    ];

    const result = component.buildDisplayStatePill('set-retries-jobs', filters);

    expect(result).toEqual({ field: 'state', values: ['active'] });
  });

  it('set-retries-external with stateSuspended → returns suspended pill (unchanged)', () => {
    const filters: MultiValueFilter[] = [
      { field: 'stateSuspended', values: [] }
    ];

    const result = component.buildDisplayStatePill('set-retries-external', filters);

    expect(result).toEqual({ field: 'state', values: ['suspended'] });
  });

  it('set-variables with no state filters → returns unfinished pill (unchanged)', () => {
    const result = component.buildDisplayStatePill('set-variables', []);

    expect(result).toEqual({ field: 'state', values: ['unfinished'] });
  });

  it('correlate with stateActive → returns active pill (unchanged)', () => {
    const filters: MultiValueFilter[] = [
      { field: 'stateActive', values: [] }
    ];

    const result = component.buildDisplayStatePill('correlate', filters);

    expect(result).toEqual({ field: 'state', values: ['active'] });
  });

  it('default operation (unknown) → returns active pill (unchanged)', () => {
    const result = component.buildDisplayStatePill('unknown-operation', []);

    expect(result).toEqual({ field: 'state', values: ['active'] });
  });
});
