import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
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

@Component({
  selector: 'app-task-variables-tab',
  standalone: true,
  imports: [CommonModule, TranslatePipe, CamDatePipe, VariableDetailModalComponent],
  templateUrl: './task-variables-tab.html',
  styleUrl: './task-variables-tab.css'
})
export class TaskVariablesTabComponent implements OnChanges {
  private readonly tasklistService = inject(TasklistService);

  @Input() task!: Task;

  variables: ProcessVariable[] = [];
  loading = false;
  error: string | null = null;

  // Variable detail modal
  showVariableDetailModal = false;
  selectedVariable: VariableDetail | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] && this.task?.id) {
      this.loadVariables();
    }
  }

  loadVariables(): void {
    if (!this.task?.id) return;

    this.loading = true;
    this.error = null;

    this.tasklistService.getTaskVariables(this.task.id).subscribe({
      next: (variablesMap) => {
        this.variables = Object.entries(variablesMap).map(([name, data]: [string, any]) => ({
          name,
          type: data.type,
          value: data.value,
          valueInfo: data.valueInfo
        }));
        // Sort alphabetically by name
        this.variables.sort((a, b) => a.name.localeCompare(b.name));
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message || 'Failed to load variables';
        this.loading = false;
      }
    });
  }

  getDisplayType(variable: ProcessVariable): string {
    if (variable.type === 'Object' && variable.valueInfo?.objectTypeName) {
      return variable.valueInfo.objectTypeName;
    }
    return variable.type;
  }

  getDisplayValue(variable: ProcessVariable): string {
    if (variable.value === null || variable.value === undefined) {
      return '<Empty>';
    }

    switch (variable.type) {
      case 'Boolean':
        return variable.value ? 'true' : 'false';
      case 'Date':
        // Will be formatted by the template using CamDatePipe
        return variable.value;
      case 'Object':
      case 'File':
      case 'Bytes':
        // These types have special rendering
        return '';
      default:
        return String(variable.value);
    }
  }

  isObjectType(variable: ProcessVariable): boolean {
    return variable.type === 'Object';
  }

  isFileType(variable: ProcessVariable): boolean {
    return variable.type === 'File';
  }

  isBytesType(variable: ProcessVariable): boolean {
    return variable.type === 'Bytes';
  }

  isDateType(variable: ProcessVariable): boolean {
    return variable.type === 'Date';
  }

  isEmptyValue(variable: ProcessVariable): boolean {
    return variable.value === null || variable.value === undefined;
  }

  isSerializedType(variable: ProcessVariable): boolean {
    return variable.type === 'Object' &&
           variable.valueInfo?.serializationDataFormat !== undefined;
  }

  getFileDownloadUrl(variable: ProcessVariable): string {
    return `/orqueio/api/engine/engine/default/task/${this.task.id}/variables/${variable.name}/data`;
  }

  getFileName(variable: ProcessVariable): string {
    return variable.valueInfo?.filename || variable.name;
  }

  openVariableDetail(variable: ProcessVariable): void {
    this.selectedVariable = {
      name: variable.name,
      type: variable.type,
      value: variable.value,
      valueInfo: variable.valueInfo,
      taskId: this.task.id
    };
    this.showVariableDetailModal = true;
  }

  closeVariableDetailModal(): void {
    this.showVariableDetailModal = false;
    this.selectedVariable = null;
  }
}
