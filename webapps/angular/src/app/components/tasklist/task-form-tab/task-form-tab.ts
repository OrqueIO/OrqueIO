import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges, inject, HostListener, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Actions, ofType } from '@ngrx/effects';
import { Subject, takeUntil, filter } from 'rxjs';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { Task, TaskForm } from '../../../models/tasklist';
import { TasklistService } from '../../../services/tasklist/tasklist.service';
import { TasksActions } from '../../../store/tasklist';

interface FormVariable {
  name: string;
  type: string;
  value: any;
  label?: string;
  originalValue?: any; // To track changes for save
  fixedName?: boolean; // If true, variable cannot be deleted (matches AngularJS behavior)
  readonly?: boolean; // For File type variables
  downloadUrl?: string; // For File type - URL to download the file
  file?: File; // For File type - the file object when uploading
  valueInfo?: {
    objectTypeName?: string;
    serializationDataFormat?: string;
  };
  // Validation errors
  errors?: {
    name?: string;
    type?: string;
    value?: string;
  };
}

type FormType = 'embedded' | 'orqueio-forms' | 'external' | 'generic';

@Component({
  selector: 'app-task-form-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './task-form-tab.html',
  styleUrl: './task-form-tab.css'
})
export class TaskFormTabComponent implements OnInit, OnChanges, OnDestroy {
  private readonly tasklistService = inject(TasklistService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly actions$ = inject(Actions);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('formContainer') formContainer!: ElementRef;

  @Input() task!: Task;
  @Input() form: TaskForm | null = null;
  @Input() isAssignee = false;
  @Input() actionsDisabled = false; // From parent when task is suspended or removed

  @Output() complete = new EventEmitter<Record<string, any>>();
  @Output() save = new EventEmitter<Record<string, any>>();

  // LocalStorage key prefix for form state recovery (matches AngularJS camFormStateToLocal)
  private readonly STORAGE_KEY_PREFIX = 'orqueio:task-form:';

  loading = false;
  loadingError: string | null = null;
  variables: FormVariable[] = [];
  submitting = false;
  saving = false;
  isDirty = false;
  variablesLoaded = false; // Track if variables have been loaded (matches AngularJS)
  variablesCollapsed = false; // Track if variables section is collapsed
  hasBeenRestoredFromStorage = false; // Track if form was restored from localStorage
  completeError: string | null = null; // Error message from complete failure

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
    // Don't auto-load variables - user clicks "Load Variables" (matches AngularJS behavior)
    this.updateOptions();

    // Subscribe to complete success/failure actions to reset submitting state
    this.actions$.pipe(
      ofType(TasksActions.completeTaskSuccess),
      filter(action => action.taskId === this.task?.id),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.submitting = false;
      this.completeError = null;
      this.cdr.detectChanges();
    });

    this.actions$.pipe(
      ofType(TasksActions.completeTaskFailure),
      filter(action => action.taskId === this.task?.id),
      takeUntil(this.destroy$)
    ).subscribe(({ error }) => {
      this.submitting = false;
      this.completeError = error;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] && !changes['task'].firstChange) {
      // Save current form state before switching tasks
      if (this.isDirty && this.variables.length > 0) {
        this.saveToLocalStorage();
      }

      this.detectFormType();
      // Reset variables state when task changes (user needs to click Load Variables again)
      this.variables = [];
      this.variablesLoaded = false;
      this.isDirty = false;
      this.hasBeenRestoredFromStorage = false;
      this.completeError = null; // Clear error when switching tasks
      this.submitting = false;

      // Try to restore from localStorage for new task
      this.restoreFromLocalStorage();
    }
    if (changes['form'] && !changes['form'].firstChange) {
      this.detectFormType();
    }
    if (changes['isAssignee'] || changes['actionsDisabled']) {
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
    // Disable buttons if not assignee OR if actions are disabled (task suspended/removed)
    this.disableCompleteButton = !this.isAssignee || this.actionsDisabled;
    this.disableForm = !this.isAssignee || this.actionsDisabled;
    this.disableAddVariableButton = !this.isAssignee || this.actionsDisabled;
    // Hide save button for generic forms (only show for embedded/external)
    this.hideSaveButton = this.formType === 'generic';
  }

  // Types that have fixedName=true (cannot be deleted) - matches AngularJS behavior
  private readonly FIXED_NAME_TYPES = ['Boolean', 'Integer', 'Long', 'Short', 'Double', 'String', 'Date'];

  // Types supported by the generic form - matches AngularJS variableTypes + Object + File
  // Variables with other types (like Bytes) are NOT shown in the form (same as AngularJS)
  private readonly SUPPORTED_TYPES = ['Boolean', 'Integer', 'Long', 'Short', 'Double', 'String', 'Date', 'Object', 'File'];

