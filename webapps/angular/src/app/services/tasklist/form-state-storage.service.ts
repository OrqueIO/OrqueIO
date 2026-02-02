/*
 * Copyright 2026 OrqueIO (https://www.orqueio.io/).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Injectable } from '@angular/core';

/**
 * Stored variable structure
 */
export interface StoredVariable {
  name: string;
  type: string;
  value: any;
  valueInfo?: {
    objectTypeName?: string;
    serializationDataFormat?: string;
  };
}

/**
 * Stored form state structure
 */
export interface StoredFormState {
  variables: StoredVariable[];
  timestamp: number;
}

/**
 * Service for managing form state persistence in localStorage.
 *
 * This service replicates the AngularJS camFormStateToLocal behavior,
 * allowing users to recover form data when switching tasks or
 * after browser refresh.
 *
 * Features:
 * - Automatic state cleanup after 24 hours
 * - Safe handling of localStorage errors (full/disabled)
 * - Task-specific storage keys
 */
@Injectable({
  providedIn: 'root'
})
export class FormStateStorageService {
  private readonly STORAGE_KEY_PREFIX = 'orqueio:task-form:';
  private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get the localStorage key for a task
   */
  private getStorageKey(taskId: string): string {
    return `${this.STORAGE_KEY_PREFIX}${taskId}`;
  }

  /**
   * Save form state to localStorage
   *
   * @param taskId - The task ID
   * @param variables - Array of variables to save
   * @returns true if saved successfully, false otherwise
   */
  saveState(taskId: string, variables: StoredVariable[]): boolean {
    if (!taskId || variables.length === 0) {
      return false;
    }

    try {
      const state: StoredFormState = {
        variables: variables.map(v => ({
          name: v.name,
          type: v.type,
          value: v.value,
          valueInfo: v.valueInfo
        })),
        timestamp: Date.now()
      };
      localStorage.setItem(this.getStorageKey(taskId), JSON.stringify(state));
      return true;
    } catch {
      // localStorage might be full or disabled
      return false;
    }
  }

  /**
   * Restore form state from localStorage
   *
   * @param taskId - The task ID
   * @returns The stored state if valid, null otherwise
   */
  restoreState(taskId: string): StoredFormState | null {
    if (!taskId) {
      return null;
    }

    try {
      const stored = localStorage.getItem(this.getStorageKey(taskId));
      if (!stored) {
        return null;
      }

      const state: StoredFormState = JSON.parse(stored);

      // Check if stored state is too old
      if (state.timestamp && (Date.now() - state.timestamp) > this.MAX_AGE_MS) {
        this.clearState(taskId);
        return null;
      }

      // Validate structure
      if (!state.variables || !Array.isArray(state.variables) || state.variables.length === 0) {
        return null;
      }

      return state;
    } catch {
      // Invalid JSON or other error
      return null;
    }
  }

  /**
   * Clear stored form state for a task
   *
   * @param taskId - The task ID
   */
  clearState(taskId: string): void {
    if (!taskId) return;

    try {
      localStorage.removeItem(this.getStorageKey(taskId));
    } catch {
      // Ignore errors
    }
  }

  /**
   * Check if there is stored state for a task
   *
   * @param taskId - The task ID
   * @returns true if state exists and is valid
   */
  hasStoredState(taskId: string): boolean {
    return this.restoreState(taskId) !== null;
  }

  /**
   * Clean up all expired form states from localStorage.
   * This can be called periodically to free up space.
   */
  cleanupExpiredStates(): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_KEY_PREFIX)) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const state: StoredFormState = JSON.parse(stored);
              if (state.timestamp && (Date.now() - state.timestamp) > this.MAX_AGE_MS) {
                keysToRemove.push(key);
              }
            }
          } catch {
            // Invalid state, remove it
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch {
      // Ignore errors
    }
  }
}
