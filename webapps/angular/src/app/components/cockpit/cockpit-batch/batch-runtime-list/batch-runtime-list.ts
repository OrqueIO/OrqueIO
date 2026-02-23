import { Component, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSpinner, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';

import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { CamDatePipe } from '../../../../pipes';
import { PaginationComponent, PageChangeEvent } from '../../../../shared/pagination/pagination';
import { BatchStatistics, BatchSorting } from '../../../../models/cockpit/batch.model';

import * as BatchActions from '../../../../store/cockpit/batch/batch.actions';
import * as BatchSelectors from '../../../../store/cockpit/batch/batch.selectors';

@Component({
  selector: 'app-batch-runtime-list',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, TranslatePipe, CamDatePipe, PaginationComponent],
  templateUrl: './batch-runtime-list.html',
  styleUrl: './batch-runtime-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchRuntimeListComponent {
  private store = inject(Store);

  @Output() batchSelect = new EventEmitter<string>();

  // Icons
  faSpinner = faSpinner;
  faSort = faSort;
  faSortUp = faSortUp;
  faSortDown = faSortDown;

  // Selectors
  batches$ = this.store.select(BatchSelectors.selectRuntimeBatches);
  count$ = this.store.select(BatchSelectors.selectRuntimeCount);
  loading$ = this.store.select(BatchSelectors.selectRuntimeLoading);
  currentPage$ = this.store.select(BatchSelectors.selectRuntimeCurrentPage);
  pageSize$ = this.store.select(BatchSelectors.selectRuntimePageSize);
  sorting$ = this.store.select(BatchSelectors.selectRuntimeSorting);
  users$ = this.store.select(BatchSelectors.selectRuntimeUsers);
  selectedBatch$ = this.store.select(BatchSelectors.selectSelectedBatch);

  // Table columns
  columns = [
    { key: 'batchId', label: 'BATCHES_PROGRESS_ID', sortable: true },
    { key: 'type', label: 'BATCHES_PROGRESS_TYPE', sortable: false },
    { key: 'user', label: 'BATCHES_PROGRESS_USER', sortable: false },
    { key: 'startTime', label: 'BATCHES_PROGRESS_START_TIME', sortable: true },
    { key: 'failed', label: 'BATCHES_PROGRESS_FAIL_JOBS', sortable: false },
    { key: 'progress', label: 'BATCHES_PROGRESS_PROGRESS', sortable: false }
  ];

  onSort(column: { key: string; sortable: boolean }, currentSorting: BatchSorting): void {
    if (!column.sortable) return;

    const newSortOrder = currentSorting.sortBy === column.key && currentSorting.sortOrder === 'asc'
      ? 'desc'
      : 'asc';

    this.store.dispatch(BatchActions.setRuntimeSorting({
      sorting: { sortBy: column.key, sortOrder: newSortOrder }
    }));
  }

  onPageChange(event: PageChangeEvent): void {
    this.store.dispatch(BatchActions.setRuntimePage({ page: event.current }));
  }

  onBatchClick(batch: BatchStatistics): void {
    this.batchSelect.emit(batch.id);
  }

  isSelected(batch: BatchStatistics, selectedBatch: any): boolean {
    return selectedBatch?.id === batch.id;
  }

  getUserName(batch: BatchStatistics, users: Record<string, any>): string {
    if (!batch.createUserId) return '-';
    const user = users[batch.createUserId];
    if (!user) return batch.createUserId;
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return fullName || user.id;
  }

  getProgressPercentage(batch: BatchStatistics, type: 'success' | 'failed' | 'remaining'): number {
    const total = batch.completedJobs + batch.remainingJobs;
    if (total === 0) return 0;

    switch (type) {
      case 'success':
        return (100 * batch.completedJobs) / total;
      case 'failed':
        return (100 * batch.failedJobs) / total;
      case 'remaining':
        return (100 * (batch.remainingJobs - batch.failedJobs)) / total;
    }
  }

  getProgressRounded(batch: BatchStatistics): number {
    return Math.round(this.getProgressPercentage(batch, 'success'));
  }

  getSortIcon(column: { key: string }, sorting: BatchSorting): any {
    if (sorting.sortBy !== column.key) return this.faSort;
    return sorting.sortOrder === 'asc' ? this.faSortUp : this.faSortDown;
  }

  trackByBatchId(_index: number, batch: BatchStatistics): string {
    return batch.id;
  }
}
