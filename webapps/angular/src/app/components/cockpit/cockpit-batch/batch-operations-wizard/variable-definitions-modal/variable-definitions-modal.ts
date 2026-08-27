import {
  Component, Input, Output, EventEmitter, OnInit,
  ChangeDetectionStrategy, ChangeDetectorRef, inject, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../../i18n/translate.pipe';
import { getVariableInputType } from '../../../../../utils/variable-type.util';

export interface VariableDef {
  name: string;
  type: string;
  value: any;
}

const INTEGER_TYPES = ['Integer', 'Long', 'Short'];
const INTEGER_RE = /^-?\d+$/;

@Component({
  selector: 'app-variable-definitions-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './variable-definitions-modal.html',
  styleUrls: ['./variable-definitions-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VariableDefinitionsModalComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  @Input() initialVariables: VariableDef[] = [];
  @Output() apply = new EventEmitter<VariableDef[]>();
  @Output() closeModal = new EventEmitter<void>();

  rows: VariableDef[] = [];

  ngOnInit(): void {
    this.rows = this.initialVariables.length > 0
      ? this.initialVariables.map(v => ({ ...v }))
      : [{ name: '', type: 'String', value: '' }];
  }

  isIntegerType(type: string): boolean {
    return INTEGER_TYPES.includes(type);
  }

  getDefaultValue(type: string): any {
    return type === 'Boolean' ? false : '';
  }

  onTypeChange(index: number, newType: string): void {
    const updated = [...this.rows];
    updated[index] = { ...updated[index], type: newType, value: this.getDefaultValue(newType) };
    this.rows = updated;
    this.cdr.markForCheck();
  }

  onIntegerKeydown(event: KeyboardEvent, currentValue: string): void {
    const allowedControlKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End'];
    if (allowedControlKeys.includes(event.key)) {
      return;
    }

    if (event.key === '-') {
      const selectionStart = (event.target as HTMLInputElement).selectionStart ?? 0;
      if (selectionStart === 0 && !currentValue.includes('-')) {
        return;
      }
      event.preventDefault();
      return;
    }

    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

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

  getInputType(type: string): string {
    return getVariableInputType(type);
  }

  isValueValid(row: VariableDef): boolean {
    if (INTEGER_TYPES.includes(row.type)) {
      const v = String(row.value ?? '');
      return v !== '' && INTEGER_RE.test(v);
    }
    return true;
  }

  getValueError(row: VariableDef): string | null {
    if (row.name.trim() === '' || this.isValueValid(row)) return null;
    if (INTEGER_TYPES.includes(row.type)) return 'cockpit.batchOps.setVariables.errorInvalidInteger';
    return null;
  }

  get canApply(): boolean {
    const namedRows = this.rows.filter(r => r.name.trim() !== '');
    return namedRows.length > 0 && namedRows.every(r => this.isValueValid(r));
  }

  addRow(): void {
    this.rows = [...this.rows, { name: '', type: 'String', value: '' }];
    this.cdr.markForCheck();
  }

  removeRow(index: number): void {
    if (this.rows.length > 1) {
      this.rows = this.rows.filter((_, i) => i !== index);
    } else {
      this.rows = [{ name: '', type: 'String', value: '' }];
    }
    this.cdr.markForCheck();
  }

  onApply(): void {
    this.apply.emit(this.rows.filter(r => r.name.trim() !== ''));
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeModal.emit();
  }

  trackByIndex(index: number): number {
    return index;
  }
}
