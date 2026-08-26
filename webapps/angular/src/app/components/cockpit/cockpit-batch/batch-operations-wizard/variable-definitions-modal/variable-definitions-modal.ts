import {
  Component, Input, Output, EventEmitter, OnInit,
  ChangeDetectionStrategy, ChangeDetectorRef, inject, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../../i18n/translate.pipe';

export interface VariableDef {
  name: string;
  type: string;
  value: string;
}

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

  get canApply(): boolean {
    return this.rows.some(r => r.name.trim() !== '');
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
