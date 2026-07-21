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

  currentInput = '';

  ngAfterViewInit(): void {
    if (this.autofocus) {
      this.inputEl?.nativeElement.focus();
    }
  }

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
    this.values = this.values.filter((_, i) => i !== index);
    this.valuesChange.emit(this.values);
    this.cdr.markForCheck();
  }
}
