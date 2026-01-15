import { Component, OnInit, OnDestroy, DestroyRef, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner,
  faSearch,
  faCogs,
  faExclamationTriangle,
  faCheckCircle,
  faPlayCircle,
  faEye,
  faSort,
  faSortUp,
  faSortDown
} from '@fortawesome/free-solid-svg-icons';

interface SortConfig {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import { CockpitService, ProcessDefinitionStatistics } from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { ClipboardDirective } from '../../../../shared/clipboard-directive/clipboard.directive';

@Component({
  selector: 'app-process-definitions',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
    CockpitHeaderComponent,
    TranslatePipe,
    ClipboardDirective
  ],
  templateUrl: './process-definitions.html',
  styleUrls: ['./process-definitions.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProcessDefinitionsComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);
  private cockpitService = inject(CockpitService);
  private cdr = inject(ChangeDetectorRef);

  // Icons
  faSpinner = faSpinner;
  faSearch = faSearch;
  faCogs = faCogs;
  faExclamationTriangle = faExclamationTriangle;
  faCheckCircle = faCheckCircle;
  faPlayCircle = faPlayCircle;
  faEye = faEye;
  faSort = faSort;
  faSortUp = faSortUp;
  faSortDown = faSortDown;

  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Processes', translateKey: 'cockpit.menu.processes' }
  ];

  // Data
  processDefinitions: ProcessDefinitionStatistics[] = [];
  filteredDefinitions: ProcessDefinitionStatistics[] = [];
  loading = true;

  // Filters
  searchQuery = '';

  // Sorting
  sortConfig: SortConfig = {
    sortBy: 'name',
    sortOrder: 'asc'
  };
  private readonly SORT_CONFIG_KEY = 'cockpit.processes.sortConfig';

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS);
    this.loadSortConfig();
    this.loadProcessDefinitions();
  }

  private loadSortConfig(): void {
    const saved = localStorage.getItem(this.SORT_CONFIG_KEY);
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
    localStorage.setItem(this.SORT_CONFIG_KEY, JSON.stringify(this.sortConfig));
  }

  onSort(columnId: string): void {
    if (this.sortConfig.sortBy === columnId) {
      this.sortConfig.sortOrder = this.sortConfig.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.sortBy = columnId;
      this.sortConfig.sortOrder = 'asc';
    }
    this.saveSortConfig();
    this.applyFilter();
  }

  getSortIcon(columnId: string): any {
    if (this.sortConfig.sortBy !== columnId) {
      return this.faSort;
    }
    return this.sortConfig.sortOrder === 'asc' ? this.faSortUp : this.faSortDown;
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
  }

  loadProcessDefinitions(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.cockpitService.getProcessDefinitionsWithStatistics()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (definitions) => {
          this.processDefinitions = definitions;
          this.applyFilter();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  applyFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredDefinitions = [...this.processDefinitions];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredDefinitions = this.processDefinitions.filter(def => {
        const name = (def.definition?.name || def.definition?.key || '').toLowerCase();
        const key = (def.definition?.key || '').toLowerCase();
        return name.includes(query) || key.includes(query);
      });
    }

    // Apply sorting
    this.filteredDefinitions.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (this.sortConfig.sortBy) {
        case 'name':
          valueA = this.getDefinitionName(a).toLowerCase();
          valueB = this.getDefinitionName(b).toLowerCase();
          break;
        case 'key':
          valueA = this.getDefinitionKey(a).toLowerCase();
          valueB = this.getDefinitionKey(b).toLowerCase();
          break;
        case 'tenant':
          valueA = (a.definition?.tenantId || '').toLowerCase();
          valueB = (b.definition?.tenantId || '').toLowerCase();
          break;
        case 'instances':
          valueA = a.instances || 0;
          valueB = b.instances || 0;
          break;
        case 'incidents':
          valueA = this.getTotalIncidents(a);
          valueB = this.getTotalIncidents(b);
          break;
        default:
          valueA = this.getDefinitionName(a).toLowerCase();
          valueB = this.getDefinitionName(b).toLowerCase();
      }

      if (valueA < valueB) return this.sortConfig.sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortConfig.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    this.cdr.markForCheck();
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  getDefinitionName(def: ProcessDefinitionStatistics): string {
    return def.definition?.name || def.definition?.key || def.id;
  }

  getDefinitionKey(def: ProcessDefinitionStatistics): string {
    return def.definition?.key || def.id;
  }

  getTotalIncidents(def: ProcessDefinitionStatistics): number {
    if (!def.incidents || def.incidents.length === 0) return 0;
    return def.incidents.reduce((sum, inc) => sum + inc.incidentCount, 0);
  }

  getStateClass(def: ProcessDefinitionStatistics): string {
    const incidents = this.getTotalIncidents(def);
    if (incidents > 0) return 'state-error';
    if (def.instances > 0) return 'state-running';
    return 'state-ok';
  }

  getStateIcon(def: ProcessDefinitionStatistics): any {
    const incidents = this.getTotalIncidents(def);
    if (incidents > 0) return this.faExclamationTriangle;
    if (def.instances > 0) return this.faPlayCircle;
    return this.faCheckCircle;
  }
}
