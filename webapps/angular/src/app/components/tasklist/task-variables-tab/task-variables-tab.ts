import { Component, Input, OnChanges, SimpleChanges, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { Task } from '../../../models/tasklist';
import { TasklistService } from '../../../services/tasklist/tasklist.service';
import { CamDatePipe } from '../../../pipes/cam-date.pipe';
import { VariableDetailModalComponent, VariableDetail } from '../variable-detail-modal/variable-detail-modal';

export interface ProcessVariable {
  name: string;
  type: string;
  value: any;
  valueInfo?: {
    objectTypeName?: string;
    serializationDataFormat?: string;
    filename?: string;
    mimeType?: string;
  };
}

// Pre-computed variable with type flags to avoid recalculating in template
export interface ComputedVariable extends ProcessVariable {
  displayType: string;
  displayValue: string;
  isObject: boolean;
  isFile: boolean;
  isBytes: boolean;
  isDate: boolean;
  isEmpty: boolean;
  isSerialized: boolean;
  downloadUrl: string;
}

// In-memory cache for variables by task ID
const variablesCache = new Map<string, { data: ComputedVariable[]; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache TTL

@Component({
  selector: 'app-task-variables-tab',
  standalone: true,
  imports: [CommonModule, TranslatePipe, CamDatePipe, VariableDetailModalComponent],
  templateUrl: './task-variables-tab.html',
  styleUrl: './task-variables-tab.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskVariablesTabComponent implements OnChanges {
  private readonly tasklistService = inject(TasklistService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() task!: Task;

  // All loaded variables (cached)
  private allVariables: ComputedVariable[] = [];

  // Variables currently displayed (progressive rendering)
  variables: ComputedVariable[] = [];
  loading = false;
  error: string | null = null;

  // Progressive rendering settings
  private readonly INITIAL_BATCH_SIZE = 20;
  private readonly BATCH_SIZE = 20;
  displayedCount = 0;

  // Variable detail modal
  showVariableDetailModal = false;
  selectedVariable: VariableDetail | null = null;

  get hasMore(): boolean {
    return this.displayedCount < this.allVariables.length;
  }

  get remainingCount(): number {
    return this.allVariables.length - this.displayedCount;
  }

  get totalCount(): number {
    return this.allVariables.length;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] && this.task?.id) {
      this.loadVariables();
    }
  }

  loadVariables(): void {
    if (!this.task?.id) return;

    const taskId = this.task.id;

    // Check cache first
    const cached = variablesCache.get(taskId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      this.allVariables = cached.data;
      this.displayInitialBatch();
      this.loading = false;
      this.error = null;
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.tasklistService.getTaskVariables(taskId).subscribe({
      next: (variablesMap) => {
        const computed = Object.entries(variablesMap)
          .map(([name, data]: [string, any]) => this.computeVariable(name, data, taskId))
          .sort((a, b) => a.name.localeCompare(b.name));

        // Cache the result
        variablesCache.set(taskId, { data: computed, timestamp: Date.now() });

        this.allVariables = computed;
        this.displayInitialBatch();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err?.message || 'Failed to load variables';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Display first batch of variables for fast initial render
  private displayInitialBatch(): void {
    this.displayedCount = Math.min(this.INITIAL_BATCH_SIZE, this.allVariables.length);
    this.variables = this.allVariables.slice(0, this.displayedCount);
  }

  // Load more variables when user clicks "Show More"
  loadMore(): void {
    const newCount = Math.min(this.displayedCount + this.BATCH_SIZE, this.allVariables.length);
    this.displayedCount = newCount;
    this.variables = this.allVariables.slice(0, newCount);
    this.cdr.markForCheck();
  }

  // Show all remaining variables
  loadAll(): void {
    this.displayedCount = this.allVariables.length;
    this.variables = this.allVariables;
    this.cdr.markForCheck();
  }

  // Pre-compute all type checks and display values once
  private computeVariable(name: string, data: any, taskId: string): ComputedVariable {
    const type = data.type;
    const value = data.value;
    const valueInfo = data.valueInfo;

    const isObject = type === 'Object';
    const isFile = type === 'File';
    const isBytes = type === 'Bytes';
    const isDate = type === 'Date';
    const isEmpty = value === null || value === undefined;
    const isSerialized = isObject && valueInfo?.serializationDataFormat !== undefined;

    let displayType = type;
    if (isObject && valueInfo?.objectTypeName) {
      displayType = valueInfo.objectTypeName;
    }

    let displayValue = '';
    if (!isEmpty) {
      if (type === 'Boolean') {
        displayValue = value ? 'true' : 'false';
      } else if (!isObject && !isFile && !isBytes && !isDate) {
        displayValue = String(value);
      }
    }

    return {
      name,
      type,
      value,
      valueInfo,
      displayType,
      displayValue,
      isObject,
      isFile,
      isBytes,
      isDate,
      isEmpty,
      isSerialized,
      downloadUrl: `/orqueio/api/engine/engine/default/task/${taskId}/variables/${name}/data`
    };
  }

  // TrackBy function for ngFor performance
  trackByName(index: number, variable: ComputedVariable): string {
    return variable.name;
  }

  openVariableDetail(variable: ComputedVariable): void {
    this.selectedVariable = {
      name: variable.name,
      type: variable.type,
      value: variable.value,
      valueInfo: variable.valueInfo,
      taskId: this.task.id
    };
    this.showVariableDetailModal = true;
    this.cdr.markForCheck();
  }

  closeVariableDetailModal(): void {
    this.showVariableDetailModal = false;
    this.selectedVariable = null;
    this.cdr.markForCheck();
  }

  // Clear cache for a specific task (call when variables are modified)
  static clearCache(taskId?: string): void {
    if (taskId) {
      variablesCache.delete(taskId);
    } else {
      variablesCache.clear();
    }
  }
}
