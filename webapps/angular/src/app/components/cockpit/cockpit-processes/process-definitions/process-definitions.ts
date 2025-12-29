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
  faList,
  faThLarge
} from '@fortawesome/free-solid-svg-icons';

type ViewMode = 'list' | 'tile';

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS } from '../../../../shared/cockpit-menu';
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
  faList = faList;
  faThLarge = faThLarge;

  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Processes', translateKey: 'cockpit.menu.processes' }
  ];

  // Data
  processDefinitions: ProcessDefinitionStatistics[] = [];
  filteredDefinitions: ProcessDefinitionStatistics[] = [];
  loading = true;

  // Filters
  searchQuery = '';

  // View mode
  viewMode: ViewMode = 'list';
  private readonly VIEW_MODE_KEY = 'cockpit.processes.viewMode';

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS);
    this.loadViewMode();
    this.loadProcessDefinitions();
  }

  private loadViewMode(): void {
    const savedMode = localStorage.getItem(this.VIEW_MODE_KEY);
    if (savedMode === 'list' || savedMode === 'tile') {
      this.viewMode = savedMode;
    }
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    localStorage.setItem(this.VIEW_MODE_KEY, mode);
    this.cdr.markForCheck();
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
