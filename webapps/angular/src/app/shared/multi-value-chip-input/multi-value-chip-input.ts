import {
  Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-multi-value-chip-input',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './multi-value-chip-input.html',
  styleUrls: ['./multi-value-chip-input.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultiValueChipInputComponent implements AfterViewInit {
  private cdr = inject(ChangeDetectorRef);

  @Input() values: string[] = [];
  @Input() placeholder = '';
  @Input() autofocus = false;
  @Output() valuesChange = new EventEmitter<string[]>();
  @Output() emptyEnter = new EventEmitter<void>();

  @ViewChild('inputEl') inputEl?: ElementRef<HTMLInputElement>;
  @ViewChild('editInputEl') editInputEl?: ElementRef<HTMLInputElement>;

  currentInput = '';

  editingIndex: number | null = null;
  editingValue = '';
  editingError: string | null = null;

  ngAfterViewInit(): void {
    if (this.autofocus) {
      this.inputEl?.nativeElement.focus();
    }
  }

  // ── Main input handlers ───────────────────────────────────────────────────

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();

      const hadInput = this.currentInput.trim() !== '';
      this.addCurrentInput();
      if (!hadInput) {
        this.emptyEnter.emit();
      }
    } else if (event.key === ',') {
      event.preventDefault();
      this.addCurrentInput();
    }
  }

  onBlur(): void {
    this.addCurrentInput();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') || '';
    const parts = text.split(/[,\n]/).map(s => s.trim()).filter(s => s.length > 0);
    const current = new Set(this.values);
    parts.forEach(p => current.add(p));
    this.values = Array.from(current);
    this.currentInput = '';
    this.valuesChange.emit(this.values);
    this.cdr.markForCheck();
  }

  addCurrentInput(): void {
    const val = this.currentInput.trim();
    if (val && !this.values.includes(val)) {
      this.values = [...this.values, val];
      this.valuesChange.emit(this.values);
    }
    this.currentInput = '';
    this.cdr.markForCheck();
  }

  removeValue(index: number): void {
    if (this.editingIndex === index) {
      this.editingIndex = null;
      this.editingValue = '';
      this.editingError = null;
    } else if (this.editingIndex !== null && index < this.editingIndex) {
      this.editingIndex--;
    }
    this.values = this.values.filter((_, i) => i !== index);
    this.valuesChange.emit(this.values);
    this.cdr.markForCheck();
  }

  // ── Chip inline-edit handlers ─────────────────────────────────────────────

  startEdit(index: number): void {
    this.editingIndex = index;
    this.editingValue = this.values[index];
    this.editingError = null;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.editInputEl?.nativeElement.focus();
      const len = this.editingValue.length;
      this.editInputEl?.nativeElement.setSelectionRange(len, len);
    });
  }

  onEditKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      this.confirmEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEdit();
    }
  }

  onEditBlur(): void {
    if (this.editingIndex === null) return;
    const val = this.editingValue.trim();
    const idx = this.editingIndex;
    if (val && !this.values.some((v, i) => v === val && i !== idx)) {
      this.commitEdit(val, idx);
    } else {
      this.cancelEdit();
    }
  }

  confirmEdit(): void {
    if (this.editingIndex === null) return;
    const val = this.editingValue.trim();
    const idx = this.editingIndex;

    if (!val) {
      this.editingError = 'cockpit.processes.globalSearch.chipEditErrorEmpty';
      this.cdr.markForCheck();
      return;
    }
    if (this.values.some((v, i) => v === val && i !== idx)) {
      this.editingError = 'cockpit.processes.globalSearch.chipEditErrorDuplicate';
      this.cdr.markForCheck();
      return;
    }
    this.commitEdit(val, idx);
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.editingValue = '';
    this.editingError = null;
    this.cdr.markForCheck();
    setTimeout(() => this.inputEl?.nativeElement.focus());
  }

  private commitEdit(val: string, idx: number): void {
    if (this.values[idx] !== val) {
      this.values = this.values.map((v, i) => i === idx ? val : v);
      this.valuesChange.emit(this.values);
    }
    this.editingIndex = null;
    this.editingValue = '';
    this.editingError = null;
    this.cdr.markForCheck();
    setTimeout(() => this.inputEl?.nativeElement.focus());
  }
}
