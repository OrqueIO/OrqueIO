import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TooltipDirective } from '../../../shared/tooltip/tooltip.directive';
import { Task, TaskForm } from '../../../models/tasklist';
import { TasklistService } from '../../../services/tasklist/tasklist.service';

interface FormVariable {
  name: string;
  type: string;
  value: any;
  label?: string;
  originalValue?: any; // To track changes for save
}

type FormType = 'embedded' | 'orqueio-forms' | 'external' | 'generic';

@Component({
  selector: 'app-task-form-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, TooltipDirective],
  templateUrl: './task-form-tab.html',
  styleUrl: './task-form-tab.css'
})
export class TaskFormTabComponent implements OnInit, OnChanges {
  private readonly tasklistService = inject(TasklistService);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('formContainer') formContainer!: ElementRef;

  @Input() task!: Task;
  @Input() form: TaskForm | null = null;
  @Input() isAssignee = false;

  @Output() complete = new EventEmitter<Record<string, any>>();
  @Output() save = new EventEmitter<Record<string, any>>();

  loading = true;
  loadingError: string | null = null;
  variables: FormVariable[] = [];
  submitting = false;
  saving = false;
  isDirty = false;

  // Form type detection
  formType: FormType = 'generic';

  // Options (would come from configuration)
  hideCompleteButton = false;
  hideSaveButton = false;
  hideLoadVariablesButton = false;
  disableCompleteButton = false;
  disableForm = false;
  disableAddVariableButton = false;

  ngOnInit(): void {
    this.detectFormType();
    this.loadFormVariables();
    this.updateOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] && !changes['task'].firstChange) {
      this.detectFormType();
      this.loadFormVariables();
      this.isDirty = false;
    }
    if (changes['form'] && !changes['form'].firstChange) {
      this.detectFormType();
    }
    if (changes['isAssignee']) {
      this.updateOptions();
    }
  }

  // Keyboard shortcut: Ctrl+Enter to complete
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey && (event.key === 'Enter' || event.keyCode === 13)) {
      event.preventDefault();
      if (!this.disableCompleteButton && !this.submitting) {
        this.onComplete();
      }
    }
  }

  private detectFormType(): void {
    if (!this.form?.key) {
      this.formType = 'generic';
      return;
    }

    const key = this.form.key.toLowerCase();

    // Check for Orqueio forms
    if (key.startsWith('orqueio:') || this.form.key.includes('orqueio-forms')) {
      this.formType = 'orqueio-forms';
      return;
    }

    // Check for embedded forms
    if (key.startsWith('embedded:') || key.startsWith('app:')) {
      this.formType = 'embedded';
      return;
    }

    // Check for external forms (deployment context)
    if (this.form.contextPath && this.form.key) {
      this.formType = 'external';
      return;
    }

    this.formType = 'generic';
  }

  private updateOptions(): void {
    this.disableCompleteButton = !this.isAssignee;
    this.disableForm = !this.isAssignee;
    this.disableAddVariableButton = !this.isAssignee;
    // Hide save button for generic forms (only show for embedded/external)
    this.hideSaveButton = this.formType === 'generic';
  }

  private loadFormVariables(): void {
    if (!this.task?.id) return;

    this.loading = true;
    this.loadingError = null;

    this.tasklistService.getTaskFormVariables(this.task.id).subscribe({
      next: (vars) => {
        this.variables = Object.entries(vars).map(([name, data]: [string, any]) => ({
          name,
          type: data.type || 'String',
          value: data.value,
          label: data.label || name,
          originalValue: data.value // Store original for dirty check
        }));
        this.loading = false;
        this.isDirty = false;
      },
      error: (err) => {
        this.loadingError = err.message || 'Failed to load form variables';
        this.loading = false;
      }
    });
  }

  onVariableChange(): void {
    this.isDirty = this.checkDirty();
  }

  private checkDirty(): boolean {
    return this.variables.some(v => v.value !== v.originalValue);
  }

  onSave(): void {
    if (this.saving || this.disableForm) return;

    this.saving = true;
    const variables = this.buildVariablesObject();

    // Save variables to task
    this.tasklistService.submitTaskForm(this.task.id, variables).subscribe({
      next: () => {
        // Update original values
        this.variables.forEach(v => v.originalValue = v.value);
        this.isDirty = false;
        this.saving = false;
        this.save.emit(variables);
      },
      error: (err) => {
        console.error('Failed to save form:', err);
        this.saving = false;
      }
    });
  }

  onComplete(): void {
    if (this.submitting || this.disableCompleteButton) return;

    this.submitting = true;
    const variables = this.buildVariablesObject();
    this.complete.emit(variables);
  }

  private buildVariablesObject(): Record<string, any> {
    const variables: Record<string, any> = {};
    for (const v of this.variables) {
      variables[v.name] = {
        value: v.value,
        type: v.type
      };
    }
    return variables;
  }

  addVariable(): void {
    if (this.disableAddVariableButton) return;

    this.variables.push({
      name: '',
      type: 'String',
      value: '',
      originalValue: ''
    });
    this.isDirty = true;
  }

  removeVariable(index: number): void {
    this.variables.splice(index, 1);
    this.isDirty = this.checkDirty();
  }

  getInputType(type: string): string {
    switch (type.toLowerCase()) {
      case 'integer':
      case 'long':
      case 'short':
      case 'double':
      case 'number':
        return 'number';
      case 'boolean':
        return 'checkbox';
      case 'date':
        return 'date';
      case 'datetime':
        return 'datetime-local';
      default:
        return 'text';
    }
  }

  // Form type checks
  isEmbeddedForm(): boolean {
    return this.formType === 'embedded';
  }

  isOrqueioForm(): boolean {
    return this.formType === 'orqueio-forms';
  }

  isExternalForm(): boolean {
    return this.formType === 'external';
  }

  isGenericForm(): boolean {
    return this.formType === 'generic';
  }

  getFormUrl(): string | null {
    if (!this.form?.key) {
      return null;
    }

    // Handle embedded: prefix
    if (this.form.key.startsWith('embedded:')) {
      return this.form.key.substring('embedded:'.length);
    }

    // Handle app: prefix
    if (this.form.key.startsWith('app:')) {
      return this.form.key.substring('app:'.length);
    }

    // Handle orqueio: prefix
    if (this.form.key.startsWith('orqueio:')) {
      const formKey = this.form.key.substring('orqueio:'.length);
      return `/orqueio/forms/${formKey}?taskId=${this.task.id}`;
    }

    // Combine contextPath and key for deployment forms
    if (this.form.contextPath) {
      return `${this.form.contextPath}/${this.form.key}`;
    }

    return this.form.key;
  }

  getEmbeddedFormUrl(): string | null {
    const url = this.getFormUrl();
    if (url) {
      // Add task context parameters
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}taskId=${this.task.id}`;
    }
    return null;
  }

  getSafeFormUrl(): SafeResourceUrl | null {
    const url = this.getEmbeddedFormUrl();
    if (url) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    return null;
  }

  openExternalForm(): void {
    const url = this.getFormUrl();
    if (url) {
      window.open(url, '_blank');
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  // Message for iframe communication (for embedded forms)
  @HostListener('window:message', ['$event'])
  onMessage(event: MessageEvent): void {
    // Handle messages from embedded forms
    if (event.data?.type === 'cam-form-complete') {
      this.onComplete();
    } else if (event.data?.type === 'cam-form-save') {
      this.onSave();
    } else if (event.data?.type === 'cam-form-dirty') {
      this.isDirty = event.data.dirty;
    }
  }
}
