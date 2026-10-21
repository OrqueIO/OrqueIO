import { Injectable, DestroyRef, inject } from '@angular/core';
import { Subject, debounceTime, filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MultiValueFilter } from './cockpit.service';
import { AuthService } from './auth';

/**
 * Persisted state for Process Instance Search screen.
 * Survives F5 refresh and navigation, stored in sessionStorage.
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
const DEBOUNCE_MS = 300;

@Injectable({
  providedIn: 'root'
})
export class SearchInstancesStateService {
  private currentState: SearchInstancesPersistedState | null = null;
  private saveRequest$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);
  private authService = inject(AuthService);
  private storageQuotaWarningShown = false;

  constructor() {
    // Debounced save to sessionStorage
    this.saveRequest$
      .pipe(
        debounceTime(DEBOUNCE_MS),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.flushToStorage();
      });

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
   * Load persisted state from sessionStorage.
   * Returns null if no valid state found.
   */
  loadState(): SearchInstancesPersistedState | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);

      // Validate structure
      if (!this.isValidState(parsed)) {
        console.warn('[SearchInstancesStateService] Invalid state structure, ignoring');
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }

      // Version check
      if (parsed.version !== 1) {
        console.warn('[SearchInstancesStateService] Unsupported version, ignoring');
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }

      this.currentState = parsed;
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
   * Update in-memory state and trigger debounced save.
   */
  updateState(state: SearchInstancesPersistedState): void {
    // Check size limit
    if (state.selectedIds.length > MAX_PERSISTED_IDS) {
      if (!this.storageQuotaWarningShown) {
        console.warn(`[SearchInstancesStateService] Selection too large (${state.selectedIds.length} > ${MAX_PERSISTED_IDS}), not persisting selection`);
        this.storageQuotaWarningShown = true;
      }
      // Persist everything except selection
      this.currentState = {
        ...state,
        selectedIds: [],
        selectedMetadata: []
      };
    } else {
      this.currentState = state;
    }

    this.saveRequest$.next();
  }

  /**
   * Immediately flush current state to storage (called in ngOnDestroy).
   */
  flushToStorage(): void {
    if (!this.currentState) {
      return;
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentState));
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
    this.currentState = null;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  /**
   * Clear only selection, keep criteria and pagination.
   */
  clearSelection(): void {
    if (!this.currentState) return;

    this.currentState = {
      ...this.currentState,
      selectedIds: [],
      selectedMetadata: []
    };

    this.flushToStorage();
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