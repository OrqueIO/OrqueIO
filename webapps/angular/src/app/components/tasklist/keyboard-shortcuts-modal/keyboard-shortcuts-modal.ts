import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../i18n/translate.pipe';

export interface KeyboardShortcut {
  key: string;
  description: string;
}

@Component({
  selector: 'app-keyboard-shortcuts-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './keyboard-shortcuts-modal.html',
  styleUrl: './keyboard-shortcuts-modal.css'
})
export class KeyboardShortcutsModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  shortcuts: KeyboardShortcut[] = [
    { key: 'ctrl+alt+c', description: 'SHORTCUT_CLAIM_TASK' },
    { key: 'ctrl+shift+f', description: 'SHORTCUT_FOCUS_FILTER' },
    { key: 'ctrl+alt+l', description: 'SHORTCUT_FOCUS_TASK' },
    { key: 'ctrl+alt+f', description: 'SHORTCUT_FOCUS_FORM' },
    { key: 'ctrl+alt+p', description: 'SHORTCUT_START_PROCESS' }
  ];

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close.emit();
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
