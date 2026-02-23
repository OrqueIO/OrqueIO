import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges, inject, HostListener, ElementRef, ViewChild, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Actions, ofType } from '@ngrx/effects';
import { Subject, takeUntil, filter } from 'rxjs';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { Task, TaskForm } from '../../../models/tasklist';
import { TasklistService } from '../../../services/tasklist/tasklist.service';
import { CamFormService, CamFormInstance } from '../../../services/tasklist/cam-form.service';
import { FormStateStorageService, StoredVariable } from '../../../services/tasklist/form-state-storage.service';
import { FormValidationService, ValidationErrors } from '../../../services/tasklist/form-validation.service';
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
export class TaskFormTabComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  private readonly tasklistService = inject(TasklistService);
  private readonly camFormService = inject(CamFormService);
  private readonly formStateStorage = inject(FormStateStorageService);
  private readonly formValidation = inject(FormValidationService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly actions$ = inject(Actions);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('formContainer') formContainer!: ElementRef;
  @ViewChild('embeddedFormContainer') embeddedFormContainer!: ElementRef;

  @Input() task!: Task;
  @Input() form: TaskForm | null = null;
  @Input() isAssignee = false;
  @Input() actionsDisabled = false; // From parent when task is suspended or removed

  @Output() complete = new EventEmitter<Record<string, any>>();
  @Output() save = new EventEmitter<Record<string, any>>();

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

  // CamForm instance for embedded forms (matches AngularJS CamForm SDK)
  camFormInstance: CamFormInstance | null = null;
  camFormLoading = false;
  camFormError: string | null = null;

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

  ngAfterViewInit(): void {
    // Initialize CamForm if embedded form
    if (this.isEmbeddedForm() && this.embeddedFormContainer) {
      this.initializeCamForm();
    }
  }

  ngOnDestroy(): void {
    // Cleanup CamForm instance
    if (this.camFormInstance && this.task?.id) {
      this.camFormService.destroyInstance(this.task.id);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] && !changes['task'].firstChange) {
      const previousTask = changes['task'].previousValue;

      // Cleanup previous CamForm instance
      if (this.camFormInstance && previousTask?.id) {
        this.camFormService.destroyInstance(previousTask.id);
        this.camFormInstance = null;
      }

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
      this.camFormError = null;

      // Try to restore from localStorage for new task
      this.restoreFromLocalStorage();

      // Initialize CamForm if embedded form type
      if (this.isEmbeddedForm()) {
        // Use setTimeout to allow the view to update first
        setTimeout(() => this.initializeCamForm(), 0);
      }
    }
    if (changes['form'] && !changes['form'].firstChange) {
      this.detectFormType();
      // Re-initialize CamForm if form type changed to embedded
      if (this.isEmbeddedForm()) {
        setTimeout(() => this.initializeCamForm(), 0);
      }
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

    // Check for embedded forms (including deployment: which uses embedded form loading)
    if (key.startsWith('embedded:') || key.startsWith('app:') || key.startsWith('deployment:')) {
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

  // ==================== CamForm SDK Integration ====================
  // Matches AngularJS cam-tasklist-form-embedded.js behavior

  /**
   * Initialize CamForm for embedded forms
   * This replicates the AngularJS CamForm SDK functionality
   */
  private initializeCamForm(): void {
    if (!this.task?.id || !this.embeddedFormContainer?.nativeElement) {
      return;
    }

    const formUrl = this.getEmbeddedFormUrl();
    if (!formUrl) {
      this.camFormError = 'No form URL available';
      return;
    }

    this.camFormLoading = true;
    this.camFormError = null;
    this.cdr.detectChanges();

    this.camFormService.initializeForm({
      taskId: this.task.id,
      formUrl: formUrl,
      containerElement: this.embeddedFormContainer.nativeElement,
      urlParams: {
        taskId: this.task.id
      }
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (instance) => {
        this.camFormInstance = instance;
        this.camFormLoading = false;

        if (instance.error) {
          this.camFormError = instance.error;
        } else {
          // Update dirty state from CamForm
          this.isDirty = instance.isDirty;
          // Update validation state
          this.disableCompleteButton = !instance.isValid || !this.isAssignee || this.actionsDisabled;
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.camFormLoading = false;
        this.camFormError = err.message || 'Failed to load embedded form';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Handle CamForm submission for embedded forms
   */
  private submitCamForm(): void {
    if (!this.camFormInstance || !this.task?.id) {
      return;
    }

    this.submitting = true;
    this.completeError = null;

    this.camFormService.submitForm(this.camFormInstance, this.task.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.submitting = false;
        this.isDirty = false;
        // Emit complete event to parent
        const variables = this.camFormService.parseVariablesForSubmission(this.camFormInstance!);
        this.complete.emit(variables);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.submitting = false;
        this.completeError = err.message || 'Failed to submit form';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Handle CamForm save for embedded forms
   */
  private saveCamForm(): void {
    if (!this.camFormInstance || !this.task?.id) {
      return;
    }

    this.saving = true;
    this.camFormService.storeToStorage(this.task.id, this.camFormInstance);
    this.saving = false;
    this.isDirty = false;
    this.cdr.detectChanges();
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
              variable.downloadUrl = `/orqueio/api/engine/engine/default/task/${this.task.id}/variables/${name}/data`;
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

    variable.errors = this.formValidation.validateSingle(variable, this.variables, index);
  }

  private checkDirty(): boolean {
    return this.variables.some(v => v.value !== v.originalValue);
  }

  onSave(): void {
    if (this.saving || this.disableForm) return;

    // Handle CamForm (embedded) save
    if (this.isEmbeddedForm() && this.camFormInstance) {
      this.saveCamForm();
      return;
    }

    // Validate before saving
    if (!this.validateVariables()) {
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;

    // Use async method if there are file variables
    if (this.hasFileVariables()) {
      this.saveWithFiles();
    } else {
      const variables = this.buildVariablesObject();
      this.submitSave(variables);
    }
  }

  private async saveWithFiles(): Promise<void> {
    try {
      const variables = await this.buildVariablesObjectAsync();
      this.submitSave(variables);
    } catch (error: any) {
      console.error('Failed to process files:', error);
      this.completeError = error.message || 'Failed to process file upload';
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  private submitSave(variables: Record<string, any>): void {
    // Save variables to task
    this.tasklistService.submitTaskForm(this.task.id, variables).subscribe({
      next: () => {
        // Update original values
        this.variables.forEach(v => {
          v.originalValue = v.value;
          // Clear file after successful upload
          if (v.type === 'File') {
            v.file = undefined;
          }
        });
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

    // Handle CamForm (embedded) submission
    if (this.isEmbeddedForm() && this.camFormInstance) {
      this.submitCamForm();
      return;
    }

    // Validate before completing
    if (!this.validateVariables()) {
      this.cdr.detectChanges();
      return;
    }

    this.submitting = true;
    this.completeError = null;

    // Use async method if there are file variables
    if (this.hasFileVariables()) {
      this.completeWithFiles();
    } else {
      const variables = this.buildVariablesObject();
      this.clearLocalStorage(); // Clear saved state on complete
      this.complete.emit(variables);
    }
  }

  private async completeWithFiles(): Promise<void> {
    try {
      const variables = await this.buildVariablesObjectAsync();
      this.clearLocalStorage(); // Clear saved state on complete
      this.complete.emit(variables);
    } catch (error: any) {
      console.error('Failed to process files:', error);
      this.completeError = error.message || 'Failed to process file upload';
      this.submitting = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Validates all variables and sets error messages
   * @returns true if all variables are valid, false otherwise
   */
  private validateVariables(): boolean {
    const result = this.formValidation.validateAll(this.variables);
    // Update variables with errors from validation
    this.variables.forEach((v, i) => {
      v.errors = result.variables[i]?.errors;
    });
    return result.isValid;
  }

  /**
   * Check if form has any validation errors
   */
  hasValidationErrors(): boolean {
    return this.formValidation.hasAnyErrors(this.variables);
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
      // Skip File types without files - they're handled separately
      if (v.type === 'File' && !v.file) {
        continue;
      }

      // Skip Object types with Java serialization (ENGINE-17007 security restriction)
      // Java-serialized objects are read-only and cannot be modified from forms
      if (v.type === 'Object' && v.valueInfo?.serializationDataFormat === 'application/x-java-serialized-object') {
        continue;
      }

      const varData: { value: any; type: string; valueInfo?: any } = {
        value: v.value,
        type: v.type
      };

      // Add valueInfo for Object types (only JSON-serialized)
      if (v.type === 'Object' && v.valueInfo) {
        varData.valueInfo = v.valueInfo;
      }

      variables[v.name] = varData;
    }

    return variables;
  }

  /**
   * Build variables object with file conversion (async)
   * Matches AngularJS transformFiles() behavior
   */
  private async buildVariablesObjectAsync(): Promise<Record<string, any>> {
    const variables: Record<string, any> = {};

    for (const v of this.variables) {
      // Skip File types without files
      if (v.type === 'File' && !v.file) {
        continue;
      }

      // Skip Object types with Java serialization (ENGINE-17007 security restriction)
      // Java-serialized objects are read-only and cannot be modified from forms
      if (v.type === 'Object' && v.valueInfo?.serializationDataFormat === 'application/x-java-serialized-object') {
        continue;
      }

      const varData: { value: any; type: string; valueInfo?: any } = {
        value: v.value,
        type: v.type
      };

      // Handle File type with uploaded file
      if (v.type === 'File' && v.file) {
        try {
          const base64Value = await this.fileToBase64(v.file);
          varData.value = base64Value;
          varData.valueInfo = {
            filename: v.file.name,
            mimeType: v.file.type || 'application/octet-stream'
          };
        } catch (error) {
          console.error(`Failed to convert file ${v.name}:`, error);
          continue;
        }
      }

      // Add valueInfo for Object types (only JSON-serialized)
      if (v.type === 'Object' && v.valueInfo) {
        varData.valueInfo = v.valueInfo;
      }

      variables[v.name] = varData;
    }

    return variables;
  }

  /**
   * Convert File to base64 string
   * Matches AngularJS FileReader logic in transformFiles()
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check max file size (5MB default, like AngularJS)
      const maxSize = 5000000; // 5MB
      if (file.size > maxSize) {
        reject(new Error(`File size exceeds maximum of ${this.bytesToSize(maxSize)}`));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        resolve(btoa(binary));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Format bytes to human readable size
   */
  private bytesToSize(bytes: number): string {
    if (bytes === 0) return '0 Byte';
    const k = 1000;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
  }

  /**
   * Check if form has file variables that need uploading
   */
  private hasFileVariables(): boolean {
    return this.variables.some(v => v.type === 'File' && v.file);
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

    let key = this.form.key;
    const keyLower = key.toLowerCase();

    // Handle embedded: prefix (strip it first, then process remaining key)
    if (keyLower.startsWith('embedded:')) {
      key = key.substring('embedded:'.length);
    }

    // Handle deployment: prefix - use the engine API deployed-form endpoint
    // This matches AngularJS behavior in cam-tasklist-form.js
    if (key.toLowerCase().startsWith('deployment:')) {
      return `/orqueio/api/engine/engine/default/task/${this.task.id}/deployed-form`;
    }

    // Handle app: prefix - combine with contextPath
    if (key.toLowerCase().startsWith('app:')) {
      const formPath = key.substring('app:'.length);
      if (this.form.contextPath) {
        return `${this.form.contextPath}/${formPath}`.replace(/\/+/g, '/');
      }
      return formPath;
    }

    // Handle orqueio: prefix
    if (key.toLowerCase().startsWith('orqueio:')) {
      const formKey = key.substring('orqueio:'.length);
      return `/orqueio/forms/${formKey}?taskId=${this.task.id}`;
    }

    // Combine contextPath and key for other deployment forms
    if (this.form.contextPath) {
      return `${this.form.contextPath}/${key}`.replace(/\/+/g, '/');
    }

    return key;
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
  // Delegates to FormStateStorageService

  /**
   * Save form state to localStorage (called when switching tasks or on window unload)
   */
  private saveToLocalStorage(): void {
    if (!this.task?.id || this.variables.length === 0) return;
    this.formStateStorage.saveState(this.task.id, this.variables as StoredVariable[]);
  }

  /**
   * Restore form state from localStorage (called on task change)
   */
  private restoreFromLocalStorage(): void {
    if (!this.task?.id) return;

    const state = this.formStateStorage.restoreState(this.task.id);
    if (state) {
      this.variables = state.variables.map(v => ({
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
  }

  /**
   * Clear stored form state (called after successful save/complete)
   */
  private clearLocalStorage(): void {
    if (this.task?.id) {
      this.formStateStorage.clearState(this.task.id);
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
