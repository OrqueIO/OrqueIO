import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
  ChangeDetectorRef, inject, DestroyRef, OnInit, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner, faSearch, faPlus, faTimes, faFilter,
  faHashtag, faKey, faSitemap, faSync, faCircleDot,
  faExclamationTriangle, faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';

import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import { CockpitService, ProcessInstance } from '../../../../services/cockpit.service';
import { MultiValueChipInputComponent } from '../../../../shared/multi-value-chip-input/multi-value-chip-input';
import { BpmnElement } from '../../../../shared/bpmn-viewer/bpmn-viewer';

export interface InstanceSelectionResult {
  mode: 'instance' | 'query';
  instanceIds: string[];
  query: Record<string, unknown> | null;
  count: number;
}

type MoveField =
  | 'instanceId' | 'businessKey' | 'superProcessInstanceId' | 'subProcessInstanceId'
  | 'withJobsRetrying' | 'active' | 'suspended' | 'withIncidents'
  | 'incidentType' | 'incidentMessageLike' | 'activityId'
  | 'startedAfter' | 'startedBefore';

interface MovePill {
  field: MoveField;
  values: string[];
}

const BOOLEAN_FIELDS: MoveField[] = ['active', 'suspended', 'withJobsRetrying', 'withIncidents'];
const CHIP_FIELDS: MoveField[] = ['instanceId'];
const DATE_FIELDS: MoveField[] = ['startedAfter', 'startedBefore'];

