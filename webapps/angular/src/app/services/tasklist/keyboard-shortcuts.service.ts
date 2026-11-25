import { Injectable, inject, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject, fromEvent, takeUntil, filter } from 'rxjs';
import { TasksActions } from '../../store/tasklist/tasklist.actions';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  /** Translation key; display it with the translate pipe or TranslateService.instant() */
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
        description: 'tasklist.shortcuts.navigateUp',
        action: () => this.handlers.onNavigateUp?.()
      },
      {
        key: 'ArrowDown',
        description: 'tasklist.shortcuts.navigateDown',
        action: () => this.handlers.onNavigateDown?.()
      },
      {
        key: 'Enter',
        description: 'tasklist.shortcuts.selectTask',
        action: () => this.handlers.onSelectTask?.()
      },
      {
        key: 'Escape',
        description: 'tasklist.shortcuts.closeDetail',
        action: () => this.handlers.onCloseDetail?.()
      },
      {
        key: 'c',
        description: 'tasklist.shortcuts.claim',
        action: () => this.handlers.onClaim?.()
      },
      {
        key: 'u',
        description: 'tasklist.shortcuts.unclaim',
        action: () => this.handlers.onUnclaim?.()
      },
      {
        key: 'd',
        description: 'tasklist.shortcuts.complete',
        action: () => this.handlers.onComplete?.()
      },
      {
        key: '/',
        description: 'tasklist.shortcuts.focusSearch',
        action: () => this.handlers.onSearch?.()
      },
      {
        key: 'r',
        ctrlKey: true,
        description: 'tasklist.shortcuts.refresh',
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
