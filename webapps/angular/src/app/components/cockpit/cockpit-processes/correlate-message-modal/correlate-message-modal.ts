import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../i18n/translate.pipe';

@Component({
  selector: 'app-correlate-message-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './correlate-message-modal.html',
  styleUrls: ['./correlate-message-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CorrelateMessageModalComponent {
  private cdr = inject(ChangeDetectorRef);

  @Input() set messageName(v: string | null) {
    this.inputValue = v ?? '';
  }
  @Input() suggestions: string[] = [];
  @Input() suggestionsEnabled: boolean = true;

  @Output() confirm = new EventEmitter<string | null>();
  @Output() cancel = new EventEmitter<void>();

  inputValue = '';
  showDropdown = false;

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.onCancel();
  }

  get filteredSuggestions(): string[] {
    if (!this.inputValue.trim()) return this.suggestions;
    const lower = this.inputValue.toLowerCase();
    return this.suggestions.filter(s => s.toLowerCase().includes(lower));
  }

  selectSuggestion(name: string): void {
    this.inputValue = name;
    this.showDropdown = false;
    this.cdr.markForCheck();
  }

  onInputBlur(): void {
    setTimeout(() => {
      this.showDropdown = false;
      this.cdr.markForCheck();
    }, 150);
  }

  onConfirm(): void {
    this.confirm.emit(this.inputValue.trim() || null);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onCancel();
    }
  }
}
