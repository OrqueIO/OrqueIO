import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

import { initTestEnvironment } from '../../testing/test-utils';
import { SearchCriteria, SearchType, SearchWidgetComponent } from './search-widget';

const STORAGE_KEY = 'search-widget-spec-criteria';

describe('SearchWidgetComponent saved criteria', () => {
  beforeAll(() => { initTestEnvironment(); });

  let component: SearchWidgetComponent;

  const variableType: SearchType = {
    key: 'processVariables',
    label: 'search.types.processVariable',
    allowName: true,
    operators: [{ key: 'eq', label: 'search.operators.equals' }]
  };

  // Saved before the labels became translation keys: the English text of that day
  const savedBefore: SearchCriteria = {
    type: { ...variableType, label: 'Process Variable' },
    operator: { key: 'eq', label: 'equals' },
    name: 'amount',
    value: '100'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SearchWidgetComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    component = TestBed.createComponent(SearchWidgetComponent).componentInstance;
    component.storageKey = STORAGE_KEY;
    component.searchTypes = [variableType];
  });

  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('takes the current type and operator labels when a saved criteria set is loaded', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mine: [savedBefore] }));
    component.ngOnInit();

    component.loadCriteria('mine');

    expect(component.searches).toHaveLength(1);
    expect(component.searches[0].type.label).toBe('search.types.processVariable');
    expect(component.searches[0].operator.label).toBe('search.operators.equals');
    expect(component.searches[0].name).toBe('amount');
    expect(component.searches[0].value).toBe('100');
  });

  it('keeps a saved criteria whose type no longer exists as it was saved', () => {
    const removedType: SearchCriteria = {
      ...savedBefore,
      type: { key: 'removedType', label: 'Removed', operators: [{ key: 'eq', label: 'equals' }] }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mine: [removedType] }));
    component.ngOnInit();

    component.loadCriteria('mine');

    expect(component.searches[0].type.label).toBe('Removed');
    expect(component.searches[0].operator.label).toBe('equals');
  });
});
