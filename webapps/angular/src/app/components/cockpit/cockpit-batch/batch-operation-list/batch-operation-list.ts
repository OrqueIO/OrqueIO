import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, ChangeDetectorRef,
  ElementRef, HostListener, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faCheck, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../../../i18n/translate.pipe';

export interface BatchOperationDef {
  id: string;
  labelKey: string;
  descKey: string;
  icon: IconDefinition;
  badgeClass: string;
  available: boolean;
  /** Translation key for the step-1 action button, e.g. "Suspend {{count}} instances" */
  actionBtnKey?: string;
}

/**
 * Compact dropdown operation selector.
 * Shows a single-line closed trigger; opens an overlay on click.
 * Closes on outside click or Escape — same pattern as ORQ-301 criterion popovers.
 */
@Component({
  selector: 'app-batch-operation-list',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, TranslatePipe],
  templateUrl: './batch-operation-list.html',
  styleUrl: './batch-operation-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchOperationListComponent {
  @Input() operations: BatchOperationDef[] = [];
  @Input() selectedId: string | null = null;
  @Output() operationSelect = new EventEmitter<string>();
  @Output() clearSelection = new EventEmitter<void>();

  private cdr = inject(ChangeDetectorRef);
  private elementRef = inject(ElementRef);

  faCheck = faCheck;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;

  isOpen = false;

  get selectedOperation(): BatchOperationDef | undefined {
    return this.selectedId ? this.operations.find(op => op.id === this.selectedId) : undefined;
  }

  toggleOpen(event: Event): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
    this.cdr.markForCheck();
  }

  select(op: BatchOperationDef): void {
    if (!op.available) return;
    this.operationSelect.emit(op.id);
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  clearAndClose(): void {
    this.clearSelection.emit();
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.isOpen = false;
      this.cdr.markForCheck();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.cdr.markForCheck();
    }
  }
}
