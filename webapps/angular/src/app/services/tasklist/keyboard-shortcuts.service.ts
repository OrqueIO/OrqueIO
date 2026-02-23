import { Injectable, inject, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject, fromEvent, takeUntil, filter } from 'rxjs';
import { TasksActions } from '../../store/tasklist/tasklist.actions';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutsService implements OnDestroy {
  private store = inject(Store);
  private destroy$ = new Subject<void>();
  private enabled = false;
  private shortcuts: KeyboardShortcut[] = [];

  // Callback handlers for external actions
  private handlers: {
    onNavigateUp?: () => void;
    onNavigateDown?: () => void;
    onSelectTask?: () => void;
    onCloseDetail?: () => void;
    onClaim?: () => void;
    onUnclaim?: () => void;
    onComplete?: () => void;
    onSearch?: () => void;
    onRefresh?: () => void;
  } = {};

  constructor() {
    this.initShortcuts();
  }

  private initShortcuts(): void {
    this.shortcuts = [
      {
        key: 'ArrowUp',
        description: 'Navigate to previous task',
        action: () => this.handlers.onNavigateUp?.()
      },
      {
        key: 'ArrowDown',
        description: 'Navigate to next task',
        action: () => this.handlers.onNavigateDown?.()
      },
      {
        key: 'Enter',
        description: 'Select current task',
        action: () => this.handlers.onSelectTask?.()
      },
      {
        key: 'Escape',
        description: 'Close task detail',
        action: () => this.handlers.onCloseDetail?.()
      },
      {
        key: 'c',
        description: 'Claim current task',
        action: () => this.handlers.onClaim?.()
      },
      {
        key: 'u',
        description: 'Unclaim current task',
        action: () => this.handlers.onUnclaim?.()
      },
      {
        key: 'd',
        description: 'Complete current task',
        action: () => this.handlers.onComplete?.()
      },
      {
        key: '/',
        description: 'Focus search',
        action: () => this.handlers.onSearch?.()
      },
      {
        key: 'r',
        ctrlKey: true,
        description: 'Refresh task list',
        action: () => this.handlers.onRefresh?.()
      }
    ];
  }

  enable(): void {
    if (this.enabled) return;

    this.enabled = true;

    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.enabled),
        filter(event => !this.isInputElement(event.target as Element))
      )
      .subscribe(event => this.handleKeydown(event));
  }

  disable(): void {
    this.enabled = false;
  }

  setHandlers(handlers: typeof this.handlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  getShortcuts(): KeyboardShortcut[] {
    return [...this.shortcuts];
  }

  private handleKeydown(event: KeyboardEvent): void {
    const shortcut = this.shortcuts.find(s => {
      if (s.key !== event.key) return false;
      if (s.ctrlKey && !event.ctrlKey) return false;
      if (s.shiftKey && !event.shiftKey) return false;
      if (s.altKey && !event.altKey) return false;
      return true;
    });

    if (shortcut) {
      event.preventDefault();
      shortcut.action();
    }
  }

  private isInputElement(element: Element): boolean {
    if (!element) return false;

    const tagName = element.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      (element as HTMLElement).isContentEditable
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
