import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TooltipDirective } from '../../../shared/tooltip/tooltip.directive';
import { Task, FilterVariable } from '../../../models/tasklist';
import { TasklistService } from '../../../services/tasklist/tasklist.service';

interface TaskVariable {
  name: string;
  type: string;
  value: any;
  label?: string;
}

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe, TooltipDirective],
  templateUrl: './task-card.html',
  styleUrl: './task-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskCardComponent implements OnInit, OnChanges {
  private readonly tasklistService = inject(TasklistService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() task!: Task;
  @Input() filterVariables: FilterVariable[] = [];
  @Input() showUndefinedVariable = false;

  variables: TaskVariable[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadVariables();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] || changes['filterVariables']) {
      this.loadVariables();
    }
  }

  private loadVariables(): void {
    if (!this.task?.id) return;

    // If filter has specific variables defined, only show those
    const variableNames = this.filterVariables.map(v => v.name);

    this.loading = true;

    if (variableNames.length > 0) {
      // Load only specific variables from filter
      this.tasklistService.getTaskVariables(this.task.id, variableNames).subscribe({
        next: (vars: Record<string, any>) => {
          this.variables = this.processVariables(vars, this.filterVariables);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.variables = [];
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      // Load all form variables
      this.tasklistService.getTaskFormVariables(this.task.id).subscribe({
        next: (vars) => {
          this.variables = Object.entries(vars).map(([name, data]: [string, any]) => ({
            name,
            type: data.type || 'String',
            value: data.value,
            label: name
          }));
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.variables = [];
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  private processVariables(vars: Record<string, any>, filterVars: FilterVariable[]): TaskVariable[] {
    const result: TaskVariable[] = [];

    for (const filterVar of filterVars) {
      const data = vars[filterVar.name];

      if (data !== undefined) {
        result.push({
          name: filterVar.name,
          type: data.type || 'String',
          value: data.value,
          label: filterVar.label || filterVar.name
        });
      } else if (this.showUndefinedVariable) {
        // Show undefined variables if configured
        result.push({
          name: filterVar.name,
          type: 'undefined',
          value: null,
          label: filterVar.label || filterVar.name
        });
      }
    }

    return result;
  }

  formatValue(variable: TaskVariable): string {
    if (variable.value === null || variable.value === undefined) {
      return '<null>';
    }

    switch (variable.type.toLowerCase()) {
      case 'boolean':
        return variable.value ? 'true' : 'false';
      case 'date':
        return new Date(variable.value).toLocaleDateString();
      case 'object':
      case 'json':
        try {
          return JSON.stringify(variable.value);
        } catch {
          return String(variable.value);
        }
      case 'bytes':
      case 'file':
        return `<${variable.type}>`;
      case 'undefined':
        return '<undefined>';
      default:
        return String(variable.value);
    }
  }

  getTypeIcon(type: string): string {
    switch (type.toLowerCase()) {
      case 'string': return 'Aa';
      case 'integer':
      case 'long':
      case 'short':
      case 'double':
      case 'number': return '#';
      case 'boolean': return '?';
      case 'date': return 'D';
      case 'object':
      case 'json': return '{}';
      case 'bytes':
      case 'file': return 'B';
      case 'undefined': return '-';
      case 'null': return 'N';
      default: return '?';
    }
  }

  getTypeLabel(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  }
}
