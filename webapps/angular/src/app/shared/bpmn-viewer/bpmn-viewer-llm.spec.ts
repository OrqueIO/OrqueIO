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
import { TestBed } from '@angular/core/testing';
import { BpmnViewerComponent } from './bpmn-viewer';
import { LlmTaskRenderer } from './llm-task-renderer';
import { initTestEnvironment } from '../../testing/test-utils';

describe('BpmnViewerComponent LLM tasks', () => {
  beforeAll(() => { initTestEnvironment(); });

  it('should draw LLM tasks with their own renderer, in every diagram it shows', async () => {
    await TestBed.configureTestingModule({ imports: [BpmnViewerComponent] }).compileComponents();

    const fixture = TestBed.createComponent(BpmnViewerComponent);
    fixture.detectChanges();

    const viewer = (fixture.componentInstance as any).viewer;
    expect(viewer.get('llmTaskRenderer')).toBeInstanceOf(LlmTaskRenderer);

    fixture.destroy();
  });
});
