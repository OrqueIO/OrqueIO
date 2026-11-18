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

import 'zone.js';
import 'zone.js/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, RouterModule } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';

import { CockpitDashboardComponent } from './cockpit-dashboard';
import { LlmUsageChartComponent } from '../dashboard-charts';
import { CockpitService } from '../../../services/cockpit.service';
import { NavMenuService } from '../../../services/nav-menu.service';
import { ProcessInstanceService, Variable } from '../../../services/process-instance.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import * as DashboardSelectors from '../../../store/cockpit/dashboard/dashboard.selectors';
import * as ProcessesSelectors from '../../../store/cockpit/processes/processes.selectors';
import { initTestEnvironment } from '../../../testing/test-utils';

describe('CockpitDashboardComponent', () => {
  beforeAll(() => { initTestEnvironment(); });

  let fixture: ComponentFixture<CockpitDashboardComponent>;
  let records: ReturnType<typeof vi.fn>;

  const record = (fields: Record<string, unknown>): Variable => ({
    name: 'orqueioLlm_Task_' + Math.random().toString(36).slice(2), type: 'String',
    processInstanceId: 'pi-1', processDefinitionKey: 'claimTriage',
    value: JSON.stringify({
      inputTokens: 250, outputTokens: 30, outcome: 'VALID', recordedAt: new Date().toISOString(), ...fields
    })
  } as Variable);

  async function create(variables: Variable[]): Promise<HTMLElement> {
    records = vi.fn().mockReturnValue(of(variables));
    await TestBed.configureTestingModule({
      imports: [CockpitDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        provideMockActions(() => new Subject()),
        provideMockStore({
          selectors: [
            { selector: DashboardSelectors.selectDashboardStats, value: null },
            { selector: DashboardSelectors.selectDashboardLoading, value: false },
            { selector: ProcessesSelectors.selectProcessDefinitions, value: [] }
          ]
        }),
        { provide: NavMenuService, useValue: { setMenuItems: vi.fn(), clearMenuItems: vi.fn() } },
        {
          provide: CockpitService,
          useValue: {
            getProcessDefinitionsCount: () => of(2),
            getDecisionDefinitionsCount: () => of(2),
            getCaseDefinitionsCount: () => of(0),
            getDeploymentsCount: () => of(7)
          }
        },
        {
          provide: ProcessInstanceService,
          useValue: { getLlmTaskRecordUpdates: records, getLlmTaskRecordVariables: vi.fn().mockReturnValue(of([])) }
        }
      ]
    })
      // Only the stats and the LLM tasks card are under test: leave the other charts and the header out
      .overrideComponent(CockpitDashboardComponent, {
        set: {
          imports: [CommonModule, RouterModule, FontAwesomeModule, TranslatePipe, LlmUsageChartComponent],
          schemas: [NO_ERRORS_SCHEMA]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(CockpitDashboardComponent);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  const cards = (root: HTMLElement) =>
    Array.from(root.querySelectorAll('.stats-grid .stat-card')) as HTMLElement[];
  const text = (card: HTMLElement, part: string) => card.querySelector(part)!.textContent!.replace(/\s+/g, ' ').trim();

  it('should show the four deployment stats only while no LLM task has run', async () => {
    const root = await create([]);

    expect(cards(root).length).toBe(4);
    expect(root.querySelector('.stats-grid--llm')).toBeNull();
  });

  it('should add the LLM calls and invalid answers of the last 7 days, three cards per row', async () => {
    const root = await create([
      record({}),
      record({ outcome: 'BPMN_ERROR' }),
      record({ recordedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString() })
    ]);

    expect(cards(root).length).toBe(6);
    expect(root.querySelector('.stats-grid--llm')).not.toBeNull();

    const calls = root.querySelector('.stat-card--llm-calls') as HTMLElement;
    expect(text(calls, '.stat-card__value')).toBe('2');
    expect(text(calls, '.stat-card__label')).toBe('cockpit.dashboard.llmCalls');
    expect(text(calls, '.stat-card__detail')).toBe('cockpit.dashboard.llmTokens');

    const invalid = root.querySelector('.stat-card--llm-invalid') as HTMLElement;
    expect(text(invalid, '.stat-card__value')).toBe('1');
    expect(invalid.classList.contains('stat-card--danger')).toBe(true);
  });

  it('should show no invalid answers in a neutral colour', async () => {
    const root = await create([record({})]);

    const invalid = root.querySelector('.stat-card--llm-invalid') as HTMLElement;
    expect(text(invalid, '.stat-card__value')).toBe('0');
    expect(invalid.classList.contains('stat-card--danger')).toBe(false);
    expect(invalid.classList.contains('stat-card--neutral')).toBe(true);
  });

  it('should open the charts section on the LLM tasks card when an LLM stat is clicked', async () => {
    const root = await create([record({})]);
    expect(fixture.componentInstance.secondaryChartsVisible).toBe(false);

    (root.querySelector('.stat-card--llm-calls') as HTMLElement).click();

    expect(fixture.componentInstance.secondaryChartsVisible).toBe(true);
  });

  it('should load the LLM records once for the stats and the LLM tasks card', async () => {
    await create([record({})]);
    fixture.componentInstance.showLlmUsage();
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('app-llm-usage-chart') as HTMLElement;
    expect(card).not.toBeNull();
    expect(card.hasAttribute('hidden')).toBe(false);
    expect(records).toHaveBeenCalledTimes(1);
  });
});
