import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './confirm-dialog.html',
  styleUrls: ['./confirm-dialog.css']
})
export class ConfirmDialogComponent {
  @Input() title: string = 'CONFIRM_DIALOG_TITLE';
  @Input() message: string = 'CONFIRM_DIALOG_MESSAGE';
  @Input() confirmLabel: string = 'CONFIRM_DIALOG_CONFIRM';
  @Input() cancelLabel: string = 'CONFIRM_DIALOG_CANCEL';
  @Input() confirmButtonClass: string = 'btn-danger';
  @Input() isDanger: boolean = false;
  @Input() showInput: boolean = false;
  @Input() inputLabel: string = '';
  @Input() inputPlaceholder: string = '';
  @Input() inputValue: string = '';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() inputValueChange = new EventEmitter<string>();

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.onCancel();
  }

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onCancel();
    }
  }

  onInputChange(value: string): void {
    this.inputValue = value;
    this.inputValueChange.emit(value);
  }
}