  loadVariables(): void {
    if (!this.task?.id) return;

    this.variablesLoaded = true; // Mark as loaded (even if API call fails)
    this.loading = true;
    this.loadingError = null;

    // Preserve manually added variables (those without originalValue)
    const manuallyAddedVariables = this.variables.filter(v => v.originalValue === undefined);

    this.tasklistService.getTaskFormVariables(this.task.id).subscribe({
      next: (vars) => {
        // Filter and map variables - only include supported types (matches AngularJS)
        const loadedVariables = Object.entries(vars)
          .filter(([, data]: [string, any]) => {
            const type = data.type || 'String';
            // Skip unsupported types like Bytes (same as AngularJS)
            return this.SUPPORTED_TYPES.includes(type);
          })
          .map(([name, data]: [string, any]) => {
            const type = data.type || 'String';
            const isFixedType = this.FIXED_NAME_TYPES.includes(type);
            const isFileType = type === 'File';

            const variable: FormVariable = {
              name,
              type,
              value: data.value,
              label: data.label || name,
              originalValue: data.value,
              // AngularJS behavior: only primitive types have fixedName=true
              // Object and File types can be deleted
              fixedName: isFixedType,
              readonly: isFileType,
              valueInfo: data.valueInfo || undefined
            };

            // For File types, add download URL
            if (isFileType) {
              variable.downloadUrl = `/api/engine/engine/default/task/${this.task.id}/variables/${name}/data`;
            }

            return variable;
          });

        // Merge: manually added variables first, then loaded variables
        this.variables = [...manuallyAddedVariables, ...loadedVariables];
        this.loading = false;
        // Keep isDirty true if there are manually added variables
        this.isDirty = manuallyAddedVariables.length > 0;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingError = err.message || 'Failed to load form variables';
        this.loading = false;
        this.variablesLoaded = false; // Allow retry on error
        this.cdr.detectChanges();
      }
    });
  }

  onVariableChange(): void {
    this.isDirty = this.checkDirty();
    // Validate in real-time
    this.validateVariables();
  }

