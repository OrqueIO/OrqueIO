import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, catchError, switchMap } from 'rxjs/operators';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TasklistService } from '../../../services/tasklist/tasklist.service';
import { AuthService } from '../../../services/auth';
import { ProcessDefinition, TaskForm, Task } from '../../../models/tasklist/task.model';

interface FormVariable {
  name: string;
  type: string;
  value: any;
  label?: string;
}

@Component({
  selector: 'app-start-process-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './start-process-modal.html',
  styleUrl: './start-process-modal.css'
})
export class StartProcessModalComponent implements OnInit, OnChanges, OnDestroy {
  private readonly tasklistService = inject(TasklistService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() processStarted = new EventEmitter<string>();
  @Output() taskAssigned = new EventEmitter<{ taskId: string; taskName: string; processName: string }>();

  // Process definitions list
  processDefinitions: ProcessDefinition[] = [];
  totalDefinitions = 0;
  loadingDefinitions = false;
  definitionsPage = 1;
  definitionsPageSize = 15; // Match AngularJS (was 10)

  // Selected process
  selectedDefinition: ProcessDefinition | null = null;
  startForm: TaskForm | null = null;
  loadingForm = false;

  // Form variables
  variables: FormVariable[] = [];
  businessKey = '';

  // Submit state
  submitting = false;
  error: string | null = null;

  // Search with debounce (server-side like AngularJS)
  searchQuery = '';
  private searchSubject$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Setup debounced search (2000ms like AngularJS)
    this.searchSubject$.pipe(
      debounceTime(2000),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.performSearch();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      this.onOpen();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onOpen(): void {
    // Reset state when modal opens
    this.definitionsPage = 1;
    this.searchQuery = '';
    this.loadProcessDefinitions();
  }

  private loadProcessDefinitions(): void {
    this.loadingDefinitions = true;
    this.error = null;

    const firstResult = (this.definitionsPage - 1) * this.definitionsPageSize;
    const nameLike = this.searchQuery.trim() ? `%${this.searchQuery.trim()}%` : undefined;

    this.tasklistService.getStartableProcessDefinitions({
      firstResult,
      maxResults: this.definitionsPageSize,
      nameLike
    }).subscribe({
      next: (definitions) => {
        this.processDefinitions = definitions;
        this.loadingDefinitions = false;
        this.cdr.detectChanges();
        // Focus first item in list after loading
        this.focusFirstProcessItem();
      },
      error: () => {
        this.error = 'Failed to load process definitions';
        this.loadingDefinitions = false;
        this.cdr.detectChanges();
      }
    });

    // Also get count with same search filter
    this.tasklistService.getStartableProcessDefinitionsCount(nameLike).subscribe({
      next: (count) => {
        this.totalDefinitions = count;
        this.cdr.detectChanges();
      }
    });
  }

  private performSearch(): void {
    // Reset to first page when searching
    this.definitionsPage = 1;
    this.loadProcessDefinitions();
  }

  onSearchChange(): void {
    // Trigger debounced search
    this.searchSubject$.next(this.searchQuery);
  }

  private focusFirstProcessItem(): void {
    setTimeout(() => {
      const firstItem = document.querySelector('.process-list .process-item') as HTMLElement;
      if (firstItem) {
        firstItem.focus();
      }
    }, 0);
  }

  private focusFirstFormInput(): void {
    setTimeout(() => {
      const firstInput = document.querySelector('.form-content .form-input') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 0);
  }

  selectDefinition(definition: ProcessDefinition): void {
    this.selectedDefinition = definition;
    this.variables = [];
    this.businessKey = '';
    this.error = null;
    this.loadingForm = true; // Always show loading when selecting

    // Load start form if exists, otherwise just load variables
    if (definition.hasStartFormKey) {
      this.loadStartForm(definition.id);
    } else {
      this.startForm = null;
      this.loadFormVariables(definition.id);
    }
  }

  private loadStartForm(processDefinitionId: string): void {
    this.tasklistService.getProcessDefinitionStartForm(processDefinitionId).subscribe({
      next: (form) => {
        this.startForm = form;
        // Load form variables after getting the form
        this.loadFormVariables(processDefinitionId);
      },
      error: () => {
        this.startForm = null;
        this.loadFormVariables(processDefinitionId);
      }
    });
  }

  private loadFormVariables(processDefinitionId: string): void {
    this.tasklistService.getProcessDefinitionFormVariables(processDefinitionId).subscribe({
      next: (vars) => {
        this.variables = Object.entries(vars).map(([name, data]: [string, any]) => ({
          name,
          type: data.type || 'String',
          value: data.value,
          label: data.label || name
        }));
        this.loadingForm = false;
        this.cdr.detectChanges();
        // Focus first input after form loads
        this.focusFirstFormInput();
      },
      error: () => {
        this.variables = [];
        this.loadingForm = false;
        this.cdr.detectChanges();
        this.focusFirstFormInput();
      }
    });
  }

  goBack(): void {
    this.selectedDefinition = null;
    this.startForm = null;
    this.variables = [];
    this.businessKey = '';
    this.error = null;
    // Focus first item in list when going back (like AngularJS)
    this.focusFirstProcessItem();
  }

  onPageChange(page: number): void {
    this.definitionsPage = page;
    this.loadProcessDefinitions();
  }

  startProcess(): void {
    if (!this.selectedDefinition || this.submitting) return;

    this.submitting = true;
    this.error = null;

    const variablesPayload: Record<string, any> = {};
    for (const v of this.variables) {
      variablesPayload[v.name] = {
        value: v.value,
        type: v.type
      };
    }

    const startData = {
      businessKey: this.businessKey || undefined,
      variables: variablesPayload
    };

    const processDefinitionName = this.selectedDefinition.name || this.selectedDefinition.key;

    this.tasklistService.startProcessInstance(this.selectedDefinition.id, startData).pipe(
      switchMap((instance) => {
        // After starting, check if any tasks were assigned to current user (assign-notification)
        const currentUser = this.authService.currentAuthentication?.name;
        if (currentUser) {
          return this.tasklistService.getTasks({
            processInstanceId: instance.id,
            assignee: currentUser,
            maxResults: 1
          }).pipe(
            catchError(() => of({ _embedded: { task: [] } })),
            switchMap((result) => {
              const tasks = result._embedded?.task || [];
              if (tasks.length > 0) {
                // Emit assigned task notification
                this.taskAssigned.emit({
                  taskId: tasks[0].id,
                  taskName: tasks[0].name || tasks[0].taskDefinitionKey || 'Task',
                  processName: processDefinitionName
                });
              }
              return of(instance);
            })
          );
        }
        return of(instance);
      })
    ).subscribe({
      next: (instance) => {
        this.submitting = false;
        this.processStarted.emit(instance.id);
        this.closeModal();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to start process';
        this.submitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  addVariable(): void {
    this.variables.push({
      name: '',
      type: 'String',
      value: ''
    });
  }

  removeVariable(index: number): void {
    this.variables.splice(index, 1);
  }

  closeModal(): void {
    this.selectedDefinition = null;
    this.startForm = null;
    this.variables = [];
    this.businessKey = '';
    this.error = null;
    this.definitionsPage = 1;
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
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

  get totalPages(): number {
    return Math.ceil(this.totalDefinitions / this.definitionsPageSize);
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackById(index: number, item: ProcessDefinition): string {
    return item.id;
  }
}
