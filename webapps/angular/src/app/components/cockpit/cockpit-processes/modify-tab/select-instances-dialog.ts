import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
  ChangeDetectorRef, inject, DestroyRef, OnInit, OnDestroy, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner, faPlus, faTimes, faFilter,
  faHashtag, faKey, faSitemap, faSync, faCircleDot,
  faExclamationTriangle, faCalendarAlt,
  faPlay, faCircleStop, faUser, faGear, faCode, faTable,
  faPaperPlane, faInbox, faHand, faArrowUpRightFromSquare,
  faLayerGroup, faXmark, faSquare, faCheck, faServer, faChevronDown
} from '@fortawesome/free-solid-svg-icons';

import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslateService } from '../../../../i18n/translate.service';
import { CockpitService, ProcessInstance, VariableLine, parseVariableValue } from '../../../../services/cockpit.service';
import { ProcessInstanceService } from '../../../../services/process-instance.service';
import { MultiValueChipInputComponent } from '../../../../shared/multi-value-chip-input/multi-value-chip-input';
import { BpmnElement } from '../../../../shared/bpmn-viewer/bpmn-viewer';

export const MOVE_INSTANCES_DIALOG_SESSION_KEY = 'moveInstancesDialogState';
export const BATCH_OPS_MODIFY_SIGNAL_KEY = 'batchOpsModifySignal';

interface DialogPersistedState {
  processDefinitionId: string;
  activePills: MovePill[];
  selectionMode: 'instance' | 'query';
  selectedIds: string[];
  variableNamesIgnoreCase: boolean;
  variableValuesIgnoreCase: boolean;
  sourceActivity: BpmnElement | null;
  targetActivity: BpmnElement | null;
}

export interface InstanceSelectionResult {
  mode: 'instance' | 'query';
  instanceIds: string[];
  query: Record<string, unknown> | null;
  count: number;
}

type VariableOperator = 'eq' | 'neq' | 'gt' | 'gteq' | 'lt' | 'lteq' | 'like';

interface PendingVariableLine {
  name: string;
  operator: VariableOperator;
  values: string[];
}

interface VariableConflictInfo {
  name: string;
  type: 'generic' | 'impossible';
  detail: string;
}

type MoveField =
  | 'instanceId' | 'businessKey' | 'superProcessInstanceId' | 'subProcessInstanceId'
  | 'withJobsRetrying' | 'active' | 'suspended' | 'withIncidents'
  | 'incidentId' | 'incidentType' | 'incidentMessageLike' | 'activityId'
  | 'startedAfter' | 'startedBefore' | 'variables';

interface MovePill {
  field: MoveField;
  values: string[];
  variableLines?: VariableLine[];
}

const BOOLEAN_FIELDS: MoveField[] = ['active', 'suspended', 'withJobsRetrying', 'withIncidents'];
const CHIP_FIELDS: MoveField[] = ['instanceId', 'businessKey'];
const DATE_FIELDS: MoveField[] = ['startedAfter', 'startedBefore'];