  /**
   * Validate a single variable (for real-time validation)
   */
  validateVariable(index: number): void {
    const variable = this.variables[index];
    if (!variable) return;

    variable.errors = {};

    // Skip validation for loaded variables with fixedName
    if (variable.fixedName && variable.originalValue !== undefined) {
      return;
    }

    // Validate name
    if (variable.name && variable.name.trim() !== '') {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name)) {
        variable.errors.name = 'tasklist.validation.nameInvalid';
      } else {
        // Check for duplicates
        const duplicateIndex = this.variables.findIndex((v, i) => i !== index && v.name === variable.name);
        if (duplicateIndex !== -1) {
          variable.errors.name = 'tasklist.validation.nameDuplicate';
        }
      }
    }

    // Validate value based on type
    if (variable.type && variable.value !== undefined && variable.value !== null && variable.value !== '') {
      const valueError = this.validateValueForType(variable.value, variable.type);
      if (valueError) {
        variable.errors.value = valueError;
      }
    }
  }

  private checkDirty(): boolean {
    return this.variables.some(v => v.value !== v.originalValue);
  }

  onSave(): void {
    if (this.saving || this.disableForm) return;

    // Validate before saving
    if (!this.validateVariables()) {
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    const variables = this.buildVariablesObject();

    // Save variables to task
    this.tasklistService.submitTaskForm(this.task.id, variables).subscribe({
      next: () => {
        // Update original values
        this.variables.forEach(v => v.originalValue = v.value);
        this.isDirty = false;
        this.saving = false;
        this.hasBeenRestoredFromStorage = false;
        this.clearLocalStorage(); // Clear saved state after successful save
        this.save.emit(variables);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to save form:', err);
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }

  onComplete(): void {
    if (this.submitting || this.disableCompleteButton) return;

    // Validate before completing
    if (!this.validateVariables()) {
      this.cdr.detectChanges();
      return;
    }

    this.submitting = true;
    const variables = this.buildVariablesObject();
    this.clearLocalStorage(); // Clear saved state on complete
    this.complete.emit(variables);
  }

  /**
   * Validates all variables and sets error messages
   * @returns true if all variables are valid, false otherwise
   */
  private validateVariables(): boolean {
    let isValid = true;
    const variableNames = new Set<string>();

    for (const variable of this.variables) {
      variable.errors = {};

      // Skip validation for loaded variables with fixedName (they're already valid)
      if (variable.fixedName && variable.originalValue !== undefined) {
        continue;
      }

      // Validate name (required for new variables)
      if (!variable.name || variable.name.trim() === '') {
        variable.errors.name = 'tasklist.validation.nameRequired';
        isValid = false;
      } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name)) {
        // Variable name must be a valid identifier
        variable.errors.name = 'tasklist.validation.nameInvalid';
        isValid = false;
      } else if (variableNames.has(variable.name)) {
        // Check for duplicate names
        variable.errors.name = 'tasklist.validation.nameDuplicate';
        isValid = false;
      }

      if (variable.name) {
        variableNames.add(variable.name);
      }

      // Validate type (required)
      if (!variable.type) {
        variable.errors.type = 'tasklist.validation.typeRequired';
        isValid = false;
      }

      // Validate value based on type
      if (variable.type && variable.value !== undefined && variable.value !== null && variable.value !== '') {
        const valueError = this.validateValueForType(variable.value, variable.type);
        if (valueError) {
          variable.errors.value = valueError;
          isValid = false;
        }
      }
    }

    return isValid;
  }

  /**
   * Validates a value for a specific type
   */
  private validateValueForType(value: any, type: string): string | null {
    switch (type) {
      case 'Integer':
      case 'Long':
      case 'Short':
        if (value !== '' && !Number.isInteger(Number(value))) {
          return 'tasklist.validation.integerRequired';
        }
        break;
      case 'Double':
        if (value !== '' && isNaN(Number(value))) {
          return 'tasklist.validation.numberRequired';
        }
        break;
      case 'Date':
        if (value !== '' && isNaN(Date.parse(value))) {
          return 'tasklist.validation.dateInvalid';
        }
        break;
    }
    return null;
  }

  /**
   * Check if form has any validation errors
   */
  hasValidationErrors(): boolean {
    return this.variables.some(v => v.errors && (v.errors.name || v.errors.type || v.errors.value));
  }

  /**
   * Clear validation errors for a variable
   */
  clearValidationError(index: number, field: 'name' | 'type' | 'value'): void {
    if (this.variables[index]?.errors) {
      delete this.variables[index].errors![field];
    }
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

    // Ensure variables are visible when adding
    this.variablesCollapsed = false;

    // Add new variable at the beginning of the list (matches AngularJS emptyVariable)
    this.variables.unshift({
      name: '',
      type: '',  // Empty type - user must select one (matches AngularJS)
      value: ''
      // originalValue is intentionally not set (undefined) for new variables
      // This allows the remove button to show for new variables
    });
    this.isDirty = true;
    this.cdr.detectChanges();
  }

  removeVariable(index: number): void {
    this.variables.splice(index, 1);
    this.isDirty = this.checkDirty();
  }

  toggleVariables(): void {
    this.variablesCollapsed = !this.variablesCollapsed;
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

  onFileChange(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.variables[index].file = input.files[0];
      this.isDirty = true;
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

  // ==================== LocalStorage Form State Recovery ====================
  // Matches AngularJS camFormStateToLocal behavior

  /**
   * Get the localStorage key for the current task
   */
  private getStorageKey(): string | null {
    if (!this.task?.id) return null;
    return `${this.STORAGE_KEY_PREFIX}${this.task.id}`;
  }

  /**
   * Save form state to localStorage (called when switching tasks or on window unload)
   */
  private saveToLocalStorage(): void {
    const key = this.getStorageKey();
    if (!key || this.variables.length === 0) return;

    try {
      const state = {
        variables: this.variables.map(v => ({
          name: v.name,
          type: v.type,
          value: v.value,
          valueInfo: v.valueInfo
        })),
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      // localStorage might be full or disabled - ignore
      console.warn('Could not save form state to localStorage:', e);
    }
  }

  /**
   * Restore form state from localStorage (called on task change)
   */
  private restoreFromLocalStorage(): void {
    const key = this.getStorageKey();
    if (!key) return;

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return;

      const state = JSON.parse(stored);

      // Check if stored state is too old (e.g., > 24 hours)
      const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in ms
      if (state.timestamp && (Date.now() - state.timestamp) > MAX_AGE) {
        localStorage.removeItem(key);
        return;
      }

      if (state.variables && Array.isArray(state.variables) && state.variables.length > 0) {
        this.variables = state.variables.map((v: any) => ({
          name: v.name,
          type: v.type,
          value: v.value,
          valueInfo: v.valueInfo,
          // Variables restored from storage are treated as new/manually added
          originalValue: undefined,
          fixedName: false
        }));
        this.variablesLoaded = true;
        this.isDirty = true;
        this.hasBeenRestoredFromStorage = true;
        this.cdr.detectChanges();
      }
    } catch (e) {
      // Invalid JSON or other error - ignore
      console.warn('Could not restore form state from localStorage:', e);
    }
  }

  /**
   * Clear stored form state (called after successful save/complete)
   */
  private clearLocalStorage(): void {
    const key = this.getStorageKey();
    if (key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore
      }
    }
  }

  /**
   * Dismiss the restored state notification
   */
  dismissRestoredNotification(): void {
    this.hasBeenRestoredFromStorage = false;
  }

  /**
   * Discard restored state and reload from server
   */
  discardRestoredState(): void {
    this.clearLocalStorage();
    this.hasBeenRestoredFromStorage = false;
    this.variables = [];
    this.variablesLoaded = false;
    this.isDirty = false;
    this.loadVariables();
  }
}
