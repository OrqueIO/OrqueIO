import {
  Component, Input, Output, EventEmitter, OnInit, HostListener,
  ChangeDetectionStrategy, ViewChild, ElementRef, inject, ChangeDetectorRef, AfterViewInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import {
  validateVariableDraft,
  toPlanVariable,
  VariableDraft,
  PlanVariable,
  ValidationErrors
} from './migration-variables.utils';
import {
  MIGRATION_VARIABLE_TYPES,
  TEXTUAL_VARIABLE_TYPES,
  INTEGER_VARIABLE_TYPES
} from '../../../../utils/variable-types.constant';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

/**
 * Modal for adding or editing a migration variable.
 * Conforms to the design mockup step2-modal.png.
 * Implements type-specific input fields, validation, and accessibility features.
 */
@Component({
  selector: 'app-migration-variable-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './migration-variable-modal.component.html',
  styleUrls: ['./migration-variable-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MigrationVariableModalComponent implements OnInit, AfterViewInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);

  @Input() existingVariables: PlanVariable[] = [];
  @Input() editingVariable: PlanVariable | null = null;
  @Output() save = new EventEmitter<PlanVariable>();
  @Output() closeModal = new EventEmitter<void>();

  @ViewChild('dialogEl') dialogEl!: ElementRef<HTMLElement>;
  @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;

  draft: VariableDraft = { name: '', type: 'String', value: '' };
  fieldErrors: ValidationErrors | null = null;

  // Track which fields have been touched (blurred or debounced)
  touchedFields: Set<string> = new Set();

  // Subjects for debounced validation
  private nameChange$ = new Subject<string>();
  private valueChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Supported variable types (shared constant from utils)
  readonly variableTypes = [...MIGRATION_VARIABLE_TYPES];

  // Element that opened the modal (for focus return)
  private previouslyFocusedElement: HTMLElement | null = null;

  // Focus trap state
  private focusableElements: HTMLElement[] = [];
  private firstFocusableElement: HTMLElement | null = null;
  private lastFocusableElement: HTMLElement | null = null;

  ngOnInit(): void {
    // Save currently focused element to return focus on close (R-a11y)
    this.previouslyFocusedElement = document.activeElement as HTMLElement;

    if (this.editingVariable) {
      // Pre-fill form when editing
      this.draft = {
        name: this.editingVariable.name,
        type: this.editingVariable.type,
        value: String(this.editingVariable.value)
      };
    } else {
      // Default to String with empty value
      this.draft = { name: '', type: 'String', value: '' };
    }

    // Setup debounced validation (400ms)
    this.nameChange$.pipe(
      debounceTime(400),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.touchedFields.add('name');
      this.updateErrors();
    });

    this.valueChange$.pipe(
      debounceTime(400),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.touchedFields.add('value');
      this.updateErrors();
    });
  }

  ngAfterViewInit(): void {
    // Focus the name input initially (R-a11y, R-d)
    setTimeout(() => {
      // Update the DOM with draft values
      if (this.nameInput?.nativeElement) {
        this.nameInput.nativeElement.value = this.draft.name;
      }
      this.nameInput?.nativeElement?.focus();
      this.setupFocusTrap();
      this.cdr.markForCheck();
    }, 0);
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();

    // Return focus to previously focused element (R-a11y)
    if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
      this.previouslyFocusedElement.focus();
    }
  }

  private setupFocusTrap(): void {
    if (!this.dialogEl?.nativeElement) return;

    const focusableSelectors = 'input, select, textarea, button:not([disabled])';
    const focusableNodeList = this.dialogEl.nativeElement.querySelectorAll(focusableSelectors);
    this.focusableElements = Array.from(focusableNodeList) as HTMLElement[];

    if (this.focusableElements.length > 0) {
      this.firstFocusableElement = this.focusableElements[0];
      this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1];
    }
  }

  /**
   * Updates field errors based on current draft and touched fields.
   * Recalculates validation for all fields, but only displays errors for touched fields.
   */
  private updateErrors(): void {
    const existingNames = this.existingVariables
      .filter(v => v.name !== this.editingVariable?.name)
      .map(v => v.name);

    const allErrors = validateVariableDraft(
      this.draft,
      existingNames,
      this.editingVariable?.name
    );

    // Only show errors for touched fields
    if (!allErrors) {
      this.fieldErrors = null;
    } else {
      const displayedErrors: ValidationErrors = {};
      if (allErrors.name && this.touchedFields.has('name')) {
        displayedErrors.name = allErrors.name;
      }
      if (allErrors.type && this.touchedFields.has('type')) {
        displayedErrors.type = allErrors.type;
      }
      if (allErrors.value && this.touchedFields.has('value')) {
        // For Json errors, include the parse error reason
        if (this.draft.type === 'Json' && allErrors.value === 'migration.variables.errorJsonInvalid') {
          try {
            JSON.parse(this.draft.value.trim());
          } catch (e: any) {
            displayedErrors.value = `Invalid JSON: ${e.message}`;
          }
        } else {
          displayedErrors.value = allErrors.value;
        }
      }
      this.fieldErrors = Object.keys(displayedErrors).length > 0 ? displayedErrors : null;
    }

    this.cdr.markForCheck();
  }

  /**
   * Called when name input changes
   */
  onNameChange(): void {
    this.nameChange$.next(this.draft.name);
    // Also update errors immediately if already touched
    if (this.touchedFields.has('name')) {
      this.updateErrors();
    }
  }

  /**
   * Called when name input loses focus
   */
  onNameBlur(): void {
    this.touchedFields.add('name');
    this.updateErrors();
  }

  /**
   * Called when value input changes
   */
  onValueChange(): void {
    this.valueChange$.next(this.draft.value);
    // Also update errors immediately if already touched
    if (this.touchedFields.has('value')) {
      this.updateErrors();
    }
  }

  /**
   * Called when value input loses focus
   */
  onValueBlur(): void {
    this.touchedFields.add('value');
    this.updateErrors();
  }

  onTypeChange(newType: string): void {
    const oldType = this.draft.type;
    this.draft.type = newType;

    // Value clearing logic:
    // Preserve value when switching between String and Json
    // Clear value otherwise
    const oldIsTextual = TEXTUAL_VARIABLE_TYPES.includes(oldType);
    const newIsTextual = TEXTUAL_VARIABLE_TYPES.includes(newType);

    if (!(oldIsTextual && newIsTextual)) {
      // Clear value unless both old and new are textual types
      if (newType === 'Boolean') {
        this.draft.value = 'true'; // Default Boolean to true
      } else {
        this.draft.value = '';
      }
      // Reset touched state for value field when type changes
      this.touchedFields.delete('value');
    }

    // Clear all errors when type changes
    this.fieldErrors = null;
    this.updateErrors();
    this.cdr.markForCheck();

    // Update focus trap after DOM changes
    setTimeout(() => this.setupFocusTrap(), 0);
  }

  onSave(): void {
    // Check if form is valid
    if (!this.canSave) {
      // Mark all fields as touched to show all errors
      this.touchedFields.add('name');
      this.touchedFields.add('type');
      this.touchedFields.add('value');
      this.updateErrors();
      this.cdr.markForCheck();

      // Focus on first invalid field after DOM update
      setTimeout(() => {
        this.cdr.detectChanges();
        if (this.fieldErrors?.name) {
          this.nameInput?.nativeElement?.focus();
        } else if (this.fieldErrors?.value) {
          const valueInput = document.querySelector('#variableValue') as HTMLInputElement | HTMLTextAreaElement;
          valueInput?.focus();
        }
      }, 100);

      return;
    }

    // Convert to plan variable and emit
    const planVariable = toPlanVariable(this.draft);
    this.save.emit(planVariable);
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal.emit();
    }
  }

  onFieldEnter(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    (event.target as HTMLElement).blur();
    this.dialogEl?.nativeElement?.focus();
  }

  onModalEnter(event: Event): void {
    if ((event.target as HTMLElement) !== this.dialogEl?.nativeElement) return;
    if (this.fieldErrors) return;
    this.onSave();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeModal.emit();
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Focus trap: Tab cycles within modal (R-a11y)
    if (event.key === 'Tab') {
      if (!this.firstFocusableElement || !this.lastFocusableElement) return;

      if (event.shiftKey) {
        // Shift+Tab on first element -> go to last
        if (document.activeElement === this.firstFocusableElement) {
          event.preventDefault();
          this.lastFocusableElement.focus();
        }
      } else {
        // Tab on last element -> go to first
        if (document.activeElement === this.lastFocusableElement) {
          event.preventDefault();
          this.firstFocusableElement.focus();
        }
      }
    }
  }

  get modalTitle(): string {
    return this.editingVariable
      ? 'migration.variables.editVariableTitle'
      : 'migration.variables.addVariableTitle';
  }

  get saveButtonLabel(): string {
    return this.editingVariable
      ? 'migration.variables.save'
      : 'migration.variables.add';
  }

  // Helper methods for template

  isIntegerType(type: string): boolean {
    return INTEGER_VARIABLE_TYPES.includes(type as any);
  }

  isTextualType(type: string): boolean {
    return TEXTUAL_VARIABLE_TYPES.includes(type);
  }

  /**
   * Keydown handler for integer input fields.
   * Prevents non-numeric input (except minus sign at start and navigation keys).
   */
  onIntegerKeydown(event: KeyboardEvent, currentValue: string): void {
    const allowedControlKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End'];
    if (allowedControlKeys.includes(event.key)) {
      return;
    }

    if (event.key === '-') {
      const selectionStart = (event.target as HTMLInputElement).selectionStart ?? 0;
      if (selectionStart === 0 && !currentValue.includes('-')) {
        return; // Allow minus at start
      }
      event.preventDefault();
      return;
    }

    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  /**
   * Paste handler for integer input fields.
   * Extracts only valid integer characters from pasted text.
   */
  onIntegerPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    const cleaned = pasted.match(/^-?\d+/)?.[0] ?? '';
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const newValue = input.value.slice(0, start) + cleaned + input.value.slice(end);
    input.value = newValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  get canSave(): boolean {
    // Validate draft on the fly to enable/disable save button
    // Errors are only DISPLAYED after interaction or clicking Add
    const existingNames = this.existingVariables
      .filter(v => v.name !== this.editingVariable?.name)
      .map(v => v.name);

    const errors = validateVariableDraft(
      this.draft,
      existingNames,
      this.editingVariable?.name
    );

    return errors === null;
  }
}
