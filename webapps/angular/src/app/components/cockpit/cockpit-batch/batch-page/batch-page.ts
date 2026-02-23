import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';

import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { BatchRuntimeListComponent } from '../batch-runtime-list/batch-runtime-list';
import { BatchHistoryListComponent } from '../batch-history-list/batch-history-list';
import { BatchDetailComponent } from '../batch-detail/batch-detail';

import * as BatchActions from '../../../../store/cockpit/batch/batch.actions';
import * as BatchSelectors from '../../../../store/cockpit/batch/batch.selectors';

@Component({
  selector: 'app-batch-page',
  standalone: true,
  imports: [
    CommonModule,
    CockpitHeaderComponent,
    BatchRuntimeListComponent,
    BatchHistoryListComponent,
    BatchDetailComponent
  ],
  templateUrl: './batch-page.html',
  styleUrl: './batch-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchPageComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);

  breadcrumbs: BreadcrumbItem[] = [
    { translateKey: 'cockpit.menu.batches' }
  ];

  // Selectors
  selectedBatch$ = this.store.select(BatchSelectors.selectSelectedBatch);
  selectionType$ = this.store.select(BatchSelectors.selectSelectionType);
  selectionLoading$ = this.store.select(BatchSelectors.selectSelectionLoading);

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS);

    // Start polling for batch updates
    this.store.dispatch(BatchActions.startPolling());

    // Load batches
    this.store.dispatch(BatchActions.loadRuntimeBatches());

    // Watch for route query params (details & type)
    this.route.queryParams.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(params => {
      if (params['details'] && params['type']) {
        this.store.dispatch(BatchActions.loadBatchDetails({
          id: params['details'],
          batchType: params['type'] as 'runtime' | 'history'
        }));
      }
    });
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
    this.store.dispatch(BatchActions.stopPolling());
    this.store.dispatch(BatchActions.clearSelection());
  }

  onBatchSelect(id: string, type: 'runtime' | 'history'): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { details: id, type },
      queryParamsHandling: 'merge'
    });
  }
}
