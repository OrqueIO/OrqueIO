import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, from, of } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { TasklistService } from './tasklist.service';

/**
 * Interface for form variable
 */
export interface CamFormVariable {
  name: string;
  value: any;
  type: string;
  valueInfo?: {
    objectTypeName?: string;
    serializationDataFormat?: string;
    filename?: string;
    mimeType?: string;
  };
  originalValue?: any;
  isDirty?: boolean;
}

/**
 * Interface for form field extracted from HTML
 */
export interface CamFormField {
  name: string;
  type: string;
  element: HTMLElement;
  variableName: string;
  variableType?: string;
  originalValue?: any;
}

/**
 * Interface for CamForm initialization options
 */
export interface CamFormOptions {
  taskId?: string;
  processDefinitionId?: string;
  processDefinitionKey?: string;
  formUrl: string;
  containerElement: HTMLElement;
  urlParams?: Record<string, string>;
}

/**
 * Interface for CamForm instance
 */
export interface CamFormInstance {
  formElement: HTMLFormElement | null;
  variables: Map<string, CamFormVariable>;
  fields: CamFormField[];
  isValid: boolean;
  isDirty: boolean;
  isLoaded: boolean;
  error: string | null;
}

/**
 * CamForm Service for Angular
 *
 * This service replicates the CamForm SDK functionality for embedded forms
 * in Angular. It handles:
 * - Loading form HTML from a URL
 * - Parsing form fields with cam-variable-* attributes
 * - Managing form variables
 * - Submitting forms to the Camunda API
 * - Local storage persistence for form state
 *
 * @see /webapps/angular/src/app/services/tasklist/cam-form.service.ts
 */
@Injectable({
  providedIn: 'root'
})
export class CamFormService {
  private readonly http = inject(HttpClient);
  private readonly tasklistService = inject(TasklistService);

  // Attribute constants matching AngularJS SDK
  private readonly DIRECTIVE_CAM_VARIABLE_NAME = 'cam-variable-name';
  private readonly DIRECTIVE_CAM_VARIABLE_TYPE = 'cam-variable-type';
  private readonly DIRECTIVE_CAM_FILE_DOWNLOAD = 'cam-file-download';
  private readonly DIRECTIVE_CAM_CHOICES = 'cam-choices';
  private readonly DIRECTIVE_CAM_SCRIPT = 'cam-script';

  // LocalStorage key prefix
  private readonly STORAGE_KEY_PREFIX = 'camForm:';

  // Active form instances (for cleanup)
  private activeInstances = new Map<string, CamFormInstance>();

  /**
   * Initialize a CamForm instance
   * Loads the form HTML, parses fields, fetches variables, and sets up the form
   */
  initializeForm(options: CamFormOptions): Observable<CamFormInstance> {
    const instanceId = options.taskId || options.processDefinitionId || '';

    // Create initial instance
    const instance: CamFormInstance = {
      formElement: null,
      variables: new Map(),
      fields: [],
      isValid: true,
      isDirty: false,
      isLoaded: false,
      error: null
    };

    this.activeInstances.set(instanceId, instance);

    // Build form URL with parameters
    const formUrl = this.buildFormUrl(options.formUrl, options.urlParams);

    return this.loadFormHtml(formUrl).pipe(
      tap(html => {
        // Render form into container
        this.renderForm(html, options.containerElement, instance);
      }),
      switchMap(() => {
        // Extract variable names from form fields
        const variableNames = instance.fields.map(f => f.variableName);

        if (variableNames.length === 0) {
          return of({});
        }

        // Fetch variables from server
        if (options.taskId) {
          return this.tasklistService.getTaskFormVariables(options.taskId);
        } else if (options.processDefinitionId) {
          return this.tasklistService.getProcessDefinitionFormVariables(options.processDefinitionId);
        }
        return of({});
      }),
      tap(variables => {
        // Merge fetched variables
        this.mergeVariables(instance, variables);

        // Restore from localStorage if available
        this.restoreFromStorage(instanceId, instance);

        // Apply variables to form fields
        this.applyVariablesToFields(instance);

        instance.isLoaded = true;
      }),
      map(() => instance),
      catchError(error => {
        instance.error = error.message || 'Failed to load form';
        instance.isLoaded = true;
        return of(instance);
      })
    );
  }

