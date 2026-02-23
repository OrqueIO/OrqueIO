import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner,
  faPause,
  faPlay,
  faRedo,
  faTrash
} from '@fortawesome/free-solid-svg-icons';

import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { CamDatePipe } from '../../../../pipes';
import { TooltipDirective } from '../../../../shared/tooltip/tooltip.directive';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog';
import { BatchJobsListComponent } from '../batch-jobs-list/batch-jobs-list';

import { BatchStatistics, HistoryBatch, BATCH_DETAIL_KEYS } from '../../../../models/cockpit/batch.model';
import * as BatchActions from '../../../../store/cockpit/batch/batch.actions';
import * as BatchSelectors from '../../../../store/cockpit/batch/batch.selectors';

@Component({
  selector: 'app-batch-detail',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    TranslatePipe,
    CamDatePipe,
    TooltipDirective,
    ConfirmDialogComponent,
    BatchJobsListComponent
  ],
  templateUrl: './batch-detail.html',
  styleUrl: './batch-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchDetailComponent {
  private store = inject(Store);

  // Icons
  faSpinner = faSpinner;
  faPause = faPause;
  faPlay = faPlay;
  faRedo = faRedo;
  faTrash = faTrash;

  // Selectors
  batch$ = this.store.select(BatchSelectors.selectSelectedBatch);
  type$ = this.store.select(BatchSelectors.selectSelectionType);
  loading$ = this.store.select(BatchSelectors.selectSelectionLoading);
  error$ = this.store.select(BatchSelectors.selectSelectionError);
  isSuspended$ = this.store.select(BatchSelectors.selectIsSuspended);
  hasFailedJobs$ = this.store.select(BatchSelectors.selectHasFailedJobs);
  batchJobDefinitionId$ = this.store.select(BatchSelectors.selectBatchJobDefinitionId);

  // Delete modal state
  showDeleteModal = false;

  // Detail keys to display
  detailKeys = BATCH_DETAIL_KEYS;

  onToggleSuspension(batch: BatchStatistics | HistoryBatch): void {
    const runtimeBatch = batch as BatchStatistics;
    this.store.dispatch(BatchActions.toggleBatchSuspension({
      id: batch.id,
      suspended: !runtimeBatch.suspended
    }));
  }

  onRetryAll(batch: BatchStatistics | HistoryBatch): void {
    const runtimeBatch = batch as BatchStatistics;
    this.store.dispatch(BatchActions.retryAllJobs({
      jobDefinitionId: runtimeBatch.batchJobDefinitionId
    }));
  }

  onDeleteClick(): void {
    this.showDeleteModal = true;
  }

  onDeleteConfirm(batch: BatchStatistics | HistoryBatch, batchType: 'runtime' | 'history'): void {
    this.store.dispatch(BatchActions.deleteBatch({
      id: batch.id,
      batchType,
      cascade: true
    }));
    this.showDeleteModal = false;
  }

  onDeleteCancel(): void {
    this.showDeleteModal = false;
  }

  isTimeKey(key: string): boolean {
    return key.endsWith('Time');
  }

  getBatchValue(batch: any, key: string): any {
    return batch[key];
  }

  shouldShowKey(batch: any, key: string): boolean {
    const value = batch[key];
    if (value === undefined || value === null) return false;
    if (key === 'failedJobs') return false; // Shown separately
    if (key === 'executionStartTime') return true; // Always show even if null
    return true;
  }

  getFailedJobsNote(batch: BatchStatistics): string | null {
    if (batch.failedJobs > 0) {
      return `(${batch.failedJobs} failed)`;
    }
    return null;
  }

  isRuntimeBatch(batch: any): batch is BatchStatistics {
    return 'suspended' in batch;
  }
}
