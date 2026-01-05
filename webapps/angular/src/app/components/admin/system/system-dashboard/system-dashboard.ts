import { Component, OnInit, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCogs,
  faChartBar,
  faHeartbeat,
  faServer,
  faSync,
  faSpinner,
  faExchangeAlt
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import * as SystemActions from '../../../../store/admin/system/system.actions';
import * as SystemSelectors from '../../../../store/admin/system/system.selectors';
import { ProcessEngine } from '../../../../models/admin/system.model';

interface SystemSection {
  id: string;
  labelKey: string;
  icon: any;
  route: string;
}

@Component({
  selector: 'app-system-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    TranslatePipe
  ],
  templateUrl: './system-dashboard.html',
  styleUrls: ['./system-dashboard.css']
})
export class SystemDashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private store = inject(Store);
  private router = inject(Router);

  // Icons
  faCogs = faCogs;
  faChartBar = faChartBar;
  faHeartbeat = faHeartbeat;
  faServer = faServer;
  faSync = faSync;
  faSpinner = faSpinner;
  faExchangeAlt = faExchangeAlt;

  // State
  engines: ProcessEngine[] = [];
  currentEngine = 'default';
  activeSection = 'general';
  loading = false;

  sections: SystemSection[] = [
    {
      id: 'general',
      labelKey: 'admin.system.general',
      icon: faCogs,
      route: '/admin/system/general'
    },
    {
      id: 'metrics',
      labelKey: 'admin.system.metrics',
      icon: faChartBar,
      route: '/admin/system/metrics'
    },
    {
      id: 'diagnostics',
      labelKey: 'admin.system.diagnostics',
      icon: faHeartbeat,
      route: '/admin/system/diagnostics'
    }
  ];

  ngOnInit(): void {
    this.loadEngines();
    this.subscribeToState();
    this.subscribeToRoute();
  }

  private loadEngines(): void {
    this.store.dispatch(SystemActions.loadEngines());
  }

  private subscribeToState(): void {
    this.store.select(SystemSelectors.selectEngines)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(engines => {
        this.engines = engines;
        this.cdr.detectChanges();
      });

    this.store.select(SystemSelectors.selectCurrentEngine)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(engine => {
        this.currentEngine = engine;
        this.cdr.detectChanges();
      });

    this.store.select(SystemSelectors.selectLoading)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => {
        this.loading = loading;
        this.cdr.detectChanges();
      });
  }

  private subscribeToRoute(): void {
    // Update active section on initial load
    this.updateActiveSection();

    // Subscribe to router navigation events
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.updateActiveSection();
      });
  }

  private updateActiveSection(): void {
    const url = this.router.url;
    if (url.includes('/metrics')) {
      this.activeSection = 'metrics';
    } else if (url.includes('/diagnostics')) {
      this.activeSection = 'diagnostics';
    } else {
      this.activeSection = 'general';
    }
    this.cdr.detectChanges();
  }

  onEngineChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const engineName = select.value;
    this.store.dispatch(SystemActions.setCurrentEngine({ engineName }));

    // Reload current section data for new engine
    this.store.dispatch(SystemActions.loadEngineInfo({ engineName }));
    this.store.dispatch(SystemActions.loadJobExecutorStatus({ engineName }));
    this.store.dispatch(SystemActions.loadTelemetryData({ engineName }));
  }

  isActive(sectionId: string): boolean {
    return this.activeSection === sectionId;
  }

  refresh(): void {
    this.store.dispatch(SystemActions.loadEngines());
    this.store.dispatch(SystemActions.loadEngineInfo({}));
    this.store.dispatch(SystemActions.loadJobExecutorStatus({}));
  }
}
