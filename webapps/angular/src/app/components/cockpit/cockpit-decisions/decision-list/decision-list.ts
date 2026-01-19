import { Component, OnInit, OnDestroy, DestroyRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner,
  faTable,
  faEye,
  faLayerGroup,
  faSort,
  faSortUp,
  faSortDown,
  faChevronLeft,
  faChevronRight,
  faAnglesLeft,
  faAnglesRight,
  faSitemap,
  faSearch
} from '@fortawesome/free-solid-svg-icons';
import { forkJoin } from 'rxjs';

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import { CockpitService, DecisionDefinition } from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';

interface SortConfig {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-decision-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
    CockpitHeaderComponent,
    TranslatePipe
  ],
  templateUrl: './decision-list.html',
  styleUrls: ['./decision-list.css']
})
export class DecisionListComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);
  private cdr = inject(ChangeDetectorRef);

  // Icons
  faSpinner = faSpinner;
  faTable = faTable;
  faEye = faEye;
  faLayerGroup = faLayerGroup;
  faSort = faSort;
  faSortUp = faSortUp;
  faSortDown = faSortDown;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faAnglesLeft = faAnglesLeft;
  faAnglesRight = faAnglesRight;
  faSitemap = faSitemap;
  faSearch = faSearch;

  breadcrumbs: BreadcrumbItem[] = [
    { translateKey: 'cockpit.menu.decisions' }
  ];

  loading = true;
  decisionDefinitions: DecisionDefinition[] = [];
  filteredDefinitions: DecisionDefinition[] = [];
  totalCount = 0;

  // Search
  searchQuery = '';

  // Pagination
  currentPage = 1;
  pageSize = 50;
  pageSizeOptions = [25, 50, 100];

  // Sorting
  sortConfig: SortConfig = {
    sortBy: 'name',
    sortOrder: 'asc'
  };

  // Table columns
  columns = [
    { id: 'name', label: 'cockpit.decisions.columns.name', sortable: true },
    { id: 'tenantId', label: 'cockpit.decisions.columns.tenantId', sortable: true },
    { id: 'decisionRequirementsDefinitionKey', label: 'cockpit.decisions.columns.drd', sortable: true }
  ];

  constructor(private cockpitService: CockpitService) {}

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS);
    this.loadSortConfig();
    this.loadDecisionDefinitions();
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
  }

  private loadSortConfig(): void {
    const saved = localStorage.getItem('sortDecDefTable');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.sortBy && config.sortOrder) {
          this.sortConfig = config;
        }
      } catch {
        // Use default
      }
    }
  }

  private saveSortConfig(): void {
    localStorage.setItem('sortDecDefTable', JSON.stringify(this.sortConfig));
  }

  private loadDecisionDefinitions(): void {
    this.loading = true;

    const countRequest = this.cockpitService.getDecisionDefinitionsCount();
    const dataRequest = this.cockpitService.getDecisionDefinitionsPaginated({
      firstResult: (this.currentPage - 1) * this.pageSize,
      maxResults: this.pageSize,
      sortBy: this.sortConfig.sortBy,
      sortOrder: this.sortConfig.sortOrder,
      latestVersion: true
    });

    forkJoin({ count: countRequest, data: dataRequest })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ count, data }) => {
          this.totalCount = count;
          this.decisionDefinitions = data;
          this.applyFilter();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  applyFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredDefinitions = [...this.decisionDefinitions];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredDefinitions = this.decisionDefinitions.filter(def => {
        const name = (def.name || '').toLowerCase();
        const key = (def.key || '').toLowerCase();
        const tenant = (def.tenantId || '').toLowerCase();
        return name.includes(query) || key.includes(query) || tenant.includes(query);
      });
    }
  }

  onSearchChange(): void {
    this.applyFilter();
    this.cdr.detectChanges();
  }

  onSort(columnId: string): void {
    if (this.sortConfig.sortBy === columnId) {
      this.sortConfig.sortOrder = this.sortConfig.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.sortBy = columnId;
      this.sortConfig.sortOrder = 'asc';
    }
    this.saveSortConfig();
    this.currentPage = 1;
    this.loadDecisionDefinitions();
  }

  getSortIcon(columnId: string): any {
    if (this.sortConfig.sortBy !== columnId) {
      return this.faSort;
    }
    return this.sortConfig.sortOrder === 'asc' ? this.faSortUp : this.faSortDown;
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadDecisionDefinitions();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadDecisionDefinitions();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalCount);
  }

  getDisplayName(definition: DecisionDefinition): string {
    return definition.name || definition.key;
  }

  getDrdName(definition: DecisionDefinition): string | null {
    if (definition.drd) {
      return definition.drd.name || definition.drd.key;
    }
    if (definition.decisionRequirementsDefinitionKey) {
      return definition.decisionRequirementsDefinitionKey;
    }
    return null;
  }

  hasDrd(definition: DecisionDefinition): boolean {
    return !!(definition.drd || definition.decisionRequirementsDefinitionId);
  }

  getDrdId(definition: DecisionDefinition): string | null {
    return definition.drd?.id || definition.decisionRequirementsDefinitionId || null;
  }
}