@Component({
  selector: 'app-select-instances-dialog',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FontAwesomeModule, TranslatePipe, MultiValueChipInputComponent],
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
                   [class.criterion-editor-popover--variables]="activeEditorType === 'variables'"
                   *ngIf="editingPillIndex === i"
                   (click)="$event.stopPropagation()">
                <div class="editor-header">
                  <fa-icon [icon]="getPillIcon(pill.field)" class="editor-icon"></fa-icon>
                  <span class="editor-title">{{ getFieldLabel(pill.field) }}</span>
                </div>
                <ng-container [ngSwitch]="pill.field">
                  <div class="editor-body" *ngSwitchCase="'instanceId'">
                    <app-multi-value-chip-input [(values)]="pendingChipValues"
                      [placeholder]="'cockpit.modify.selectDialog.enterValue' | translate"
                      [autofocus]="true" [hideHint]="true"
                      (emptyEnter)="confirmEdit()"
                      (keydown.enter)="$event.stopPropagation()">
                    </app-multi-value-chip-input>
                    <div class="chip-input-hint-block">
                      <p class="chip-hint-main">{{ 'cockpit.processes.globalSearch.chipInputHint' | translate }}</p>
                      <p class="chip-hint-tip">{{ 'cockpit.processes.globalSearch.chipInputHintTip' | translate }}</p>
                    </div>
                  </div>
                  <div class="editor-body" *ngSwitchCase="'businessKey'">
                    <app-multi-value-chip-input [(values)]="pendingChipValues"
                      [placeholder]="'cockpit.modify.selectDialog.enterValue' | translate"
                      [autofocus]="true" [hideHint]="true"
                      (emptyEnter)="confirmEdit()"
                      (keydown.enter)="$event.stopPropagation()">
                    </app-multi-value-chip-input>
                    <div class="chip-input-hint-block">
                      <p class="chip-hint-main">{{ 'cockpit.processes.globalSearch.chipInputHint' | translate }}</p>
                      <p class="chip-hint-tip">{{ 'cockpit.processes.globalSearch.chipInputHintTip' | translate }}</p>
                    </div>
                  </div>
                  <div class="editor-body" *ngSwitchCase="'incidentType'">
                    <ng-container *ngTemplateOutlet="incidentTypePickerTpl"></ng-container>
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
                  <div class="editor-body editor-body--vars" *ngSwitchCase="'variables'">
                    <div class="vars-header">
                      <span class="vars-title">{{ 'cockpit.processes.filters.variable' | translate }}</span>
                      <button class="btn-add-var-line" (click)="addVariableLine()" type="button">
                        <fa-icon [icon]="faPlus"></fa-icon>
                        {{ 'cockpit.processes.filters.addVariable' | translate }}
                      </button>
                    </div>
                    <div class="variable-lines-list">
                      <ng-container *ngFor="let line of pendingVariableLines; let i = index; trackBy: trackVariableLine">
                        <div class="variable-line">
                          <input type="text" class="editor-input editor-input--name" [(ngModel)]="line.name"
                                 [placeholder]="'cockpit.processes.filters.variableName' | translate" />
                          <div class="op-dropdown-wrapper">
                            <button class="op-trigger" #opTriggerA
                                    (click)="toggleOperatorMenu(i, opTriggerA)" type="button"
                                    [class.op-trigger--open]="openOperatorMenuIndex === i">
                              {{ getOperatorLabel(line.operator) }}
                              <fa-icon [icon]="faChevronDown" class="op-trigger-caret"></fa-icon>
                            </button>
                          </div>
                          <div class="editor-values-col">
                            <app-multi-value-chip-input *ngIf="isMultiValueOperator(line.operator)"
                              [values]="line.values" (valuesChange)="onVariableLineValuesChange(i, $event)"
                              [placeholder]="'cockpit.processes.filters.variableValue' | translate"
                              [hideHint]="true">
                            </app-multi-value-chip-input>
                            <input *ngIf="!isMultiValueOperator(line.operator)" type="text"
                                   class="editor-input editor-input--value-single"
                                   [class.editor-input--error]="isComparisonValueInvalid(line)"
                                   [value]="line.values.at(0) ?? ''"
                                   (input)="onVariableLineSingleValueChange(i, $event)"
                                   [placeholder]="'cockpit.processes.filters.variableValue' | translate" />
                          </div>
                          <button class="btn-remove-line" (click)="removeVariableLine(i)" type="button">
                            <fa-icon [icon]="faTimes"></fa-icon>
                          </button>
                        </div>
                        <p class="variable-like-hint" *ngIf="line.operator === 'like'">
                          {{ 'cockpit.processes.globalSearch.likeHint' | translate }}
                        </p>
                        <p class="variable-value-error" *ngIf="isComparisonValueInvalid(line)">
                          {{ 'cockpit.processes.globalSearch.comparisonValueError' | translate }}
                        </p>
                      </ng-container>
                    </div>
                    <div *ngFor="let conflict of variableConflicts"
                         class="variable-conflict-warning"
                         [class.variable-conflict-warning--impossible]="conflict.type === 'impossible'">
                      <fa-icon [icon]="faExclamationTriangle" class="variable-conflict-icon"></fa-icon>
                      <span *ngIf="conflict.type === 'impossible'">
                        <strong>{{ conflict.name }}</strong>
                        {{ 'cockpit.processes.globalSearch.conflictImpossible' | translate }}: {{ conflict.detail }}
                      </span>
                      <span *ngIf="conflict.type === 'generic'">
                        <strong>{{ conflict.name }}</strong>
                        {{ 'cockpit.processes.globalSearch.conflictGeneric' | translate }}
                      </span>
                    </div>
                    <div class="case-options" *ngIf="pendingVariableLines.length > 0">
                      <span class="case-options-label">{{ 'cockpit.processes.globalSearch.ignoreCase.label' | translate }}</span>
                      <label class="case-option">
                        <input type="checkbox" [(ngModel)]="variableNamesIgnoreCase" />
                        {{ 'cockpit.processes.globalSearch.ignoreCase.name' | translate }}
                      </label>
                      <label class="case-option">
                        <input type="checkbox" [(ngModel)]="variableValuesIgnoreCase" />
                        {{ 'cockpit.processes.globalSearch.ignoreCase.value' | translate }}
                      </label>
                    </div>
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
              <div class="criteria-dropdown" *ngIf="showCriteriaDropdown" role="menu"
                   [style.max-height]="dropdownMaxHeight">
                <div class="criteria-dropdown-header">
                  <fa-icon [icon]="faFilter" class="criteria-dropdown-header-icon"></fa-icon>
                  <span class="criteria-dropdown-header-title">{{ 'cockpit.modify.selectDialog.dropdownTitle' | translate }}</span>
                </div>

                <!-- Identifiers -->
                <div class="criteria-group">
                  <div class="criteria-group-label">{{ 'cockpit.modify.selectDialog.sectionIdentifiers' | translate }}</div>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('instanceId')"
                          (click)="selectCriterion('instanceId', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--violet"><fa-icon [icon]="faHashtag"></fa-icon></span>
                    <span class="criteria-option-body">
                      <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryInstanceIds' | translate }}</span>
                      <span class="criteria-option-desc">{{ 'cockpit.modify.selectDialog.desc.instanceId' | translate }}</span>
                    </span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('businessKey')"
                          (click)="selectCriterion('businessKey', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--blue"><fa-icon [icon]="faKey"></fa-icon></span>
                    <span class="criteria-option-body">
                      <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryBusinessKey' | translate }}</span>
                      <span class="criteria-option-desc">{{ 'cockpit.modify.selectDialog.desc.businessKey' | translate }}</span>
                    </span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('superProcessInstanceId')"
                          (click)="selectCriterion('superProcessInstanceId', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--orange"><fa-icon [icon]="faSitemap"></fa-icon></span>
                    <span class="criteria-option-body">
                      <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.querySuperProcessInstanceId' | translate }}</span>
                      <span class="criteria-option-desc">{{ 'cockpit.modify.selectDialog.desc.superProcessInstanceId' | translate }}</span>
                    </span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('subProcessInstanceId')"
                          (click)="selectCriterion('subProcessInstanceId', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--orange"><fa-icon [icon]="faSitemap"></fa-icon></span>
                    <span class="criteria-option-body">
                      <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.querySubProcessInstanceId' | translate }}</span>
                      <span class="criteria-option-desc">{{ 'cockpit.modify.selectDialog.desc.subProcessInstanceId' | translate }}</span>
                    </span>
                  </button>
                </div>

                <div class="criteria-separator"></div>

                <!-- State -->
                <div class="criteria-group">
                  <div class="criteria-group-label">{{ 'cockpit.modify.selectDialog.sectionState' | translate }}</div>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('active')"
                          (click)="selectCriterion('active', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--emerald"><fa-icon [icon]="faCircleDot"></fa-icon></span>
                    <span class="criteria-option-body">
                      <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryActive' | translate }}</span>
                      <span class="criteria-option-desc">{{ 'cockpit.modify.selectDialog.desc.active' | translate }}</span>
                    </span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('suspended')"
                          (click)="selectCriterion('suspended', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--amber"><fa-icon [icon]="faCircleDot"></fa-icon></span>
                    <span class="criteria-option-body">
                      <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.querySuspended' | translate }}</span>
                      <span class="criteria-option-desc">{{ 'cockpit.modify.selectDialog.desc.suspended' | translate }}</span>
                    </span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('withJobsRetrying')"
                          (click)="selectCriterion('withJobsRetrying', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--teal"><fa-icon [icon]="faSync"></fa-icon></span>
                    <span class="criteria-option-body">
                      <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryWithJobsRetrying' | translate }}</span>
                      <span class="criteria-option-desc">{{ 'cockpit.modify.selectDialog.desc.withJobsRetrying' | translate }}</span>
                    </span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('withIncidents')"
                          (click)="selectCriterion('withIncidents', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--red"><fa-icon [icon]="faExclamationTriangle"></fa-icon></span>
                    <span class="criteria-option-body">
                      <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryWithIncidents' | translate }}</span>
                      <span class="criteria-option-desc">{{ 'cockpit.modify.selectDialog.desc.withIncidents' | translate }}</span>
                    </span>
                  </button>
                </div>

                <div class="criteria-separator"></div>

                <!-- Incidents -->
                <div class="criteria-group">
                  <div class="criteria-group-label">{{ 'cockpit.modify.selectDialog.sectionIncidents' | translate }}</div>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('incidentId')"
                          (click)="selectCriterion('incidentId', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--amber"><fa-icon [icon]="faHashtag"></fa-icon></span>
                    <span class="criteria-option-body">
                      <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryIncidentId' | translate }}</span>
                      <span class="criteria-option-desc">{{ 'cockpit.modify.selectDialog.desc.incidentId' | translate }}</span>
                    </span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('incidentType')"
                          (click)="selectCriterion('incidentType', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--red"><fa-icon [icon]="faExclamationTriangle"></fa-icon></span>
                    <span class="criteria-option-body">
                      <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryIncidentType' | translate }}</span>
                      <span class="criteria-option-desc">{{ 'cockpit.modify.selectDialog.desc.incidentType' | translate }}</span>
                    </span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('incidentMessageLike')"
                          (click)="selectCriterion('incidentMessageLike', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--amber"><fa-icon [icon]="faExclamationTriangle"></fa-icon></span>
                    <span class="criteria-option-body">
                      <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryIncidentMessageLike' | translate }}</span>
                      <span class="criteria-option-desc">{{ 'cockpit.modify.selectDialog.desc.incidentMessageLike' | translate }}</span>
                    </span>
                  </button>
                </div>

                <div class="criteria-separator"></div>

                <!-- Activity & Dates -->
                <div class="criteria-group">
                  <div class="criteria-group-label">{{ 'cockpit.modify.selectDialog.sectionActivityDates' | translate }}</div>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('activityId')"
                          (click)="selectCriterion('activityId', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--violet"><fa-icon [icon]="faHashtag"></fa-icon></span>
                    <span class="criteria-option-body">
                      <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryActivityId' | translate }}</span>
                      <span class="criteria-option-desc">{{ 'cockpit.modify.selectDialog.desc.activityId' | translate }}</span>
                    </span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('startedAfter')"
                          (click)="selectCriterion('startedAfter', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--teal"><fa-icon [icon]="faCalendarAlt"></fa-icon></span>
                    <span class="criteria-option-body">
                      <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryStartedAfter' | translate }}</span>
                      <span class="criteria-option-desc">{{ 'cockpit.modify.selectDialog.desc.startedAfter' | translate }}</span>
                    </span>
                  </button>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('startedBefore')"
                          (click)="selectCriterion('startedBefore', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--teal"><fa-icon [icon]="faCalendarAlt"></fa-icon></span>
                    <span class="criteria-option-body">
                      <span class="criteria-option-name">{{ 'cockpit.modify.selectDialog.queryStartedBefore' | translate }}</span>
                      <span class="criteria-option-desc">{{ 'cockpit.modify.selectDialog.desc.startedBefore' | translate }}</span>
                    </span>
                  </button>
                </div>

                <div class="criteria-separator"></div>

                <!-- Variables -->
                <div class="criteria-group">
                  <div class="criteria-group-label">{{ 'cockpit.processes.filters.variable' | translate }}</div>
                  <button class="criteria-option" [class.criteria-option--active]="isPillActive('variables')"
                          (click)="selectCriterion('variables', $event)" type="button" role="menuitem">
                    <span class="criteria-icon-wrap criteria-icon-wrap--indigo"><fa-icon [icon]="faCode"></fa-icon></span>
                    <span class="criteria-option-body">
                      <span class="criteria-option-name">{{ 'cockpit.processes.filters.variable' | translate }}</span>
                      <span class="criteria-option-desc">{{ 'cockpit.processes.globalSearch.desc.variables' | translate }}</span>
                    </span>
                  </button>
                </div>

              </div>

              <!-- New-pill editor anchored below "Add criteria" button -->
              <div class="criterion-editor-popover"
                   [class.criterion-editor-popover--variables]="activeEditorType === 'variables'"
                   *ngIf="safeEditorType && editingPillIndex === null"
                   (click)="$event.stopPropagation()">
                <div class="editor-header">
                  <fa-icon [icon]="getPillIcon(safeEditorType)" class="editor-icon"></fa-icon>
                  <span class="editor-title">{{ getFieldLabel(safeEditorType) }}</span>
                </div>
                <ng-container [ngSwitch]="safeEditorType">
                  <div class="editor-body" *ngSwitchCase="'instanceId'">
                    <app-multi-value-chip-input [(values)]="pendingChipValues"
                      [placeholder]="'cockpit.modify.selectDialog.enterValue' | translate"
                      [autofocus]="true" [hideHint]="true"
                      (emptyEnter)="confirmEdit()"
                      (keydown.enter)="$event.stopPropagation()">
                    </app-multi-value-chip-input>
                    <div class="chip-input-hint-block">
                      <p class="chip-hint-main">{{ 'cockpit.processes.globalSearch.chipInputHint' | translate }}</p>
                      <p class="chip-hint-tip">{{ 'cockpit.processes.globalSearch.chipInputHintTip' | translate }}</p>
                    </div>
                  </div>
                  <div class="editor-body" *ngSwitchCase="'businessKey'">
                    <app-multi-value-chip-input [(values)]="pendingChipValues"
                      [placeholder]="'cockpit.modify.selectDialog.enterValue' | translate"
                      [autofocus]="true" [hideHint]="true"
                      (emptyEnter)="confirmEdit()"
                      (keydown.enter)="$event.stopPropagation()">
                    </app-multi-value-chip-input>
                    <div class="chip-input-hint-block">
                      <p class="chip-hint-main">{{ 'cockpit.processes.globalSearch.chipInputHint' | translate }}</p>
                      <p class="chip-hint-tip">{{ 'cockpit.processes.globalSearch.chipInputHintTip' | translate }}</p>
                    </div>
                  </div>
                  <div class="editor-body" *ngSwitchCase="'incidentType'">
                    <ng-container *ngTemplateOutlet="incidentTypePickerTpl"></ng-container>
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
                  <div class="editor-body editor-body--vars" *ngSwitchCase="'variables'">
                    <div class="vars-header">
                      <span class="vars-title">{{ 'cockpit.processes.filters.variable' | translate }}</span>
                      <button class="btn-add-var-line" (click)="addVariableLine()" type="button">
                        <fa-icon [icon]="faPlus"></fa-icon>
                        {{ 'cockpit.processes.filters.addVariable' | translate }}
                      </button>
                    </div>
                    <div class="variable-lines-list">
                      <ng-container *ngFor="let line of pendingVariableLines; let i = index; trackBy: trackVariableLine">
                        <div class="variable-line">
                          <input type="text" class="editor-input editor-input--name" [(ngModel)]="line.name"
                                 [placeholder]="'cockpit.processes.filters.variableName' | translate" />
                          <div class="op-dropdown-wrapper">
                            <button class="op-trigger" #opTriggerB
                                    (click)="toggleOperatorMenu(i, opTriggerB)" type="button"
                                    [class.op-trigger--open]="openOperatorMenuIndex === i">
                              {{ getOperatorLabel(line.operator) }}
                              <fa-icon [icon]="faChevronDown" class="op-trigger-caret"></fa-icon>
                            </button>
                          </div>
                          <div class="editor-values-col">
                            <app-multi-value-chip-input *ngIf="isMultiValueOperator(line.operator)"
                              [values]="line.values" (valuesChange)="onVariableLineValuesChange(i, $event)"
                              [placeholder]="'cockpit.processes.filters.variableValue' | translate"
                              [hideHint]="true">
                            </app-multi-value-chip-input>
                            <input *ngIf="!isMultiValueOperator(line.operator)" type="text"
                                   class="editor-input editor-input--value-single"
                                   [class.editor-input--error]="isComparisonValueInvalid(line)"
                                   [value]="line.values.at(0) ?? ''"
                                   (input)="onVariableLineSingleValueChange(i, $event)"
                                   [placeholder]="'cockpit.processes.filters.variableValue' | translate" />
                          </div>
                          <button class="btn-remove-line" (click)="removeVariableLine(i)" type="button">
                            <fa-icon [icon]="faTimes"></fa-icon>
                          </button>
                        </div>
                        <p class="variable-like-hint" *ngIf="line.operator === 'like'">
                          {{ 'cockpit.processes.globalSearch.likeHint' | translate }}
                        </p>
                        <p class="variable-value-error" *ngIf="isComparisonValueInvalid(line)">
                          {{ 'cockpit.processes.globalSearch.comparisonValueError' | translate }}
                        </p>
                      </ng-container>
                    </div>
                    <div *ngFor="let conflict of variableConflicts"
                         class="variable-conflict-warning"
                         [class.variable-conflict-warning--impossible]="conflict.type === 'impossible'">
                      <fa-icon [icon]="faExclamationTriangle" class="variable-conflict-icon"></fa-icon>
                      <span *ngIf="conflict.type === 'impossible'">
                        <strong>{{ conflict.name }}</strong>
                        {{ 'cockpit.processes.globalSearch.conflictImpossible' | translate }}: {{ conflict.detail }}
                      </span>
                      <span *ngIf="conflict.type === 'generic'">
                        <strong>{{ conflict.name }}</strong>
                        {{ 'cockpit.processes.globalSearch.conflictGeneric' | translate }}
                      </span>
                    </div>
                    <div class="case-options" *ngIf="pendingVariableLines.length > 0">
                      <span class="case-options-label">{{ 'cockpit.processes.globalSearch.ignoreCase.label' | translate }}</span>
                      <label class="case-option">
                        <input type="checkbox" [(ngModel)]="variableNamesIgnoreCase" />
                        {{ 'cockpit.processes.globalSearch.ignoreCase.name' | translate }}
                      </label>
                      <label class="case-option">
                        <input type="checkbox" [(ngModel)]="variableValuesIgnoreCase" />
                        {{ 'cockpit.processes.globalSearch.ignoreCase.value' | translate }}
                      </label>
                    </div>
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

          <!-- Status bar -->
          <div class="search-bar">
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
                      <td class="col-id" (click)="$event.stopPropagation()">
                        <a [routerLink]="['/cockpit/processes/instance', instance.id]"
                           class="instance-link mono"
                           [title]="instance.id">{{ instance.id }}</a>
                      </td>
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
              <button *ngFor="let act of availableActivities; let i = index"
                      type="button"
                      class="activity-picker-item"
                      [class.activity-picker-item--selected]="pendingTextValue === act.id"
                      [class.activity-picker-item--active]="activityHighlightIndex === i"
                      [class.activity-picker-item--disabled]="act.id === targetActivityId"
                      [disabled]="act.id === targetActivityId"
                      [title]="act.id === targetActivityId
                        ? ('cockpit.modify.selectDialog.activityIsTarget' | translate)
                        : (act.name || act.id)"
                      (click)="act.id !== targetActivityId && selectActivity(act.id)"
                      (mouseenter)="hoveredId = act.id"
                      (mouseleave)="hoveredId = null">
                <fa-icon [icon]="getActivityIcon(act.type)"
                         class="activity-picker-item__type-icon"
                         [style.color]="hoveredId === act.id && act.id !== targetActivityId ? 'var(--color-primary)' : getActivityIconColor(act.type)"></fa-icon>
                <span class="activity-picker-item__name">{{ act.name || act.id }}</span>
                <span class="activity-picker-item__target-badge"
                      *ngIf="act.id === targetActivityId">
                  {{ 'cockpit.modify.selectDialog.activityIsTargetBadge' | translate }}
                </span>
                <fa-icon [icon]="faCheck"
                         class="activity-picker-item__check"
                         *ngIf="pendingTextValue === act.id && act.id !== targetActivityId">
                </fa-icon>
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

        <!-- Incident type picker shared template -->
        <ng-template #incidentTypePickerTpl>
          <div class="activity-picker-list">
            <button type="button"
                    class="activity-picker-item"
                    [class.activity-picker-item--selected]="pendingTextValue === 'failedJob'"
                    (click)="pendingTextValue = 'failedJob'"
                    (mouseenter)="hoveredId = 'failedJob'"
                    (mouseleave)="hoveredId = null">
              <fa-icon [icon]="faGear"
                       class="activity-picker-item__type-icon"
                       [style.color]="hoveredId === 'failedJob' ? 'var(--color-primary)' : 'var(--color-danger, #dc2626)'">
              </fa-icon>
              <span class="activity-picker-item__name">{{ 'cockpit.modify.selectDialog.incidentTypeFailedJob' | translate }}</span>
              <fa-icon [icon]="faCheck" class="activity-picker-item__check"
                       *ngIf="pendingTextValue === 'failedJob'"></fa-icon>
            </button>
            <button type="button"
                    class="activity-picker-item"
                    [class.activity-picker-item--selected]="pendingTextValue === 'failedExternalTask'"
                    (click)="pendingTextValue = 'failedExternalTask'"
                    (mouseenter)="hoveredId = 'failedExternalTask'"
                    (mouseleave)="hoveredId = null">
              <fa-icon [icon]="faServer"
                       class="activity-picker-item__type-icon"
                       [style.color]="hoveredId === 'failedExternalTask' ? 'var(--color-primary)' : 'var(--color-danger, #dc2626)'">
              </fa-icon>
              <span class="activity-picker-item__name">{{ 'cockpit.modify.selectDialog.incidentTypeFailedExternalTask' | translate }}</span>
              <fa-icon [icon]="faCheck" class="activity-picker-item__check"
                       *ngIf="pendingTextValue === 'failedExternalTask'"></fa-icon>
            </button>
          </div>
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

      <!-- Floating operator-selector menu for variable criteria -->
      <div class="op-menu" *ngIf="openOperatorMenuIndex !== null && opMenuPosition"
           [style.top.px]="opMenuPosition!.top"
           [style.left.px]="opMenuPosition!.left"
           [style.min-width.px]="opMenuPosition!.minWidth">
        <button *ngFor="let op of variableOperators" class="op-menu-row"
                [class.op-menu-row--selected]="pendingVariableLines[openOperatorMenuIndex!]?.operator === op.value"
                (click)="selectOperator(openOperatorMenuIndex!, op.value)" type="button">
          <span class="op-menu-symbol">{{ op.label }}</span>
          <span class="op-menu-name">{{ op.name }}</span>
        </button>
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
      width: 92vw;
      max-width: 900px;
      max-height: 90vh;
      overflow: visible;
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
      padding: 0.75rem 1.75rem 0;
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
      max-height: 280px;
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
      background: var(--color-primary-bg);
      color: var(--color-primary);
    }
    .activity-picker-item--selected {
      background: rgba(37,99,235,0.08);
      color: var(--color-primary, #2563eb);
      font-weight: 500;
    }
    .activity-picker-item--active {
      background: var(--color-primary-bg);
      color: var(--color-primary);
      outline: none;
    }
    .activity-picker-item--disabled {
      opacity: 0.45;
      cursor: not-allowed;
      color: var(--text-muted, #6b7280);
    }
    .activity-picker-item__type-icon {
      font-size: 12px;
      flex-shrink: 0;
      width: 14px;
      text-align: center;
      margin-right: 8px;
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
    .activity-picker-item__check {
      margin-left: auto;
      flex-shrink: 0;
      font-size: 11px;
      color: var(--color-primary);
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
    @keyframes criteriaDropdownIn {
      from { opacity: 0; transform: translateY(-6px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }
    .criteria-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      z-index: 500;
      background: var(--bg-card, #fff);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.04),
        0 8px 32px rgba(0, 0, 0, 0.14),
        0 2px 8px rgba(0, 0, 0, 0.08);
      min-width: 195px;
      max-width: 240px;
      overflow-y: auto;
      overflow-x: hidden;
      animation: criteriaDropdownIn 180ms cubic-bezier(0.16, 1, 0.3, 1);
      transform-origin: top left;
    }
    .criteria-dropdown-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.65rem;
      border-bottom: 1px solid var(--border-color-light, var(--border-color));
      background: var(--color-gray-50, #f9fafb);
      position: sticky;
      top: 0;
      z-index: 1;
    }
    .criteria-dropdown-header-icon { font-size: 0.65rem; color: var(--color-primary, #2563eb); }
    .criteria-dropdown-header-title {
      font-size: 0.63rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-secondary, #4b5563);
    }
    .criteria-group { padding: 0.1rem 0; }
    .criteria-group-label {
      padding: 0.1rem 0.65rem;
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }
    .criteria-option {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      width: 100%;
      padding: 0.18rem 0.65rem;
      border: none;
      background: transparent;
      cursor: pointer;
      text-align: left;
      transition: background 0.12s;
      position: relative;
      min-height: 30px;
    }
    .criteria-option::before {
      content: '';
      position: absolute;
      left: 0;
      top: 3px;
      bottom: 3px;
      width: 2px;
      border-radius: 0 2px 2px 0;
      background: var(--color-primary, #2563eb);
      opacity: 0;
      transform: scaleY(0.4);
      transition: opacity 0.12s, transform 0.12s;
    }
    .criteria-option:hover { background: var(--color-gray-50, #f9fafb); }
    .criteria-option:hover::before { opacity: 1; transform: scaleY(1); }
    .criteria-option--active { background: var(--color-primary-bg, rgba(37,99,235,0.06)); }
    .criteria-option--active::before { opacity: 1; transform: scaleY(1); }
    .criteria-option-body { display: flex; flex-direction: column; gap: 0; }
    .criteria-option-name {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-primary);
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .criteria-option-desc { display: none; }
    .criteria-separator { height: 1px; background: var(--border-color-light, var(--border-color)); margin: 0.2rem 0; }
    /* ── Criteria icon wraps ────────────────────────────────────────────── */
    .criteria-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 5px;
      font-size: 0.62rem;
      flex-shrink: 0;
      transition: transform 0.12s, box-shadow 0.12s;
    }
    .criteria-option:hover .criteria-icon-wrap {
      transform: scale(1.08);
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    }
    .criteria-icon-wrap--violet  { background: rgba(124, 58,  237, 0.10); color: #7c3aed; }
    .criteria-icon-wrap--blue    { background: rgba(37,  99,  235, 0.10); color: #2563eb; }
    .criteria-icon-wrap--orange  { background: rgba(234, 88,  12,  0.10); color: #ea580c; }
    .criteria-icon-wrap--emerald { background: rgba(16,  185, 129, 0.10); color: #059669; }
    .criteria-icon-wrap--amber   { background: rgba(245, 158, 11,  0.10); color: #d97706; }
    .criteria-icon-wrap--teal    { background: rgba(20,  184, 166, 0.10); color: #0d9488; }
    .criteria-icon-wrap--red     { background: rgba(220, 38,  38,  0.10); color: #dc2626; }
    .criteria-icon-wrap--indigo  { background: rgba(99,  102, 241, 0.10); color: #6366f1; }
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
      max-width: 420px;
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
    .editor-text-input--mt { margin-top: 0.4rem; }
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
    .result-count { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
    .search-error-inline { font-size: 0.8rem; color: var(--text-danger, #e74c3c); }
    /* ── Results ────────────────────────────────────────────────────────── */
    .instances-loading { padding: 1.5rem; text-align: center; color: var(--text-muted); }
    .instances-empty { padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; }
    .results-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .instance-count { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
    .instances-table-wrapper {
      max-height: 420px;
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
    .col-id { white-space: nowrap; }
    .instance-link {
      color: var(--color-primary, #2563eb);
      text-decoration: none;
    }
    .instance-link:hover { text-decoration: underline; }
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
    /* ── Variables criterion editor ────────────────────────────────────── */
    .criterion-editor-popover--variables { min-width: 420px; max-width: 480px; max-width: min(480px, calc(100vw - 20px)); padding: 0; }
    .criterion-editor-popover--variables .editor-header { padding: 0.65rem 0.75rem 0; }
    .criterion-editor-popover--variables .editor-actions { padding: 0 0.75rem 0.6rem; }
    .editor-body--vars { margin-bottom: 0; }
    .vars-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.35rem 0.75rem;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-base, #f9fafb);
    }
    .vars-title { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .btn-add-var-line {
      display: inline-flex; align-items: center; gap: 0.25rem;
      padding: 2px 7px; border: 1px solid #6366f1; border-radius: 4px;
      background: transparent; color: #6366f1; font-size: 0.73rem; cursor: pointer;
    }
    .btn-add-var-line:hover { background: rgba(99,102,241,0.08); }
    .variable-lines-list { display: flex; flex-direction: column; max-height: 161px; overflow-y: auto; overflow-x: hidden; }
    .variable-line {
      display: flex; align-items: flex-start; gap: var(--space-2, 8px);
      padding: var(--space-2, 8px) var(--space-3, 12px);
      overflow: hidden; flex-shrink: 0;
    }
    .variable-line + .variable-line,
    .variable-like-hint + .variable-line,
    .variable-value-error + .variable-line { border-top: 0.5px solid var(--border-color); }
    .editor-input {
      flex: 1; min-width: 0;
      padding: var(--space-2, 6px) var(--space-3, 10px);
      border: 1px solid var(--border-color); border-radius: var(--radius-md, 6px);
      font-family: var(--font-family-base, inherit); font-size: var(--font-size-sm, 0.875rem);
      color: var(--text-primary); background: var(--bg-card, #fff);
      transition: border-color var(--transition-fast, 0.15s);
    }
    .editor-input:focus { outline: none; border-color: var(--color-primary, #2563eb); box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37,99,235,0.15)); }
    .editor-input--name { flex: 1.2; min-width: 0; max-width: none; }
    .editor-values-col { flex: 1.6; min-width: 0; overflow: hidden; display: flex; flex-direction: column; gap: var(--space-2, 8px); }
    .editor-input--value-single { width: 100%; min-width: 0; }
    .editor-input--error { border-color: var(--color-error, #dc2626) !important; }
    .editor-input--error:focus { box-shadow: 0 0 0 2px rgba(220,38,38,0.2); }
    .btn-remove-line {
      flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; padding: 0; border: none; background: transparent;
      color: var(--text-muted); cursor: pointer; border-radius: var(--radius-sm, 4px); font-size: 0.65rem;
      transition: background 0.15s, color 0.15s;
    }
    .btn-remove-line:hover { background: rgba(220,38,38,0.08); color: var(--color-error, #dc2626); }
    .variable-like-hint {
      margin: 0; padding: var(--space-1, 4px) var(--space-3, 12px) var(--space-2, 8px);
      font-size: 0.68rem; font-style: italic; color: var(--text-muted); text-align: center;
    }
    .variable-value-error {
      margin: 0; padding: 2px var(--space-3, 12px) var(--space-2, 8px) calc(var(--space-3, 12px) + 72px + var(--space-2, 8px));
      font-size: 0.68rem; color: var(--color-error, #dc2626); background: var(--bg-card, #fff);
    }
    .variable-conflict-warning {
      display: flex; align-items: flex-start; gap: var(--space-2, 6px);
      padding: var(--space-2, 8px) var(--space-3, 12px);
      border-top: 1px solid var(--color-warning-border, #f59e0b);
      background: var(--color-warning-bg, rgba(245,158,11,0.08));
      font-size: 0.72rem; color: var(--color-warning-text, #92400e); line-height: 1.4;
    }
    .variable-conflict-icon { flex-shrink: 0; margin-top: 1px; color: var(--color-warning, #f59e0b); }
    .variable-conflict-warning--impossible {
      border-top-color: var(--color-error-border, #ef4444);
      background: var(--color-error-bg, rgba(239,68,68,0.08));
      color: var(--color-error-text, #7f1d1d);
    }
    .variable-conflict-warning--impossible .variable-conflict-icon { color: var(--color-error, #ef4444); }
    .case-options {
      display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-4, 16px);
      padding: var(--space-2, 8px) var(--space-3, 12px);
      border-top: 1px solid var(--border-color);
      font-size: var(--font-size-sm, 0.875rem); color: var(--text-secondary, #64748b);
    }
    .case-options-label { font-weight: var(--font-weight-medium, 500); }
    .case-option { display: inline-flex; align-items: center; gap: var(--space-2, 8px); cursor: pointer; }
    .case-option input[type="checkbox"] { cursor: pointer; }
    /* ── Operator dropdown ──────────────────────────────────────────────── */
    .op-dropdown-wrapper { position: relative; flex-shrink: 0; }
    .op-trigger {
      display: inline-flex; align-items: center; gap: 4px; width: 72px;
      padding: var(--space-1, 4px) var(--space-2, 8px);
      border: 1px solid var(--border-color); border-radius: var(--radius-md, 6px);
      background: var(--bg-card, #fff); color: var(--text-primary);
      font-size: var(--font-size-sm, 0.875rem); font-family: var(--font-mono, monospace);
      cursor: pointer; white-space: nowrap; transition: border-color 0.15s, background 0.15s;
    }
    .op-trigger:hover, .op-trigger--open { border-color: var(--color-primary, #2563eb); background: var(--color-gray-50, #f9fafb); }
    .op-trigger-caret { font-size: 0.6rem; color: var(--text-muted); transition: transform 0.15s; }
    .op-trigger--open .op-trigger-caret { transform: rotate(180deg); }
    .op-menu {
      position: fixed; z-index: 1100; min-width: 170px; background: var(--bg-card, #fff);
      border: 1px solid var(--border-color); border-radius: var(--radius-md, 6px);
      box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.12)); padding: var(--space-1, 4px);
    }
    .op-menu-row {
      display: flex; align-items: center; gap: var(--space-3, 12px); width: 100%;
      padding: 6px var(--space-3, 12px); border: none; border-radius: var(--radius-sm, 4px);
      background: transparent; cursor: pointer; text-align: left; transition: background 0.12s;
    }
    .op-menu-row:hover, .op-menu-row--selected { background: var(--color-gray-50, #f9fafb); }
    .op-menu-symbol { font-family: var(--font-mono, monospace); font-size: var(--font-size-sm, 0.875rem); font-weight: 600; color: var(--color-primary, #2563eb); width: 16px; text-align: center; flex-shrink: 0; }
    .op-menu-name { flex: 1; font-size: var(--font-size-sm, 0.875rem); color: var(--text-secondary, #6b7280); }
    .op-menu-row--selected .op-menu-name { color: var(--text-primary); }
    /* ── Chip input hint block (Instance ID & Business Key) ────────────────── */
    .chip-input-hint-block { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; }
    .chip-hint-main { margin: 0; font-size: 0.75rem; font-weight: 500; color: var(--text-secondary, #4b5563); }
    .chip-hint-tip { margin: 0; font-size: 0.65rem; color: var(--text-muted, #6b7280); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectInstancesDialogComponent implements OnInit, OnDestroy {
  private cockpitService = inject(CockpitService);
  private processInstanceService = inject(ProcessInstanceService);
  private translateService = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  private _discardStateOnDestroy = false;
  private _pendingRestoredIds: string[] | null = null;

  @Input() processDefinitionId!: string;
  @Input() sourceActivityId: string | null = null;
  @Input() availableActivities: BpmnElement[] = [];
  @Input() targetActivityId: string | null = null;

  @Output() cancelled = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<InstanceSelectionResult>();
  @Output() activityIdCriterionChange = new EventEmitter<string | null>();

  faSpinner = faSpinner; faPlus = faPlus; faTimes = faTimes;
  faFilter = faFilter; faHashtag = faHashtag; faKey = faKey; faSitemap = faSitemap;
  faSync = faSync; faCircleDot = faCircleDot; faExclamationTriangle = faExclamationTriangle;
  faCalendarAlt = faCalendarAlt;
  faCode = faCode;
  faGear = faGear;
  faCheck = faCheck;
  faServer = faServer;
  faChevronDown = faChevronDown;

  readonly variableOperators = [
    { value: 'eq'   as VariableOperator, label: '=',  name: 'equals' },
    { value: 'neq'  as VariableOperator, label: '≠',  name: 'not equals' },
    { value: 'gt'   as VariableOperator, label: '>',  name: 'greater than' },
    { value: 'gteq' as VariableOperator, label: '≥',  name: 'greater or equal' },
    { value: 'lt'   as VariableOperator, label: '<',  name: 'less than' },
    { value: 'lteq' as VariableOperator, label: '≤',  name: 'less or equal' },
    { value: 'like' as VariableOperator, label: '~',  name: 'like' },
  ];

  private readonly ACTIVITY_ICON_MAP: Record<string, { icon: any; color: string }> = {
    'bpmn:StartEvent':                { icon: faPlay,                   color: 'var(--color-success)' },
    'bpmn:EndEvent':                  { icon: faCircleStop,             color: 'var(--color-danger)' },
    'bpmn:UserTask':                  { icon: faUser,                   color: 'var(--color-primary)' },
    'bpmn:ServiceTask':               { icon: faGear,                   color: 'var(--color-primary)' },
    'bpmn:ScriptTask':                { icon: faCode,                   color: 'var(--color-primary)' },
    'bpmn:BusinessRuleTask':          { icon: faTable,                  color: 'var(--color-primary)' },
    'bpmn:SendTask':                  { icon: faPaperPlane,             color: 'var(--color-primary)' },
    'bpmn:ReceiveTask':               { icon: faInbox,                  color: 'var(--color-primary)' },
    'bpmn:ManualTask':                { icon: faHand,                   color: 'var(--color-primary)' },
    'bpmn:CallActivity':              { icon: faArrowUpRightFromSquare, color: 'var(--color-primary)' },
    'bpmn:SubProcess':                { icon: faLayerGroup,             color: 'var(--color-primary)' },
    'bpmn:ExclusiveGateway':          { icon: faXmark,                  color: 'var(--color-warning)' },
    'bpmn:ParallelGateway':           { icon: faPlus,                   color: 'var(--color-warning)' },
    'bpmn:InclusiveGateway':          { icon: faPlus,                   color: 'var(--color-warning)' },
    'bpmn:IntermediateCatchEvent':    { icon: faCircleDot,              color: 'var(--text-secondary)' },
    'bpmn:IntermediateThrowEvent':    { icon: faCircleDot,              color: 'var(--text-secondary)' },
    'bpmn:BoundaryEvent':             { icon: faCircleDot,              color: 'var(--text-secondary)' },
  };

  getActivityIcon(type: string): any {
    return (this.ACTIVITY_ICON_MAP[type] ?? { icon: faSquare }).icon;
  }

  getActivityIconColor(type: string): string {
    return (this.ACTIVITY_ICON_MAP[type] ?? { color: 'var(--text-muted)' }).color;
  }

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
  pendingVariableLines: PendingVariableLine[] = [];
  openOperatorMenuIndex: number | null = null;
  opMenuPosition: { top: number; left: number; minWidth: number } | null = null;
  variableNamesIgnoreCase = false;
  variableValuesIgnoreCase = false;
  hoveredId: string | null = null;
  activityHighlightIndex: number | null = null;

  get safeEditorType(): MoveField {
    return this.activeEditorType!;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const inOpMenu = !!target.closest('.op-menu');
    if (inOpMenu) return;
    if (this.openOperatorMenuIndex !== null) {
      this.openOperatorMenuIndex = null;
      this.opMenuPosition = null;
      this.cdr.markForCheck();
    }
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
    if (this.openOperatorMenuIndex !== null) {
      this.openOperatorMenuIndex = null;
      this.opMenuPosition = null;
      this.cdr.markForCheck();
    } else if (this.activeEditorType !== null) {
      this.cancelEdit();
    } else if (this.showCriteriaDropdown) {
      this.showCriteriaDropdown = false;
      this.cdr.markForCheck();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onActivityPickerKeydown(event: KeyboardEvent): void {
    if (this.activeEditorType !== 'activityId' || this.availableActivities.length === 0) return;
    const enabled = this.availableActivities
      .map((act, i) => ({ act, i }))
      .filter(({ act }) => act.id !== this.targetActivityId);
    if (!enabled.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.activityHighlightIndex === null) {
        this.activityHighlightIndex = enabled[0].i;
      } else {
        const pos = enabled.findIndex(e => e.i === this.activityHighlightIndex);
        if (pos < enabled.length - 1) this.activityHighlightIndex = enabled[pos + 1].i;
      }
      this.cdr.markForCheck();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.activityHighlightIndex !== null) {
        const pos = enabled.findIndex(e => e.i === this.activityHighlightIndex);
        if (pos > 0) this.activityHighlightIndex = enabled[pos - 1].i;
      }
      this.cdr.markForCheck();
    } else if (event.key === 'Enter' && this.activityHighlightIndex !== null) {
      event.preventDefault();
      const act = this.availableActivities[this.activityHighlightIndex];
      if (act) {
        this.selectActivity(act.id);
        this.confirmEdit();
      }
    }
  }

  private saveToSessionStorage(): void {
    try {
      const sourceActivity = this.sourceActivityId
        ? (this.availableActivities.find(a => a.id === this.sourceActivityId) ?? { id: this.sourceActivityId, type: 'bpmn:FlowNode' })
        : null;
      const targetActivity = this.targetActivityId
        ? (this.availableActivities.find(a => a.id === this.targetActivityId) ?? { id: this.targetActivityId, type: 'bpmn:FlowNode' })
        : null;
      const state: DialogPersistedState = {
        processDefinitionId: this.processDefinitionId,
        activePills: this.activePills,
        selectionMode: this.selectionMode,
        selectedIds: [...this.selectedIds],
        variableNamesIgnoreCase: this.variableNamesIgnoreCase,
        variableValuesIgnoreCase: this.variableValuesIgnoreCase,
        sourceActivity,
        targetActivity,
      };
      sessionStorage.setItem(MOVE_INSTANCES_DIALOG_SESSION_KEY, JSON.stringify(state));
    } catch { }
  }

  private loadFromSessionStorage(): boolean {
    try {
      const raw = sessionStorage.getItem(MOVE_INSTANCES_DIALOG_SESSION_KEY);
      if (!raw) return false;
      const state: DialogPersistedState = JSON.parse(raw);
      if (state?.processDefinitionId !== this.processDefinitionId) return false;
      this.activePills = state.activePills ?? [];
      this.selectionMode = state.selectionMode ?? 'instance';
      this.variableNamesIgnoreCase = state.variableNamesIgnoreCase ?? false;
      this.variableValuesIgnoreCase = state.variableValuesIgnoreCase ?? false;
      if (state.selectedIds?.length) {
        this._pendingRestoredIds = state.selectedIds;
      }
      return true;
    } catch { return false; }
  }

  private clearSessionStorage(): void {
    try { sessionStorage.removeItem(MOVE_INSTANCES_DIALOG_SESSION_KEY); } catch { }
  }

  ngOnDestroy(): void {
    if (!this._discardStateOnDestroy) {
      this.saveToSessionStorage();
    }
  }

  ngOnInit(): void {
    const restored = this.loadFromSessionStorage();
    if (!restored && this.sourceActivityId) {
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
      case 'incidentId':
      case 'incidentType':
      case 'incidentMessageLike':   return this.faExclamationTriangle;
      case 'startedAfter':
      case 'startedBefore':          return this.faCalendarAlt;
      case 'variables':              return this.faCode;
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
      case 'incidentId':             return `${t('queryIncidentId')}: ${v}`;
      case 'incidentType': {
        const typeLabel: Record<string, string> = {
          failedJob: t('incidentTypeFailedJob'),
          failedExternalTask: t('incidentTypeFailedExternalTask'),
        };
        return `${t('queryIncidentType')}: ${typeLabel[v] ?? v}`;
      }
      case 'incidentMessageLike':    return `${t('queryIncidentMessageLike')}: ${v}`;
      case 'activityId':             return `${t('queryActivityId')}: ${v}`;
      case 'startedAfter':           return `${t('queryStartedAfter')}: ${this.formatDisplayDate(v)}`;
      case 'startedBefore':          return `${t('queryStartedBefore')}: ${this.formatDisplayDate(v)}`;
      case 'variables': {
        const count = pill.variableLines?.length ?? 0;
        return this.translateService.instant('cockpit.processes.globalSearch.pill.variables', { count: String(count) });
      }
      default:                       return pill.field;
    }
  }

  getFieldLabel(field: MoveField): string {
    if (field === 'variables') {
      return this.translateService.instant('cockpit.processes.filters.variable');
    }
    const keyMap: Partial<Record<MoveField, string>> = {
      instanceId: 'queryInstanceIds',
      businessKey: 'queryBusinessKey',
      superProcessInstanceId: 'querySuperProcessInstanceId',
      subProcessInstanceId: 'querySubProcessInstanceId',
      incidentId: 'queryIncidentId',
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

  getFieldPlaceholder(_field: MoveField): string {
    return this.translateService.instant('cockpit.modify.selectDialog.enterValue');
  }

  dropdownMaxHeight = '420px';

  toggleCriteriaDropdown(event: Event): void {
    event.stopPropagation();
    if (this.activeEditorType !== null) this.cancelEdit();
    this.showCriteriaDropdown = !this.showCriteriaDropdown;
    if (this.showCriteriaDropdown) {
      const btn = event.currentTarget as HTMLElement | null;
      const modal = btn?.closest('.modal-container') as HTMLElement | null;
      if (btn && modal) {
        const btnRect = btn.getBoundingClientRect();
        const modalRect = modal.getBoundingClientRect();
        const available = modalRect.bottom - btnRect.bottom - 6 - 8;
        this.dropdownMaxHeight = Math.min(420, Math.max(80, available)) + 'px';
      }
    }
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
    this.pendingVariableLines = [];
    this.activityHighlightIndex = null;
    if (pill.field === 'variables') {
      this.pendingVariableLines = (pill.variableLines && pill.variableLines.length > 0)
        ? pill.variableLines.map(l => ({
            name: l.variableName,
            operator: (l.variableOperator || 'eq') as VariableOperator,
            values: [...l.values]
          }))
        : [{ name: '', operator: 'eq' as VariableOperator, values: [] }];
      return;
    }
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

    if (field === 'variables') {
      if (!this.hasInvalidVariableValues) {
        const validLines: VariableLine[] = this.pendingVariableLines
          .filter(l => l.name.trim() && l.values.length > 0)
          .map(l => ({ variableName: l.name.trim(), variableOperator: l.operator, values: [...l.values] }));
        if (validLines.length === 0) {
          if (this.editingPillIndex !== null) {
            this.activePills = this.activePills.filter((_, i) => i !== this.editingPillIndex);
          }
        } else {
          const pill: MovePill = { field: 'variables', values: [], variableLines: validLines };
          if (this.editingPillIndex !== null) {
            this.activePills = this.activePills.map((p, i) => i === this.editingPillIndex ? pill : p);
          } else {
            this.activePills = [...this.activePills, pill];
          }
        }
        this.activeEditorType = null;
        this.editingPillIndex = null;
        this.pendingVariableLines = [];
        this.openOperatorMenuIndex = null;
        this.opMenuPosition = null;
        this.cdr.markForCheck();
        this.search();
      }
      return;
    }

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
    this.activityHighlightIndex = null;
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
    this.pendingVariableLines = [];
    this.openOperatorMenuIndex = null;
    this.opMenuPosition = null;
    this.activityHighlightIndex = null;
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
          // Handled exclusively in search() via processInstanceBusinessKeyLike — never in body here
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
        case 'incidentId':
          if (pill.values[0]) body['incidentId'] = pill.values[0];
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
        case 'startedBefore': {
          if (pill.values[0]) {
            const dateStr = pill.values[0];
            const endOfDay = pill.field === 'startedBefore';
            const withTime = dateStr.length === 10 ? `${dateStr}${endOfDay ? 'T23:59:59' : 'T00:00:00'}` : dateStr;
            const d = new Date(withTime);
            if (!isNaN(d.getTime())) {
              const offset = -d.getTimezoneOffset();
              const sign = offset >= 0 ? '+' : '-';
              const absOff = Math.abs(offset);
              const hh = String(Math.floor(absOff / 60)).padStart(2, '0');
              const mm = String(absOff % 60).padStart(2, '0');
              const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}.000${sign}${hh}${mm}`;
              body[pill.field] = iso;
            }
          }
          break;
        }
        case 'variables': {
          const validLines = pill.variableLines?.filter(l => l.variableName.trim() && l.values.length > 0) ?? [];
          if (validLines.length > 0) {
            const hasMultiValue = validLines.some(l => l.values.length > 1);
            if (!hasMultiValue) {
              // All single-value: flat variables[] (AND semantics across variable lines)
              body['variables'] = validLines.map(l => ({
                name: l.variableName, operator: l.variableOperator,
                value: parseVariableValue(l.values[0], l.variableOperator)
              }));
            } else {
              // At least one multi-value: orQueries (OR within same variable, AND between variables)
              body['orQueries'] = validLines.map(l => ({
                variables: l.values.map(v => ({
                  name: l.variableName, operator: l.variableOperator,
                  value: parseVariableValue(v, l.variableOperator)
                }))
              }));
            }
          }
          break;
        }
      }
    }

    if (this.variableNamesIgnoreCase) body['variableNamesIgnoreCase'] = true;
    if (this.variableValuesIgnoreCase) body['variableValuesIgnoreCase'] = true;

    return body;
  }

  addVariableLine(): void {
    this.pendingVariableLines = [...this.pendingVariableLines, { name: '', operator: 'eq', values: [] }];
    this.cdr.markForCheck();
  }

  removeVariableLine(index: number): void {
    this.pendingVariableLines = this.pendingVariableLines.filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  onVariableLineValuesChange(index: number, values: string[]): void {
    this.pendingVariableLines[index].values = values;
    this.cdr.markForCheck();
  }

  trackVariableLine(index: number): number {
    return index;
  }

  isMultiValueOperator(op: VariableOperator): boolean {
    return op === 'eq' || op === 'neq' || op === 'like';
  }

  isComparisonValueInvalid(line: PendingVariableLine): boolean {
    if (this.isMultiValueOperator(line.operator)) return false;
    if (line.values.length === 0 || line.values[0].trim() === '') return false;
    return isNaN(Number(line.values[0].trim()));
  }

  get hasInvalidVariableValues(): boolean {
    return this.pendingVariableLines.some(l => this.isComparisonValueInvalid(l));
  }

  get variableConflicts(): VariableConflictInfo[] {
    const nameLines = new Map<string, PendingVariableLine[]>();
    for (const line of this.pendingVariableLines) {
      const name = line.name.trim().toLowerCase();
      if (!name) continue;
      if (!nameLines.has(name)) nameLines.set(name, []);
      nameLines.get(name)!.push(line);
    }
    const conflicts: VariableConflictInfo[] = [];
    for (const [name, lines] of nameLines) {
      const ops = new Set(lines.map(l => l.operator));
      if (ops.size <= 1) continue;
      const numericOps = new Set<VariableOperator>(['eq', 'neq', 'gt', 'gteq', 'lt', 'lteq']);
      const allNumericOps = lines.every(l => numericOps.has(l.operator));
      const allNumericValues = lines.every(l => {
        if (l.values.length !== 1) return false;
        const n = Number(l.values[0].trim());
        return l.values[0].trim() !== '' && !isNaN(n);
      });
      if (allNumericOps && allNumericValues) {
        const conditions = lines.map(l => ({ op: l.operator, val: Number(l.values[0].trim()) }));
        if (!this.conditionsIntersect(conditions)) {
          const detail = conditions.map(c => `${this.getOperatorLabel(c.op as VariableOperator)} ${c.val}`).join(' and ');
          conflicts.push({ name, type: 'impossible', detail });
        }
      } else {
        conflicts.push({ name, type: 'generic', detail: '' });
      }
    }
    return conflicts;
  }

  private conditionsIntersect(conditions: Array<{ op: string; val: number }>): boolean {
    let lo = -Infinity, hi = Infinity;
    let loStrict = false, hiStrict = false;
    const eqs: number[] = [], neqs: number[] = [];
    for (const { op, val } of conditions) {
      if (op === 'gt')        { if (val > lo || (val === lo && !loStrict)) { lo = val; loStrict = true; } }
      else if (op === 'gteq') { if (val > lo) { lo = val; loStrict = false; } }
      else if (op === 'lt')   { if (val < hi || (val === hi && !hiStrict)) { hi = val; hiStrict = true; } }
      else if (op === 'lteq') { if (val < hi) { hi = val; hiStrict = false; } }
      else if (op === 'eq')   { eqs.push(val); }
      else if (op === 'neq')  { neqs.push(val); }
    }
    if (lo > hi) return false;
    if (lo === hi && (loStrict || hiStrict)) return false;
    if (eqs.length > 0) {
      const firstEq = eqs[0];
      if (eqs.some(v => v !== firstEq)) return false;
      if (firstEq < lo || (firstEq === lo && loStrict)) return false;
      if (firstEq > hi || (firstEq === hi && hiStrict)) return false;
      if (neqs.includes(firstEq)) return false;
    }
    if (lo === hi && !loStrict && !hiStrict && neqs.includes(lo)) return false;
    return true;
  }

  toggleOperatorMenu(index: number, trigger: HTMLElement): void {
    if (this.openOperatorMenuIndex === index) {
      this.openOperatorMenuIndex = null;
      this.opMenuPosition = null;
      this.cdr.markForCheck();
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const estimatedMenuHeight = 7 * 34 + 12;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= estimatedMenuHeight
      ? rect.bottom + 4
      : Math.max(4, rect.top - estimatedMenuHeight - 4);
    this.opMenuPosition = { top, left: rect.left, minWidth: Math.max(rect.width, 170) };
    this.openOperatorMenuIndex = index;
    this.cdr.markForCheck();
  }

  selectOperator(index: number, op: VariableOperator): void {
    const line = this.pendingVariableLines[index];
    const wasMulti = this.isMultiValueOperator(line.operator);
    const willBeMulti = this.isMultiValueOperator(op);
    const values = (wasMulti && !willBeMulti && line.values.length > 1) ? [line.values[0]] : line.values;
    this.pendingVariableLines[index] = { ...line, operator: op, values };
    this.openOperatorMenuIndex = null;
    this.opMenuPosition = null;
    this.cdr.markForCheck();
  }

  onVariableLineSingleValueChange(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.pendingVariableLines[index].values = value.trim() ? [value] : [];
    this.cdr.markForCheck();
  }

  getOperatorLabel(op: VariableOperator): string {
    const ops: Record<VariableOperator, string> = {
      eq: '=', neq: '≠', gt: '>', gteq: '≥', lt: '<', lteq: '≤', like: '~'
    };
    return ops[op] ?? op;
  }

  search(): void {
    this.searching = true;
    this.searchError = false;
    this.selectedIds.clear();
    this.cdr.markForCheck();

    const sorting = [{ sortBy: 'startTime', sortOrder: 'desc' }];
    const bkPill = this.activePills.find(p => p.field === 'businessKey');
    const bkValues: string[] = bkPill?.values ?? [];
    const baseBody = { ...this.buildQueryBody(), sorting } as Record<string, unknown>;

    const activityIds = baseBody['activeActivityIdIn'] as string[] | undefined;
    const incidentId = baseBody['incidentId'] as string | undefined;

    const needsResolution = !!(activityIds?.length || incidentId);

    const resolveBody$: Observable<Record<string, unknown> | null> = needsResolution
      ? forkJoin({
          runtimeIds: activityIds?.length
            ? this.processInstanceService.getRuntimeInstanceIdsByActivity({
                activityIdIn: activityIds,
                processDefinitionId: this.processDefinitionId
              })
            : of([] as string[]),
          incidentProcId: incidentId
            ? this.processInstanceService.getProcessInstanceIdByIncident(incidentId)
            : of(null as string | null)
        }).pipe(
          map(({ runtimeIds, incidentProcId }) => {
            const body = { ...baseBody };
            delete body['activeActivityIdIn'];
            delete body['incidentId'];

            const existingIds = body['processInstanceIds'] as string[] | undefined;
            delete body['processInstanceIds'];
            let ids: string[] | null = existingIds?.slice() ?? null;

            if (activityIds?.length) {
              if (!runtimeIds.length) return null;
              ids = ids !== null
                ? runtimeIds.filter(id => (ids as string[]).includes(id))
                : runtimeIds.slice();
              if (!ids.length) return null;
            }

            if (incidentId) {
              if (!incidentProcId) return null;
              ids = ids !== null
                ? ids.filter(id => id === incidentProcId)
                : [incidentProcId];
              if (!ids.length) return null;
            }

            if (ids !== null) body['processInstanceIds'] = ids;
            return body;
          })
        )
      : of(baseBody);

    resolveBody$.pipe(
      switchMap((body): Observable<ProcessInstance[]> => {
        if (body === null) return of([]);
        if (bkValues.length === 0) {
          return this.cockpitService.queryProcessInstances(body, 0, 1000);
        }
        if (bkValues.length === 1) {
          return this.cockpitService.queryProcessInstances(
            { ...body, processInstanceBusinessKeyLike: `%${bkValues[0]}%` }, 0, 1000
          );
        }
        return forkJoin(
          bkValues.map(val => this.cockpitService.queryProcessInstances(
            { ...body, processInstanceBusinessKeyLike: `%${val}%` }, 0, 1000
          ))
        ).pipe(
          map(results => {
            const seen = new Set<string>();
            const merged: ProcessInstance[] = [];
            for (const arr of results) {
              for (const inst of arr) {
                if (!seen.has(inst.id)) { seen.add(inst.id); merged.push(inst); }
              }
            }
            return merged.sort((a, b) =>
              new Date((b as any).startTime).getTime() - new Date((a as any).startTime).getTime()
            );
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: instances => {
        this.searchResults = instances;
        if (this._pendingRestoredIds) {
          const validIds = new Set(instances.map(i => i.id));
          for (const id of this._pendingRestoredIds) {
            if (validIds.has(id)) this.selectedIds.add(id);
          }
          this._pendingRestoredIds = null;
        }
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
    this._discardStateOnDestroy = true;
    this.clearSessionStorage();
    this.cancelled.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this._discardStateOnDestroy = true;
      this.clearSessionStorage();
      this.cancelled.emit();
    }
  }

  private formatDisplayDate(iso: string): string {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(); }
    catch { return iso; }
  }
}
