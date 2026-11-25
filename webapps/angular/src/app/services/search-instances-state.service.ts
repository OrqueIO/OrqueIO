import { Injectable, DestroyRef, inject } from '@angular/core';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MultiValueFilter } from './cockpit.service';
import { AuthService } from './auth';

/**
 * Persisted state for Process Instance Search screen.
 * NEW RULE: State is ONLY written at handoff (when navigating to batch operations).
 * State is read ONLY when returning from batch operations.
 * State is deleted immediately after being read (single-use snapshot).
 */
export interface SearchInstancesPersistedState {
  version: number;
  criteria: MultiValueFilter[];
  variableNamesIgnoreCase: boolean;
  variableValuesIgnoreCase: boolean;
  currentPage: number;
  pageSize: number;
  selectedIds: string[];
  selectedMetadata: Array<{
    id: string;
    state: string;
    processDefinitionId: string;
    processDefinitionKey: string;
  }>;
  scrollTop?: number;
}

const STORAGE_KEY = 'searchInstancesState.v1';
const MAX_PERSISTED_IDS = 100000;

/**
 * Destinations that are considered "batch return origins".
 * If previousUrl matches one of these, the snapshot is restored.
 */
export const BATCH_RETURN_ORIGINS = [
  '/cockpit/batch/operations',
  // Process-list with tab=modify (Move Instances)
  '/cockpit/processes/',  // Will check for tab=modify in query params
];

@Injectable({
  providedIn: 'root'
})
export class SearchInstancesStateService {
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private storageQuotaWarningShown = false;

  constructor() {
    // Clear state on logout
    this.authService.authEvents$
      .pipe(
        filter((event: any) => event.type === 'authentication.logout.success'),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.clearState();
      });
  }

  /**
   * Load and DELETE persisted state from sessionStorage (single-use).
   * Returns null if no valid state found.
   * ALWAYS deletes the snapshot after reading.
   */
  loadAndDeleteState(): SearchInstancesPersistedState | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);

      // ALWAYS delete after reading (single-use snapshot)
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}

      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);

      // Validate structure
      if (!this.isValidState(parsed)) {
        console.warn('[SearchInstancesStateService] Invalid state structure, ignoring');
        return null;
      }

      // Version check
      if (parsed.version !== 1) {
        console.warn('[SearchInstancesStateService] Unsupported version, ignoring');
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn('[SearchInstancesStateService] Failed to load state:', error);
      // Clean up corrupted data
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
      return null;
    }
  }

  /**
   * Write snapshot to storage (called ONLY at batch handoff).
   * NEW RULE: No debounced save, no continuous updates.
   */
  writeSnapshot(state: SearchInstancesPersistedState): void {
    // Check size limit
    if (state.selectedIds.length > MAX_PERSISTED_IDS) {
      if (!this.storageQuotaWarningShown) {
        console.warn(`[SearchInstancesStateService] Selection too large (${state.selectedIds.length} > ${MAX_PERSISTED_IDS}), not persisting selection`);
        this.storageQuotaWarningShown = true;
      }
      // Don't write at all if selection is too large
      return;
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // QuotaExceededError or storage unavailable
      if (!this.storageQuotaWarningShown && error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('[SearchInstancesStateService] sessionStorage quota exceeded, state not persisted');
        this.storageQuotaWarningShown = true;
      }
    }
  }

  /**
   * Clear persisted state (called by Clear button and logout).
   */
  clearState(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  /**
   * Check if selection size exceeds limit.
   */
  isSelectionTooLarge(count: number): boolean {
    return count > MAX_PERSISTED_IDS;
  }

  /**
   * Reset the quota warning flag (for testing).
   */
  resetWarningFlag(): void {
    this.storageQuotaWarningShown = false;
  }

  private isValidState(obj: any): obj is SearchInstancesPersistedState {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.version === 'number' &&
      Array.isArray(obj.criteria) &&
      typeof obj.variableNamesIgnoreCase === 'boolean' &&
      typeof obj.variableValuesIgnoreCase === 'boolean' &&
      typeof obj.currentPage === 'number' &&
      typeof obj.pageSize === 'number' &&
      Array.isArray(obj.selectedIds) &&
      Array.isArray(obj.selectedMetadata)
    );
  }
}