import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner,
  faSort,
  faSortUp,
  faSortDown,
  faRedo,
  faTrash,
  faBars,
  faExternalLinkAlt
} from '@fortawesome/free-solid-svg-icons';

import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TooltipDirective } from '../../../../shared/tooltip/tooltip.directive';
import { PaginationComponent, PageChangeEvent } from '../../../../shared/pagination/pagination';
import { BatchJob, BatchSorting } from '../../../../models/cockpit/batch.model';
import { BatchService } from '../../../../services/batch.service';

import * as BatchActions from '../../../../store/cockpit/batch/batch.actions';
import * as BatchSelectors from '../../../../store/cockpit/batch/batch.selectors';

@Component({
  selector: 'app-batch-jobs-list',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, TranslatePipe, TooltipDirective, PaginationComponent],
  templateUrl: './batch-jobs-list.html',
  styleUrl: './batch-jobs-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchJobsListComponent {
  private store = inject(Store);
  private batchService = inject(BatchService);

  // Icons
  faSpinner = faSpinner;
  faSort = faSort;
  faSortUp = faSortUp;
  faSortDown = faSortDown;
  faRedo = faRedo;
  faTrash = faTrash;
  faBars = faBars;
  faExternalLinkAlt = faExternalLinkAlt;

  // Selectors
  jobs$ = this.store.select(BatchSelectors.selectFailedJobs);
  count$ = this.store.select(BatchSelectors.selectJobsCount);
  loading$ = this.store.select(BatchSelectors.selectJobsLoading);
  currentPage$ = this.store.select(BatchSelectors.selectJobsCurrentPage);
  pageSize$ = this.store.select(BatchSelectors.selectJobsPageSize);
  sorting$ = this.store.select(BatchSelectors.selectJobsSorting);

  // Table columns
  columns = [
    { key: 'jobId', label: 'BATCHES_PROGRESS_ID', sortable: true },
    { key: 'exception', label: 'BATCHES_PROGRESS_EXCEPTION', sortable: false },
    { key: 'actions', label: 'BATCHES_PROGRESS_ACTIONS', sortable: false }
  ];

  onSort(column: { key: string; sortable: boolean }, currentSorting: BatchSorting): void {
    if (!column.sortable) return;

    const newSortOrder = currentSorting.sortBy === column.key && currentSorting.sortOrder === 'asc'
      ? 'desc'
      : 'asc';

    this.store.dispatch(BatchActions.setJobsSorting({
      sorting: { sortBy: column.key, sortOrder: newSortOrder }
    }));
  }

  onPageChange(event: PageChangeEvent): void {
    this.store.dispatch(BatchActions.setJobsPage({ page: event.current }));
  }

  onRetryJob(job: BatchJob): void {
    this.store.dispatch(BatchActions.retryJob({ jobId: job.id }));
  }

  onDeleteJob(job: BatchJob): void {
    this.store.dispatch(BatchActions.deleteJob({ jobId: job.id }));
  }

  getStacktraceUrl(job: BatchJob): string {
    return this.batchService.getJobStacktraceUrl(job.id);
  }

  getExceptionPreview(job: BatchJob): string {
    if (!job.exceptionMessage) return '-';
    return job.exceptionMessage.length > 120
      ? job.exceptionMessage.substring(0, 120) + '…'
      : job.exceptionMessage;
  }

  getSortIcon(column: { key: string }, sorting: BatchSorting): any {
    if (sorting.sortBy !== column.key) return this.faSort;
    return sorting.sortOrder === 'asc' ? this.faSortUp : this.faSortDown;
  }

  trackByJobId(_index: number, job: BatchJob): string {
    return job.id;
  }
}
