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

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '../../i18n/translate.pipe';

/** A small green "Beta" pill, for a feature that is still being tested. */
@Component({
  selector: 'app-beta-badge',
  standalone: true,
  imports: [TranslatePipe],
  template: `<span class="beta-badge" [title]="'common.betaHint' | translate">{{ 'common.beta' | translate }}</span>`,
  styles: [`
    .beta-badge {
      display: inline-block;
      margin-left: 8px;
      padding: 1px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.5;
      letter-spacing: 0.02em;
      vertical-align: middle;
      background: var(--color-success-bg, #e6f4ea);
      color: var(--color-success, #1e7e34);
      cursor: help;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BetaBadgeComponent {}
