import { Component, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSpinner, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';

import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { CamDatePipe } from '../../../../pipes';
import { PaginationComponent, PageChangeEvent } from '../../../../shared/pagination/pagination';
import { HistoryBatch, BatchSorting } from '../../../../models/cockpit/batch.model';

import * as BatchActions from '../../../../store/cockpit/batch/batch.actions';
import * as BatchSelectors from '../../../../store/cockpit/batch/batch.selectors';

@Component({
  selector: 'app-batch-history-list',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, TranslatePipe, CamDatePipe, PaginationComponent],
  templateUrl: './batch-history-list.html',
  styleUrl: './batch-history-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchHistoryListComponent {
  private store = inject(Store);

  @Output() batchSelect = new EventEmitter<string>();

  // Icons
  faSpinner = faSpinner;
  faSort = faSort;
  faSortUp = faSortUp;
  faSortDown = faSortDown;

  // Selectors
  batches$ = this.store.select(BatchSelectors.selectHistoryBatches);
  count$ = this.store.select(BatchSelectors.selectHistoryCount);
  loading$ = this.store.select(BatchSelectors.selectHistoryLoading);
  currentPage$ = this.store.select(BatchSelectors.selectHistoryCurrentPage);
  pageSize$ = this.store.select(BatchSelectors.selectHistoryPageSize);
  sorting$ = this.store.select(BatchSelectors.selectHistorySorting);
  shouldLoad$ = this.store.select(BatchSelectors.selectHistoryShouldLoad);
  selectedBatch$ = this.store.select(BatchSelectors.selectSelectedBatch);

  // Table columns
  columns = [
    { key: 'batchId', label: 'BATCHES_PROGRESS_ID', sortable: true },
    { key: 'type', label: 'BATCHES_PROGRESS_TYPE', sortable: false },
    { key: 'startTime', label: 'BATCHES_PROGRESS_START_TIME', sortable: true },
    { key: 'endTime', label: 'BATCHES_PROGRESS_END_TIME', sortable: true }
  ];

  onLoadHistory(): void {
    this.store.dispatch(BatchActions.enableHistoryLoading());
  }

  onSort(column: { key: string; sortable: boolean }, currentSorting: BatchSorting): void {
    if (!column.sortable) return;

    const newSortOrder = currentSorting.sortBy === column.key && currentSorting.sortOrder === 'asc'
      ? 'desc'
      : 'asc';

    this.store.dispatch(BatchActions.setHistorySorting({
      sorting: { sortBy: column.key, sortOrder: newSortOrder }
    }));
  }

  onPageChange(event: PageChangeEvent): void {
    this.store.dispatch(BatchActions.setHistoryPage({ page: event.current }));
  }

  onBatchClick(batch: HistoryBatch): void {
    this.batchSelect.emit(batch.id);
  }

  isSelected(batch: HistoryBatch, selectedBatch: any): boolean {
    return selectedBatch?.id === batch.id;
  }

  getSortIcon(column: { key: string }, sorting: BatchSorting): any {
    if (sorting.sortBy !== column.key) return this.faSort;
    return sorting.sortOrder === 'asc' ? this.faSortUp : this.faSortDown;
  }

  trackByBatchId(_index: number, batch: HistoryBatch): string {
    return batch.id;
  }
}
