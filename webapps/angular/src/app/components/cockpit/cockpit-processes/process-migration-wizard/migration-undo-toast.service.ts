/**
 * Service for managing undo toast after removing a migration mapping.
 * Provides a single toast at a time with automatic dismissal after 6 seconds.
 */

import { Injectable, signal } from '@angular/core';
import { MappingSnapshot } from './migration-undo-utils';

export interface UndoToastState {
  visible: boolean;
  snapshot: MappingSnapshot | null;
  dismissTimer: ReturnType<typeof setTimeout> | null;
}

@Injectable()
export class MigrationUndoToastService {
  // Signal for toast state
  toastState = signal<UndoToastState>({
    visible: false,
    snapshot: null,
    dismissTimer: null
  });

  /**
   * Shows the undo toast for a removed mapping.
   * If a toast is already shown, replaces it (previous undo is no longer possible).
   *
   * @param snapshot - Snapshot of the removed mapping
   * @param timeoutMs - Time in milliseconds before auto-dismissal (default: 6000)
   */
  show(snapshot: MappingSnapshot, timeoutMs: number = 6000): void {
    this.clearTimer();
    const timer = setTimeout(() => {
      this.dismiss();
    }, timeoutMs);

    this.toastState.set({
      visible: true,
      snapshot,
      dismissTimer: timer
    });
  }

  /**
   * Dismisses the toast and clears the timer.
   */
  dismiss(): void {
    this.clearTimer();
    this.toastState.set({
      visible: false,
      snapshot: null,
      dismissTimer: null
    });
  }

  /**
   * Returns the current snapshot (for undo operation).
   * Returns null if no toast is visible.
   */
  getCurrentSnapshot(): MappingSnapshot | null {
    return this.toastState().snapshot;
  }

  /**
   * Clears the auto-dismiss timer if one exists.
   */
  private clearTimer(): void {
    const currentState = this.toastState();
    if (currentState.dismissTimer) {
      clearTimeout(currentState.dismissTimer);
    }
  }

  /**
   * Cleanup method to be called on component destroy.
   * Clears any pending timers.
   */
  ngOnDestroy(): void {
    this.clearTimer();
  }
}