@Component({
  selector: 'app-select-instances-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, TranslatePipe, MultiValueChipInputComponent],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="modal-container" role="dialog" aria-modal="true">

        <!-- Header -->
        <div class="modal-header">
          <h3 class="modal-title">{{ 'cockpit.modify.selectDialog.title' | translate }}</h3>
          <div class="process-badge">
            <span class="process-badge-label">{{ 'cockpit.modify.selectDialog.processLabel' | translate }}</span>
            <span class="process-badge-value mono">{{ processDefinitionId }}</span>
          </div>
        </div>

        <!-- Criteria area: not inside the scroll container so dropdowns are never clipped -->
        <div class="modal-criteria-area">

          <!-- Mode toggle -->
          <div class="selection-type">
            <span class="selection-type-label">{{ 'cockpit.modify.selectDialog.selectionType' | translate }}</span>
            <div class="mode-selector">
              <button class="mode-btn" [class.mode-btn--active]="selectionMode === 'instance'"
                      (click)="switchMode('instance')" type="button">
                {{ 'cockpit.modify.selectDialog.instance' | translate }}
              </button>
              <button class="mode-btn" [class.mode-btn--active]="selectionMode === 'query'"
                      (click)="switchMode('query')" type="button">
                {{ 'cockpit.modify.selectDialog.query' | translate }}
              </button>
            </div>
          </div>

          <div class="mode-divider"></div>

          <!-- Pills row -->
          <div class="pills-row">

            <!-- Active pills -->
            <div class="pill-wrapper" *ngFor="let pill of activePills; let i = index">
              <div class="pill" [class.pill--mismatch]="pill.field === 'activityId' && activityIdMismatch">
                <fa-icon [icon]="getPillIcon(pill.field)" class="pill-icon"></fa-icon>
                <button class="pill-text-btn" (click)="startEditPill(i, $event)" type="button">
                  {{ getPillLabel(pill) }}
                </button>
                <fa-icon *ngIf="pill.field === 'activityId' && activityIdMismatch"
                         [icon]="faExclamationTriangle"
                         class="pill-mismatch-icon"
                         [title]="'cockpit.modify.selectDialog.activityIdMismatch' | translate">
                </fa-icon>
                <button class="pill-remove" (click)="removePill(i, $event)" type="button">
                  <fa-icon [icon]="faTimes"></fa-icon>
                </button>
              </div>

              <!-- Inline editor for existing pill -->
              <div class="criterion-editor-popover"
                   *ngIf="editingPillIndex === i"
                   (click)="$event.stopPropagation()">
                <div class="editor-header">
                  <fa-icon [icon]="getPillIcon(pill.field)" class="editor-icon"></fa-icon>
                  <span class="editor-title">{{ getFieldLabel(pill.field) }}</span>
                </div>
                <ng-container [ngSwitch]="pill.field">
                  <div class="editor-body" *ngSwitchCase="'instanceId'">
                    <app-multi-value-chip-input [values]="pendingChipValues"
                      (valuesChange)="pendingChipValues = $event"
                      [placeholder]="'cockpit.modify.selectDialog.queryInstanceIdsPlaceholder' | translate"
                      [autofocus]="true">
                    </app-multi-value-chip-input>
                  </div>
                  <div class="editor-body" *ngSwitchCase="'startedAfter'">
                    <input type="date" [(ngModel)]="pendingDateValue" class="editor-date-input" />
                  </div>
                  <div class="editor-body" *ngSwitchCase="'startedBefore'">
                    <input type="date" [(ngModel)]="pendingDateValue" class="editor-date-input" />
                  </div>
                  <div class="editor-body" *ngSwitchCase="'activityId'">
                    <ng-container *ngTemplateOutlet="activityPickerTpl"></ng-container>
                  </div>
                  <div class="editor-body" *ngSwitchDefault>
                    <input type="text" [(ngModel)]="pendingTextValue"
                           [placeholder]="getFieldPlaceholder(pill.field)"
                           class="editor-text-input"
                           (keyup.enter)="confirmEdit()"
                           autofocus />
                  </div>
                </ng-container>
                <div class="editor-actions">
                  <button class="editor-apply-btn" (click)="confirmEdit()" type="button">
                    {{ 'cockpit.modify.selectDialog.apply' | translate }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Add criteria button + dropdown + new-pill editor -->
            <div class="criteria-dropdown-wrapper">
              <button class="btn-add-criteria" (click)="toggleCriteriaDropdown($event)" type="button">
                <fa-icon [icon]="faPlus"></fa-icon>
                {{ 'cockpit.modify.selectDialog.addCriteria' | translate }}
              </button>

              <!-- Criteria dropdown menu -->
              <div class="criteria-dropdown" *ngIf="showCriteriaDropdown" role="menu">
                <div class="criteria-dropdown-header">
                  <fa-icon [icon]="faFilter" class="criteria-dropdown-header-icon"></fa-icon>
                  <span>{{ 'cockpit.modify.selectDialog.dropdownTitle' | translate }}</span>
                </div>

                <!-- Identifiers -->
                <div class="criteria-group">
                  <div class="criteria-group-label">{{ 'cockpit.modify.selectDialog.sectionIdentifiers' | translate }}</div>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('instanceId')"
                          (click)="selectCriterion('instanceId', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--violet"><fa-icon [icon]="faHashtag"></fa-icon></span>
                    <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryInstanceIds' | translate }}</span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('businessKey')"
                          (click)="selectCriterion('businessKey', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--blue"><fa-icon [icon]="faKey"></fa-icon></span>
                    <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryBusinessKey' | translate }}</span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('superProcessInstanceId')"
                          (click)="selectCriterion('superProcessInstanceId', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--orange"><fa-icon [icon]="faSitemap"></fa-icon></span>
                    <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.querySuperProcessInstanceId' | translate }}</span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('subProcessInstanceId')"
                          (click)="selectCriterion('subProcessInstanceId', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--orange"><fa-icon [icon]="faSitemap"></fa-icon></span>
                    <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.querySubProcessInstanceId' | translate }}</span>
                  </button>
                </div>

                <div class="criteria-separator"></div>

                <!-- State -->
                <div class="criteria-group">
                  <div class="criteria-group-label">{{ 'cockpit.modify.selectDialog.sectionState' | translate }}</div>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('active')"
                          (click)="selectCriterion('active', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--emerald"><fa-icon [icon]="faCircleDot"></fa-icon></span>
                    <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryActive' | translate }}</span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('suspended')"
                          (click)="selectCriterion('suspended', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--amber"><fa-icon [icon]="faCircleDot"></fa-icon></span>
                    <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.querySuspended' | translate }}</span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('withJobsRetrying')"
                          (click)="selectCriterion('withJobsRetrying', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--teal"><fa-icon [icon]="faSync"></fa-icon></span>
                    <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryWithJobsRetrying' | translate }}</span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('withIncidents')"
                          (click)="selectCriterion('withIncidents', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--red"><fa-icon [icon]="faExclamationTriangle"></fa-icon></span>
                    <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryWithIncidents' | translate }}</span>
                  </button>
                </div>

                <div class="criteria-separator"></div>

                <!-- Incidents -->
                <div class="criteria-group">
                  <div class="criteria-group-label">{{ 'cockpit.modify.selectDialog.sectionIncidents' | translate }}</div>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('incidentType')"
                          (click)="selectCriterion('incidentType', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--red"><fa-icon [icon]="faExclamationTriangle"></fa-icon></span>
                    <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryIncidentType' | translate }}</span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('incidentMessageLike')"
                          (click)="selectCriterion('incidentMessageLike', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--amber"><fa-icon [icon]="faExclamationTriangle"></fa-icon></span>
                    <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryIncidentMessageLike' | translate }}</span>
                  </button>
                </div>

                <div class="criteria-separator"></div>

                <!-- Activity & Dates -->
                <div class="criteria-group">
                  <div class="criteria-group-label">{{ 'cockpit.modify.selectDialog.sectionActivityDates' | translate }}</div>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('activityId')"
                          (click)="selectCriterion('activityId', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--violet"><fa-icon [icon]="faHashtag"></fa-icon></span>
                    <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryActivityId' | translate }}</span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('startedAfter')"
                          (click)="selectCriterion('startedAfter', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--teal"><fa-icon [icon]="faCalendarAlt"></fa-icon></span>
                    <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryStartedAfter' | translate }}</span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('startedBefore')"
                          (click)="selectCriterion('startedBefore', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--teal"><fa-icon [icon]="faCalendarAlt"></fa-icon></span>
                    <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryStartedBefore' | translate }}</span>
                  </button>
                </div>
              </div>

              <!-- New-pill editor anchored below "Add criteria" button -->
              <div class="criterion-editor-popover"
                   *ngIf="safeEditorType && editingPillIndex === null"
                   (click)="$event.stopPropagation()">
                <div class="editor-header">
                  <fa-icon [icon]="getPillIcon(safeEditorType)" class="editor-icon"></fa-icon>
                  <span class="editor-title">{{ getFieldLabel(safeEditorType) }}</span>
                </div>
                <ng-container [ngSwitch]="safeEditorType">
                  <div class="editor-body" *ngSwitchCase="'instanceId'">
                    <app-multi-value-chip-input [values]="pendingChipValues"
                      (valuesChange)="pendingChipValues = $event"
                      [placeholder]="'cockpit.modify.selectDialog.queryInstanceIdsPlaceholder' | translate"
                      [autofocus]="true">
                    </app-multi-value-chip-input>
                  </div>
                  <div class="editor-body" *ngSwitchCase="'startedAfter'">
                    <input type="date" [(ngModel)]="pendingDateValue" class="editor-date-input" />
                  </div>
                  <div class="editor-body" *ngSwitchCase="'startedBefore'">
                    <input type="date" [(ngModel)]="pendingDateValue" class="editor-date-input" />
                  </div>
                  <div class="editor-body" *ngSwitchCase="'activityId'">
                    <ng-container *ngTemplateOutlet="activityPickerTpl"></ng-container>
                  </div>
                  <div class="editor-body" *ngSwitchDefault>
                    <input type="text" [(ngModel)]="pendingTextValue"
                           [placeholder]="getFieldPlaceholder(safeEditorType)"
                           class="editor-text-input"
                           (keyup.enter)="confirmEdit()"
                           autofocus />
                  </div>
                </ng-container>
                <div class="editor-actions">
                  <button class="editor-apply-btn" (click)="confirmEdit()" type="button">
                    {{ 'cockpit.modify.selectDialog.apply' | translate }}
                  </button>
                </div>
              </div>
            </div>

          </div>

          <!-- Source activity required warning -->
          <div class="activity-required-note" *ngIf="!hasActivityIdPill">
            <fa-icon [icon]="faExclamationTriangle" class="activity-required-note__icon"></fa-icon>
            <span>{{ 'cockpit.modify.selectDialog.activityIdRequired' | translate }}</span>
          </div>
        </div>

        <!-- Scrollable results area -->
        <div class="modal-body">

          <!-- Search bar -->
          <div class="search-bar">
            <button type="button" class="query-search-btn" (click)="search()" [disabled]="searching">
              <fa-icon [icon]="searching ? faSpinner : faSearch"
                       [animation]="searching ? 'spin' : undefined"></fa-icon>
              {{ 'cockpit.modify.selectDialog.querySearch' | translate }}
            </button>
            <span class="result-count" *ngIf="searchResults !== null && !searching">
              {{ searchResults.length }} {{ 'cockpit.modify.selectDialog.queryMatchingInstances' | translate }}
            </span>
            <span class="search-error-inline" *ngIf="searchError && !searching">
              {{ 'cockpit.modify.selectDialog.loadError' | translate }}
            </span>
          </div>

          <!-- Instance mode: selectable table -->
          <ng-container *ngIf="selectionMode === 'instance'">
            <div class="instances-loading" *ngIf="searching">
              <fa-icon [icon]="faSpinner" animation="spin"></fa-icon>
            </div>
            <ng-container *ngIf="!searching && searchResults !== null">
              <div class="results-header">
                <span class="instance-count">
                  {{ selectedIds.size }} / {{ searchResults.length }}
                  {{ 'cockpit.modify.selectDialog.selectedCount' | translate }}
                </span>
              </div>
              <div class="instances-table-wrapper" *ngIf="searchResults.length > 0">
                <table class="instances-table">
                  <thead>
                    <tr>
                      <th class="col-check">
                        <input type="checkbox" [checked]="allSelected" (change)="toggleSelectAll()" />
                      </th>
                      <th>{{ 'cockpit.modify.selectDialog.columnId' | translate }}</th>
                      <th>{{ 'cockpit.modify.selectDialog.columnBusinessKey' | translate }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let instance of searchResults"
                        [class.selected]="selectedIds.has(instance.id)"
                        (click)="toggleInstance(instance.id)">
                      <td class="col-check">
                        <input type="checkbox" [checked]="selectedIds.has(instance.id)"
                               (click)="$event.stopPropagation()" (change)="toggleInstance(instance.id)" />
                      </td>
                      <td class="mono">{{ instance.id }}</td>
                      <td>{{ instance.businessKey || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="instances-empty" *ngIf="searchResults.length === 0">
                {{ 'cockpit.modify.selectDialog.noInstances' | translate }}
              </div>
            </ng-container>
          </ng-container>

          <!-- Query mode: count badge -->
          <ng-container *ngIf="selectionMode === 'query'">
            <div class="instances-loading" *ngIf="searching">
              <fa-icon [icon]="faSpinner" animation="spin"></fa-icon>
            </div>
            <div class="query-result-info" *ngIf="!searching && searchResults !== null">
              <span class="query-count-badge">{{ searchResults.length }}</span>
              {{ 'cockpit.modify.selectDialog.queryWillModify' | translate }}
            </div>
          </ng-container>

        </div>

        <!-- Activity picker shared template -->
        <ng-template #activityPickerTpl>
          <div class="activity-picker" *ngIf="availableActivities.length > 0; else activityFreeText">
            <div class="activity-picker-list">
              <button *ngFor="let act of availableActivities"
                      type="button"
                      class="activity-picker-item"
                      [class.activity-picker-item--selected]="pendingTextValue === act.id"
                      [class.activity-picker-item--disabled]="act.id === targetActivityId"
                      [disabled]="act.id === targetActivityId"
                      [title]="act.id === targetActivityId
                        ? ('cockpit.modify.selectDialog.activityIsTarget' | translate)
                        : (act.name || act.id)"
                      (click)="act.id !== targetActivityId && selectActivity(act.id)">
                <span class="activity-picker-item__name">{{ act.name || act.id }}</span>
                <span class="activity-picker-item__target-badge"
                      *ngIf="act.id === targetActivityId">
                  {{ 'cockpit.modify.selectDialog.activityIsTargetBadge' | translate }}
                </span>
              </button>
            </div>
          </div>
          <ng-template #activityFreeText>
            <input type="text" [(ngModel)]="pendingTextValue"
                   [placeholder]="'cockpit.modify.selectDialog.queryActivityIdPlaceholder' | translate"
                   class="editor-text-input"
                   (keyup.enter)="confirmEdit()"
                   autofocus />
          </ng-template>
        </ng-template>

        <!-- Footer -->
        <div class="modal-footer">
          <button type="button" class="modal-btn" (click)="onCancel()">
            {{ 'cockpit.modify.selectDialog.cancel' | translate }}
          </button>
          <button type="button" class="modal-btn modal-btn--primary"
                  [disabled]="!canConfirm"
                  (click)="onConfirm()">
            <ng-container *ngIf="selectionMode === 'instance'">
              {{ 'cockpit.modify.selectDialog.confirm' | translate }} ({{ selectedIds.size }})
            </ng-container>
            <ng-container *ngIf="selectionMode === 'query'">
              {{ 'cockpit.modify.selectDialog.confirmQuery' | translate }}
              <ng-container *ngIf="searchResults !== null">({{ searchResults.length }})</ng-container>
            </ng-container>
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    /* ── Backdrop & container ──────────────────────────────────────────── */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-container {
      background: var(--bg-surface, #fff);
      border-radius: 10px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18);
      width: 90vw;
      max-width: 800px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }
    /* ── Header ────────────────────────────────────────────────────────── */
    .modal-header {
      padding: 1rem 1.25rem 0.75rem;
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
    }
    .modal-title {
      margin: 0 0 0.3rem;
      font-size: 1rem;
      font-weight: 700;
    }
    .process-badge {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.78rem;
    }
    .process-badge-label { color: var(--text-muted); font-weight: 600; }
    .process-badge-value { color: var(--text-primary); }
    /* ── Criteria area (outside scroll so dropdowns are never clipped) ── */
    .modal-criteria-area {
      padding: 0.75rem 1.25rem 0;
      flex-shrink: 0;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.75rem;
    }
    /* ── Mode toggle ───────────────────────────────────────────────────── */
    .selection-type {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.65rem;
    }
    .selection-type-label { font-size: 0.85rem; color: var(--text-muted); }
    .mode-selector {
      display: inline-flex;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      overflow: hidden;
    }
    .mode-btn {
      padding: 0.3rem 0.7rem;
      font-size: 0.8rem;
      border: none;
      background: var(--bg-base);
      cursor: pointer;
      color: var(--text-primary);
    }
    .mode-btn + .mode-btn { border-left: 1px solid var(--border-color); }
    .mode-btn--active { background: var(--color-orange, #f97316); color: #fff; }
    .mode-divider { height: 1px; background: var(--border-color); margin-bottom: 0.65rem; }
    /* ── Pills row ─────────────────────────────────────────────────────── */
    .pills-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
      min-height: 32px;
    }
    .pill-wrapper { position: relative; }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.3rem 0.2rem 0.55rem;
      background: var(--color-primary-bg, rgba(37,99,235,0.08));
      border: 1px solid var(--color-primary, #2563eb);
      border-radius: 999px;
      font-size: 0.8rem;
      color: var(--color-primary, #2563eb);
      font-weight: 500;
      max-width: 320px;
    }
    .pill-icon { font-size: 0.6rem; opacity: 0.8; flex-shrink: 0; }
    .pill-text-btn {
      background: none;
      border: none;
      padding: 0;
      color: inherit;
      font-size: inherit;
      font-weight: inherit;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
    .pill-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border: none;
      background: transparent;
      color: var(--color-primary, #2563eb);
      cursor: pointer;
      border-radius: 50%;
      font-size: 0.55rem;
      padding: 0;
      flex-shrink: 0;
    }
    .pill-remove:hover { background: var(--color-primary, #2563eb); color: #fff; }
    .pill--mismatch {
      border-color: var(--color-warning, #d97706) !important;
      background: rgba(217,119,6,0.08) !important;
      color: var(--color-warning, #d97706) !important;
    }
    .pill-mismatch-icon {
      font-size: 0.6rem;
      color: var(--color-warning, #d97706);
      flex-shrink: 0;
    }
    /* Source activity required note */
    .activity-required-note {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.5rem;
      padding: 0.35rem 0.6rem;
      background: rgba(220,38,38,0.06);
      border: 1px solid rgba(220,38,38,0.25);
      border-radius: 6px;
      font-size: 0.8rem;
      color: var(--text-danger, #dc2626);
    }
    .activity-required-note__icon { font-size: 0.7rem; flex-shrink: 0; }
    /* ── Activity picker ────────────────────────────────────────────────── */
    .activity-picker { width: 100%; }
    .activity-picker-list {
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-base);
    }
    .activity-picker-item {
      display: flex;
      align-items: center;
      flex-wrap: nowrap;
      gap: 0.4rem;
      width: 100%;
      padding: 0.4rem 0.6rem;
      border: none;
      background: transparent;
      cursor: pointer;
      text-align: left;
      font-size: 0.83rem;
      color: var(--text-primary);
      border-bottom: 1px solid var(--border-color-light, var(--border-color));
      box-sizing: border-box;
    }
    .activity-picker-item:last-child { border-bottom: none; }
    .activity-picker-item:hover:not(:disabled):not(.activity-picker-item--disabled) {
      background: var(--bg-hover);
    }
    .activity-picker-item--selected {
      background: rgba(37,99,235,0.08);
      color: var(--color-primary, #2563eb);
      font-weight: 500;
    }
    .activity-picker-item--disabled {
      opacity: 0.45;
      cursor: not-allowed;
      color: var(--text-muted, #6b7280);
    }
    .activity-picker-item__name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .activity-picker-item__target-badge {
      margin-left: auto;
      flex-shrink: 0;
      font-size: 0.67rem;
      font-weight: 600;
      padding: 0.1rem 0.4rem;
      background: rgba(217,119,6,0.12);
      color: var(--color-warning, #d97706);
      border: 1px solid rgba(217,119,6,0.3);
      border-radius: 4px;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    /* ── Add criteria button ────────────────────────────────────────────── */
    .criteria-dropdown-wrapper { position: relative; }
    .btn-add-criteria {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border: 1px dashed var(--border-color);
      border-radius: 999px;
      background: transparent;
      color: var(--text-muted);
      font-size: 0.8rem;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
    }
    .btn-add-criteria:hover {
      border-color: var(--color-primary, #2563eb);
      color: var(--color-primary, #2563eb);
    }
    /* ── Criteria dropdown ──────────────────────────────────────────────── */
    .criteria-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      z-index: 200;
      background: var(--bg-surface, #fff);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.14);
      min-width: 240px;
      max-height: 380px;
      overflow-y: auto;
      padding: 0.35rem 0;
    }
    .criteria-dropdown-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.75rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 0.25rem;
    }
    .criteria-dropdown-header-icon { font-size: 0.65rem; }
    .criteria-group { padding: 0.2rem 0; }
    .criteria-group-label {
      padding: 0.2rem 0.75rem;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }
    .criteria-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.35rem 0.75rem;
      border: none;
      background: transparent;
      cursor: pointer;
      text-align: left;
      font-size: 0.84rem;
      color: var(--text-primary);
    }
    .criteria-option:hover { background: var(--bg-hover); }
    .criteria-option--active { color: var(--color-primary, #2563eb); }
    .criteria-option-name { flex: 1; }
    .criteria-separator { height: 1px; background: var(--border-color-light, var(--border-color)); margin: 0.2rem 0; }
    /* ── Criteria icon wraps ────────────────────────────────────────────── */
    .criteria-icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 5px;
      font-size: 0.6rem;
      flex-shrink: 0;
      color: #fff;
    }
    .criteria-icon-wrap--violet  { background: #7c3aed; }
    .criteria-icon-wrap--blue    { background: #2563eb; }
    .criteria-icon-wrap--orange  { background: #ea580c; }
    .criteria-icon-wrap--emerald { background: #059669; }
    .criteria-icon-wrap--amber   { background: #d97706; }
    .criteria-icon-wrap--teal    { background: #0d9488; }
    .criteria-icon-wrap--red     { background: #dc2626; }
    /* ── Criterion editor popover ───────────────────────────────────────── */
    .criterion-editor-popover {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      z-index: 200;
      background: var(--bg-surface, #fff);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.14);
      padding: 0.65rem 0.75rem 0.6rem;
      min-width: 260px;
      max-width: 340px;
    }
    .editor-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.55rem;
    }
    .editor-icon { font-size: 0.7rem; color: var(--color-primary, #2563eb); }
    .editor-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .editor-body { margin-bottom: 0.5rem; }
    .editor-text-input,
    .editor-date-input {
      width: 100%;
      padding: 0.35rem 0.6rem;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 0.85rem;
      background: var(--bg-input, var(--bg-base));
      color: var(--text-primary);
      box-sizing: border-box;
    }
    .editor-text-input:focus,
    .editor-date-input:focus { outline: none; border-color: var(--color-primary, #2563eb); }
    .editor-actions { display: flex; justify-content: flex-end; }
    .editor-apply-btn {
      padding: 0.3rem 0.75rem;
      background: var(--color-primary, #2563eb);
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 0.82rem;
      cursor: pointer;
    }
    .editor-apply-btn:hover { background: var(--color-primary-dark, #1d4ed8); }
    /* ── Modal body (scrollable) ────────────────────────────────────────── */
    .modal-body {
      padding: 0.75rem 1.25rem;
      overflow-y: auto;
      flex: 1;
    }
    /* ── Footer ─────────────────────────────────────────────────────────── */
    .modal-footer {
      padding: 0.75rem 1.25rem;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      flex-shrink: 0;
    }
    .modal-btn {
      padding: 0.4rem 1rem;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: var(--bg-base);
      cursor: pointer;
      font-size: 0.85rem;
      color: var(--text-primary);
    }
    .modal-btn:hover:not(:disabled) { background: var(--bg-hover); }
    .modal-btn--primary {
      background: var(--color-primary, #2563eb) !important;
      border-color: var(--color-primary, #2563eb) !important;
      color: #fff !important;
    }
    .modal-btn--primary:hover:not(:disabled) { background: var(--color-primary-dark, #1d4ed8) !important; }
    .modal-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
    /* ── Search bar ─────────────────────────────────────────────────────── */
    .search-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }
    .query-search-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.85rem;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-base);
      color: var(--text-primary);
      font-size: 0.85rem;
      cursor: pointer;
    }
    .query-search-btn:hover:not(:disabled) { border-color: var(--color-primary, #2563eb); color: var(--color-primary, #2563eb); }
    .query-search-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .result-count { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
    .search-error-inline { font-size: 0.8rem; color: var(--text-danger, #e74c3c); }
    /* ── Results ────────────────────────────────────────────────────────── */
    .instances-loading { padding: 1.5rem; text-align: center; color: var(--text-muted); }
    .instances-empty { padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; }
    .results-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .instance-count { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
    .instances-table-wrapper {
      max-height: 280px;
      overflow-y: auto;
      border: 1px solid var(--border-color);
      border-radius: 6px;
    }
    .instances-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .instances-table thead { position: sticky; top: 0; z-index: 1; }
    .instances-table th {
      padding: 0.5rem 0.75rem;
      text-align: left;
      background: var(--bg-base);
      border-bottom: 1px solid var(--border-color);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .instances-table td { padding: 0.45rem 0.75rem; border-bottom: 1px solid var(--border-color-light, var(--border-color)); }
    .instances-table tbody tr { cursor: pointer; }
    .instances-table tbody tr:hover { background: var(--bg-hover); }
    .instances-table tbody tr.selected { background: var(--bg-info, #e8f4fd); }
    .col-check { width: 40px; text-align: center; }
    .mono { font-family: monospace; font-size: 0.8rem; }
    .query-result-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: var(--bg-info-light, rgba(37,99,235,0.04));
      border: 1px solid var(--color-primary-light, #93c5fd);
      border-radius: 6px;
      font-size: 0.9rem;
    }
    .query-count-badge { font-size: 1.15rem; font-weight: 700; color: var(--color-primary, #2563eb); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectInstancesDialogComponent implements OnInit {
  private cockpitService = inject(CockpitService);
  private translateService = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  @Input() processDefinitionId!: string;
  @Input() sourceActivityId: string | null = null;
  @Input() availableActivities: BpmnElement[] = [];
  @Input() targetActivityId: string | null = null;

  @Output() cancelled = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<InstanceSelectionResult>();
  @Output() activityIdCriterionChange = new EventEmitter<string | null>();

  faSpinner = faSpinner; faSearch = faSearch; faPlus = faPlus; faTimes = faTimes;
  faFilter = faFilter; faHashtag = faHashtag; faKey = faKey; faSitemap = faSitemap;
  faSync = faSync; faCircleDot = faCircleDot; faExclamationTriangle = faExclamationTriangle;
  faCalendarAlt = faCalendarAlt;

  selectionMode: 'instance' | 'query' = 'instance';
  searching = false;
  searchError = false;
  searchResults: ProcessInstance[] | null = null;
  selectedIds = new Set<string>();

  activePills: MovePill[] = [];
  showCriteriaDropdown = false;
  activeEditorType: MoveField | null = null;
  editingPillIndex: number | null = null;
  pendingTextValue = '';
  pendingChipValues: string[] = [];
  pendingDateValue = '';

  get safeEditorType(): MoveField {
    return this.activeEditorType!;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const inDropdown = !!target.closest('.criteria-dropdown-wrapper');
    const inPill = !!target.closest('.pill-wrapper');
    if (!inDropdown && !inPill) {
      let changed = false;
      if (this.showCriteriaDropdown) { this.showCriteriaDropdown = false; changed = true; }
      if (this.activeEditorType !== null) {
        this.confirmEdit();
        if (this.activeEditorType !== null) {
          this.activeEditorType = null;
          this.editingPillIndex = null;
        }
        changed = true;
      }
      if (changed) this.cdr.markForCheck();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.activeEditorType !== null) {
      this.cancelEdit();
    } else if (this.showCriteriaDropdown) {
      this.showCriteriaDropdown = false;
      this.cdr.markForCheck();
    }
  }

  ngOnInit(): void {
    if (this.sourceActivityId) {
      this.activePills = [{ field: 'activityId', values: [this.sourceActivityId] }];
    }
    this.search();
  }

  switchMode(mode: 'instance' | 'query'): void {
    this.selectionMode = mode;
    this.cdr.markForCheck();
  }

  isBooleanField(field: MoveField): boolean {
    return BOOLEAN_FIELDS.includes(field);
  }

  isChipField(field: MoveField): boolean {
    return CHIP_FIELDS.includes(field);
  }

  isDateField(field: MoveField): boolean {
    return DATE_FIELDS.includes(field);
  }

  isPillActive(field: MoveField): boolean {
    return this.activePills.some(p => p.field === field);
  }

  getPillIcon(field: MoveField): any {
    switch (field) {
      case 'instanceId':
      case 'activityId':            return this.faHashtag;
      case 'businessKey':           return this.faKey;
      case 'superProcessInstanceId':
      case 'subProcessInstanceId':  return this.faSitemap;
      case 'withJobsRetrying':      return this.faSync;
      case 'active':
      case 'suspended':             return this.faCircleDot;
      case 'withIncidents':
      case 'incidentType':
      case 'incidentMessageLike':   return this.faExclamationTriangle;
      case 'startedAfter':
      case 'startedBefore':         return this.faCalendarAlt;
      default:                      return this.faFilter;
    }
  }

  getPillLabel(pill: MovePill): string {
    const t = (k: string) => this.translateService.instant(`cockpit.modify.selectDialog.${k}`);
    const v = pill.values.join(', ');
    switch (pill.field) {
      case 'instanceId':             return `${t('queryInstanceIds')}: ${v}`;
      case 'businessKey':            return `${t('queryBusinessKey')}: ${v}`;
      case 'superProcessInstanceId': return `Parent: ${v}`;
      case 'subProcessInstanceId':   return `Sub: ${v}`;
      case 'withJobsRetrying':       return t('queryWithJobsRetrying');
      case 'active':                 return t('queryActive');
      case 'suspended':              return t('querySuspended');
      case 'withIncidents':          return t('queryWithIncidents');
      case 'incidentType':           return `${t('queryIncidentType')}: ${v}`;
      case 'incidentMessageLike':    return `${t('queryIncidentMessageLike')}: ${v}`;
      case 'activityId':             return `${t('queryActivityId')}: ${v}`;
      case 'startedAfter':           return `${t('queryStartedAfter')}: ${this.formatDisplayDate(v)}`;
      case 'startedBefore':          return `${t('queryStartedBefore')}: ${this.formatDisplayDate(v)}`;
      default:                       return pill.field;
    }
  }

  getFieldLabel(field: MoveField): string {
    const keyMap: Partial<Record<MoveField, string>> = {
      instanceId: 'queryInstanceIds',
      businessKey: 'queryBusinessKey',
      superProcessInstanceId: 'querySuperProcessInstanceId',
      subProcessInstanceId: 'querySubProcessInstanceId',
      incidentType: 'queryIncidentType',
      incidentMessageLike: 'queryIncidentMessageLike',
      activityId: 'queryActivityId',
      startedAfter: 'queryStartedAfter',
      startedBefore: 'queryStartedBefore',
    };
    const key = keyMap[field];
    return key
      ? this.translateService.instant(`cockpit.modify.selectDialog.${key}`)
      : field;
  }

  getFieldPlaceholder(field: MoveField): string {
    const keyMap: Partial<Record<MoveField, string>> = {
      businessKey: 'queryBusinessKeyPlaceholder',
      incidentType: 'queryIncidentTypePlaceholder',
      incidentMessageLike: 'queryIncidentMessageLikePlaceholder',
    };
    const key = keyMap[field];
    return key
      ? this.translateService.instant(`cockpit.modify.selectDialog.${key}`)
      : '';
  }

  toggleCriteriaDropdown(event: Event): void {
    event.stopPropagation();
    if (this.activeEditorType !== null) this.cancelEdit();
    this.showCriteriaDropdown = !this.showCriteriaDropdown;
    this.cdr.markForCheck();
  }

  selectCriterion(field: MoveField, event: Event): void {
    event.stopPropagation();
    this.showCriteriaDropdown = false;

    if (this.isBooleanField(field)) {
      const idx = this.activePills.findIndex(p => p.field === field);
      if (idx !== -1) {
        this.activePills = this.activePills.filter((_, i) => i !== idx);
      } else {
        this.activePills = [...this.activePills, { field, values: [] }];
      }
      this.cdr.markForCheck();
      this.search();
      return;
    }

    const existingIndex = this.activePills.findIndex(p => p.field === field);
    this.editingPillIndex = existingIndex !== -1 ? existingIndex : null;
    this.activeEditorType = field;
    this.populatePending(
      existingIndex !== -1 ? this.activePills[existingIndex] : { field, values: [] }
    );
    this.cdr.markForCheck();
  }

  startEditPill(index: number, event: Event): void {
    event.stopPropagation();
    const pill = this.activePills[index];
    if (this.isBooleanField(pill.field)) {
      this.removePill(index, event);
      return;
    }
    this.showCriteriaDropdown = false;
    this.editingPillIndex = index;
    this.activeEditorType = pill.field;
    this.populatePending(pill);
    this.cdr.markForCheck();
  }

  private populatePending(pill: MovePill): void {
    this.pendingTextValue = '';
    this.pendingChipValues = [];
    this.pendingDateValue = '';
    if (this.isChipField(pill.field)) {
      this.pendingChipValues = [...pill.values];
    } else if (this.isDateField(pill.field)) {
      this.pendingDateValue = pill.values[0] || '';
    } else {
      this.pendingTextValue = pill.values[0] || '';
    }
  }

  confirmEdit(): void {
    if (!this.activeEditorType) return;
    const field = this.activeEditorType;

    let values: string[];
    if (this.isChipField(field)) {
      values = [...this.pendingChipValues];
    } else if (this.isDateField(field)) {
      values = this.pendingDateValue ? [this.pendingDateValue] : [];
    } else {
      values = this.pendingTextValue.trim() ? [this.pendingTextValue.trim()] : [];
    }

    if (values.length === 0) {
      if (this.editingPillIndex !== null) {
        this.activePills = this.activePills.filter((_, i) => i !== this.editingPillIndex);
      }
    } else {
      const pill: MovePill = { field, values };
      if (this.editingPillIndex !== null) {
        this.activePills = this.activePills.map((p, i) => i === this.editingPillIndex ? pill : p);
      } else {
        this.activePills = [...this.activePills, pill];
      }
    }

    if (field === 'activityId') {
      this.activityIdCriterionChange.emit(values[0]?.trim() || null);
    }

    this.activeEditorType = null;
    this.editingPillIndex = null;
    this.pendingTextValue = '';
    this.pendingChipValues = [];
    this.pendingDateValue = '';
    this.cdr.markForCheck();
    this.search();
  }

  selectActivity(id: string): void {
    this.pendingTextValue = id;
    this.cdr.markForCheck();
  }

  cancelEdit(): void {
    this.activeEditorType = null;
    this.editingPillIndex = null;
    this.pendingTextValue = '';
    this.pendingChipValues = [];
    this.pendingDateValue = '';
    this.cdr.markForCheck();
  }

  removePill(index: number, event?: Event): void {
    event?.stopPropagation();
    const removedField = this.activePills[index]?.field;
    if (this.editingPillIndex === index) {
      this.activeEditorType = null;
      this.editingPillIndex = null;
    }
    this.activePills = this.activePills.filter((_, i) => i !== index);
    if (removedField === 'activityId') {
      this.activityIdCriterionChange.emit(null);
    }
    this.cdr.markForCheck();
    this.search();
  }

  get hasActivityIdPill(): boolean {
    const pill = this.activePills.find(p => p.field === 'activityId');
    return !!(pill && pill.values.length > 0 && pill.values[0].trim());
  }

  get activityIdMismatch(): boolean {
    const pill = this.activePills.find(p => p.field === 'activityId');
    const pillValue = pill?.values[0]?.trim() ?? null;
    const expected = this.sourceActivityId?.trim() ?? null;
    return pillValue !== expected;
  }

  get canConfirm(): boolean {
    if (!this.hasActivityIdPill) return false;
    if (this.selectionMode === 'instance') return this.selectedIds.size > 0;
    return !!this.searchResults && this.searchResults.length > 0;
  }

  get allSelected(): boolean {
    return !!this.searchResults && this.searchResults.length > 0 &&
      this.searchResults.every(i => this.selectedIds.has(i.id));
  }

  toggleSelectAll(): void {
    if (!this.searchResults) return;
    if (this.allSelected) {
      this.searchResults.forEach(i => this.selectedIds.delete(i.id));
    } else {
      this.searchResults.forEach(i => this.selectedIds.add(i.id));
    }
    this.cdr.markForCheck();
  }

  toggleInstance(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.cdr.markForCheck();
  }

  buildQueryBody(): Record<string, unknown> {
    const body: Record<string, unknown> = { processDefinitionId: this.processDefinitionId };

    const hasActive = this.isPillActive('active');
    const hasSuspended = this.isPillActive('suspended');
    if (!hasActive && !hasSuspended) {
      body['unfinished'] = true;
    } else {
      if (hasActive) body['active'] = true;
      if (hasSuspended) body['suspended'] = true;
    }

    for (const pill of this.activePills) {
      switch (pill.field) {
        case 'instanceId':
          if (pill.values.length) body['processInstanceIds'] = pill.values;
          break;
        case 'businessKey':
          if (pill.values[0]) body['processInstanceBusinessKeyLike'] = `%${pill.values[0]}%`;
          break;
        case 'superProcessInstanceId':
          if (pill.values[0]) body['superProcessInstanceId'] = pill.values[0];
          break;
        case 'subProcessInstanceId':
          if (pill.values[0]) body['subProcessInstanceId'] = pill.values[0];
          break;
        case 'withJobsRetrying':
          body['withJobsRetrying'] = true;
          break;
        case 'withIncidents':
          body['withIncidents'] = true;
          break;
        case 'incidentType':
          if (pill.values[0]) body['incidentType'] = pill.values[0];
          break;
        case 'incidentMessageLike':
          if (pill.values[0]) body['incidentMessageLike'] = `%${pill.values[0]}%`;
          break;
        case 'activityId':
          if (pill.values.length) body['activeActivityIdIn'] = pill.values;
          break;
        case 'startedAfter':
          if (pill.values[0]) body['startedAfter'] = new Date(pill.values[0]).toISOString();
          break;
        case 'startedBefore':
          if (pill.values[0]) {
            const d = new Date(pill.values[0]);
            d.setHours(23, 59, 59, 999);
            body['startedBefore'] = d.toISOString();
          }
          break;
      }
    }
    return body;
  }

  search(): void {
    this.searching = true;
    this.searchError = false;
    this.selectedIds.clear();
    this.cdr.markForCheck();

    const body = { ...this.buildQueryBody(), sorting: [{ sortBy: 'startTime', sortOrder: 'desc' }] };

    this.cockpitService.queryProcessInstances(body, 0, 1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (instances) => {
          this.searchResults = instances;
          this.searching = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.searchError = true;
          this.searching = false;
          this.cdr.detectChanges();
        }
      });
  }

  onConfirm(): void {
    if (this.selectionMode === 'instance') {
      this.confirmed.emit({
        mode: 'instance',
        instanceIds: Array.from(this.selectedIds),
        query: null,
        count: this.selectedIds.size
      });
    } else {
      this.confirmed.emit({
        mode: 'query',
        instanceIds: [],
        query: this.buildQueryBody(),
        count: this.searchResults?.length ?? 0
      });
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.cancelled.emit();
    }
  }

  private formatDisplayDate(iso: string): string {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(); }
    catch { return iso; }
  }
}