  /**
   * Build form URL with query parameters
   */
  private buildFormUrl(baseUrl: string, params?: Record<string, string>): string {
    if (!params || Object.keys(params).length === 0) {
      // Add cache buster
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}noCache=${Date.now()}`;
    }

    const url = new URL(baseUrl, window.location.origin);
    url.searchParams.set('noCache', Date.now().toString());

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    return url.toString();
  }

  /**
   * Load form HTML from URL
   */
  private loadFormHtml(url: string): Observable<string> {
    return this.http.get(url, { responseType: 'text' });
  }

  /**
   * Render form HTML into container
   */
  private renderForm(html: string, container: HTMLElement, instance: CamFormInstance): void {
    // Clear container and append form HTML
    container.innerHTML = '';

    // Wrap in div to prevent breaking document structure
    const wrapper = document.createElement('div');
    wrapper.className = 'injected-form-wrapper cam-form';
    wrapper.innerHTML = html;
    container.appendChild(wrapper);

    // Find the form element
    const formElement = wrapper.querySelector('form');
    if (formElement) {
      instance.formElement = formElement;

      // Ensure form has a name attribute
      if (!formElement.getAttribute('name')) {
        formElement.setAttribute('name', '$$camForm');
      }

      // Initialize form field handlers
      this.initializeFieldHandlers(instance);
    } else {
      // If no form element found, still try to find fields in the wrapper
      instance.formElement = null;
      this.initializeFieldHandlers(instance, wrapper);
    }
  }

  /**
   * Initialize field handlers by finding cam-variable-* elements
   */
  private initializeFieldHandlers(instance: CamFormInstance, container?: HTMLElement): void {
    const searchRoot = container || instance.formElement;
    if (!searchRoot) return;

    // Find all elements with cam-variable-name attribute
    const elements = searchRoot.querySelectorAll(`[${this.DIRECTIVE_CAM_VARIABLE_NAME}]`);

    elements.forEach((element: Element) => {
      const htmlElement = element as HTMLElement;
      const variableName = htmlElement.getAttribute(this.DIRECTIVE_CAM_VARIABLE_NAME);
      const variableType = htmlElement.getAttribute(this.DIRECTIVE_CAM_VARIABLE_TYPE) || 'String';

      if (variableName) {
        const field: CamFormField = {
          name: htmlElement.getAttribute('name') || variableName,
          type: this.detectFieldType(htmlElement),
          element: htmlElement,
          variableName,
          variableType
        };

        instance.fields.push(field);

        // Register variable
        if (!instance.variables.has(variableName)) {
          instance.variables.set(variableName, {
            name: variableName,
            value: null,
            type: variableType
          });
        }

        // Set up change listener
        this.setupFieldChangeListener(htmlElement, instance, variableName);
      }
    });

    // Also handle file download links
    const downloadLinks = searchRoot.querySelectorAll(`[${this.DIRECTIVE_CAM_FILE_DOWNLOAD}]`);
    downloadLinks.forEach((element: Element) => {
      const variableName = element.getAttribute(this.DIRECTIVE_CAM_FILE_DOWNLOAD);
      if (variableName && !instance.variables.has(variableName)) {
        instance.variables.set(variableName, {
          name: variableName,
          value: null,
          type: 'File'
        });
      }
    });
  }

  /**
   * Detect field type from HTML element
   */
  private detectFieldType(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'input') {
      return (element as HTMLInputElement).type || 'text';
    } else if (tagName === 'select') {
      return 'select';
    } else if (tagName === 'textarea') {
      return 'textarea';
    }

    return 'unknown';
  }

  /**
   * Setup change listener on field
   */
  private setupFieldChangeListener(element: HTMLElement, instance: CamFormInstance, variableName: string): void {
    const handler = () => {
      const variable = instance.variables.get(variableName);
      if (variable) {
        const newValue = this.getFieldValue(element);
        if (variable.value !== newValue) {
          variable.isDirty = true;
          instance.isDirty = true;
        }
        variable.value = newValue;
      }
      this.validateForm(instance);
    };

    element.addEventListener('input', handler);
    element.addEventListener('change', handler);
  }

  /**
   * Get value from form field
   */
  private getFieldValue(element: HTMLElement): any {
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'input') {
      const input = element as HTMLInputElement;
      if (input.type === 'checkbox') {
        return input.checked;
      } else if (input.type === 'file') {
        return input.files?.[0] || null;
      }
      return input.value;
    } else if (tagName === 'select') {
      return (element as HTMLSelectElement).value;
    } else if (tagName === 'textarea') {
      return (element as HTMLTextAreaElement).value;
    }

    return null;
  }

  /**
   * Set value on form field
   */
  private setFieldValue(element: HTMLElement, value: any): void {
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'input') {
      const input = element as HTMLInputElement;
      if (input.type === 'checkbox') {
        input.checked = !!value;
      } else if (input.type === 'file') {
        // File inputs cannot be set programmatically
      } else if (input.type === 'date' && value) {
        // Format date for date input
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          input.value = date.toISOString().split('T')[0];
        }
      } else {
        input.value = value != null ? String(value) : '';
      }
    } else if (tagName === 'select') {
      (element as HTMLSelectElement).value = value != null ? String(value) : '';
    } else if (tagName === 'textarea') {
      (element as HTMLTextAreaElement).value = value != null ? String(value) : '';
    }
  }

  /**
   * Merge fetched variables with instance variables
   */
  private mergeVariables(instance: CamFormInstance, variables: Record<string, any>): void {
    for (const [name, data] of Object.entries(variables)) {
      const existing = instance.variables.get(name);
      let value = data.value;

      // Parse JSON values
      if (data.valueInfo?.serializationDataFormat === 'application/json' || data.type === 'Json') {
        try {
          value = JSON.parse(value);
        } catch {
          // Keep original value if parse fails
        }
      }

      const variable: CamFormVariable = {
        name,
        value,
        type: data.type || existing?.type || 'String',
        valueInfo: data.valueInfo,
        originalValue: value,
        isDirty: false
      };

      instance.variables.set(name, variable);
    }
  }

  /**
   * Apply variables to form fields
   */
  private applyVariablesToFields(instance: CamFormInstance): void {
    for (const field of instance.fields) {
      const variable = instance.variables.get(field.variableName);
      if (variable && variable.value !== null && variable.value !== undefined) {
        this.setFieldValue(field.element, variable.value);
        field.originalValue = variable.value;
      }
    }

    // Update file download links
    if (instance.formElement) {
      const downloadLinks = instance.formElement.querySelectorAll(`[${this.DIRECTIVE_CAM_FILE_DOWNLOAD}]`);
      downloadLinks.forEach((element: Element) => {
        const variableName = element.getAttribute(this.DIRECTIVE_CAM_FILE_DOWNLOAD);
        if (variableName) {
          const variable = instance.variables.get(variableName);
          if (variable?.valueInfo?.filename) {
            const anchor = element as HTMLAnchorElement;
            anchor.textContent = variable.valueInfo.filename;
            // URL would be set by task context
          }
        }
      });
    }
  }

  /**
   * Validate form
   */
  private validateForm(instance: CamFormInstance): void {
    if (instance.formElement) {
      instance.isValid = instance.formElement.checkValidity();
    }
  }

  /**
   * Retrieve current values from form fields
   */
  retrieveVariables(instance: CamFormInstance): void {
    for (const field of instance.fields) {
      const variable = instance.variables.get(field.variableName);
      if (variable) {
        const newValue = this.getFieldValue(field.element);
        if (variable.originalValue !== newValue) {
          variable.isDirty = true;
        }
        variable.value = newValue;
      }
    }
  }

  /**
   * Parse variables for submission (only dirty variables)
   */
  parseVariablesForSubmission(instance: CamFormInstance): Record<string, any> {
    const variableData: Record<string, any> = {};

    this.retrieveVariables(instance);

    for (const [name, variable] of instance.variables.entries()) {
      // Only submit dirty variables
      if (variable.isDirty || variable.value !== variable.originalValue) {
        let value = variable.value;

        // Serialize JSON values
        if (variable.valueInfo?.serializationDataFormat === 'application/json' && typeof value === 'object') {
          value = JSON.stringify(value);
        }

        // Format dates
        if (variable.type === 'Date' && value) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            value = date.toISOString();
          }
        }

        variableData[name] = {
          value,
          type: variable.type,
          valueInfo: variable.valueInfo
        };
      }
    }

    return variableData;
  }

  /**
   * Submit form
   */
  submitForm(instance: CamFormInstance, taskId: string): Observable<void> {
    const variables = this.parseVariablesForSubmission(instance);

    return this.tasklistService.submitTaskForm(taskId, variables).pipe(
      tap(() => {
        // Clear localStorage on successful submit
        this.clearStorage(taskId);

        // Reset dirty flags
        for (const variable of instance.variables.values()) {
          variable.isDirty = false;
          variable.originalValue = variable.value;
        }
        instance.isDirty = false;
      })
    );
  }

  /**
   * Store form state to localStorage
   */
  storeToStorage(instanceId: string, instance: CamFormInstance): void {
    if (!instanceId) return;

    try {
      this.retrieveVariables(instance);

      const store = {
        date: Date.now(),
        vars: {} as Record<string, any>
      };

      for (const [name, variable] of instance.variables.entries()) {
        // Don't store File or Bytes types
        if (!['File', 'Bytes'].includes(variable.type)) {
          store.vars[name] = variable.value;
        }
      }

      localStorage.setItem(this.STORAGE_KEY_PREFIX + instanceId, JSON.stringify(store));
    } catch (error) {
      console.warn('Could not store form state:', error);
    }
  }

  /**
   * Restore form state from localStorage
   */
  private restoreFromStorage(instanceId: string, instance: CamFormInstance): boolean {
    if (!instanceId) return false;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_PREFIX + instanceId);
      if (!stored) return false;

      const data = JSON.parse(stored);

      // Check if stored data is too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000;
      if (data.date && (Date.now() - data.date) > maxAge) {
        localStorage.removeItem(this.STORAGE_KEY_PREFIX + instanceId);
        return false;
      }

      // Merge stored values
      for (const [name, value] of Object.entries(data.vars || {})) {
        const variable = instance.variables.get(name);
        if (variable) {
          variable.value = value;
        } else {
          instance.variables.set(name, {
            name,
            value,
            type: 'String'
          });
        }
      }

      return true;
    } catch (error) {
      console.warn('Could not restore form state:', error);
      return false;
    }
  }

  /**
   * Check if form can be restored from storage
   */
  isRestorable(instanceId: string): boolean {
    if (!instanceId) return false;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_PREFIX + instanceId);
      if (!stored) return false;

      const data = JSON.parse(stored);
      return data && Object.keys(data.vars || {}).length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Clear localStorage for form
   */
  clearStorage(instanceId: string): void {
    if (instanceId) {
      localStorage.removeItem(this.STORAGE_KEY_PREFIX + instanceId);
    }
  }

  /**
   * Clean old localStorage entries
   */
  cleanLocalStorage(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.STORAGE_KEY_PREFIX)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.date && (now - data.date) > maxAgeMs) {
            localStorage.removeItem(key);
          }
        } catch {
          // Remove invalid entries
          localStorage.removeItem(key!);
        }
      }
    }
  }

  /**
   * Destroy form instance
   */
  destroyInstance(instanceId: string): void {
    const instance = this.activeInstances.get(instanceId);
    if (instance) {
      // Store state before destroying
      if (instance.isDirty) {
        this.storeToStorage(instanceId, instance);
      }
      this.activeInstances.delete(instanceId);
    }
  }

  /**
   * Get active instance
   */
  getInstance(instanceId: string): CamFormInstance | undefined {
    return this.activeInstances.get(instanceId);
  }
}
