import { Component, OnInit, OnDestroy, DestroyRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { forkJoin } from 'rxjs';
import {
  faSpinner,
  faSitemap,
  faCopy,
  faCheck,
  faTable
} from '@fortawesome/free-solid-svg-icons';

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import { CockpitService, DecisionDefinition } from '../../../../services/cockpit.service';
import { DecisionService, DecisionRequirementsDefinition } from '../../../../services/decision.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { DmnViewerComponent } from '../../../../shared/dmn-viewer/dmn-viewer';

@Component({
  selector: 'app-drd-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    CockpitHeaderComponent,
    TranslatePipe,
    DmnViewerComponent
  ],
  templateUrl: './drd-detail.html',
  styleUrls: ['./drd-detail.css']
})
export class DrdDetailComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);
  private cdr = inject(ChangeDetectorRef);

  // Icons
  faSpinner = faSpinner;
  faSitemap = faSitemap;
  faCopy = faCopy;
  faCheck = faCheck;
  faTable = faTable;

  drdId = '';
  loading = true;
  drd: DecisionRequirementsDefinition | null = null;
  drdXml: string | null = null;
  memberDecisions: DecisionDefinition[] = [];
  isDrdExpanded = false;
  breadcrumbs: BreadcrumbItem[] = [];
  copiedField: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private cockpitService: CockpitService,
    private decisionService: DecisionService
  ) {}

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS);

    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.drdId = params['id'];
        this.breadcrumbs = [
          { translateKey: 'cockpit.menu.decisions', route: '/cockpit/decisions' },
          { label: this.drdId }
        ];
        this.loadDrdData();
      });
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
  }

  private loadDrdData(): void {
    this.loading = true;

    forkJoin({
      drd: this.decisionService.getDecisionRequirementsDefinition(this.drdId),
      xml: this.decisionService.getDecisionRequirementsDefinitionXml(this.drdId),
      decisions: this.cockpitService.getDecisionDefinitions()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ drd, xml, decisions }) => {
          this.drd = drd;
          this.drdXml = xml?.dmnXml || null;

          if (drd) {
            this.breadcrumbs[1].label = drd.name || drd.key;
            // Filtrer les décisions membres côté client sur la key DRD
            this.memberDecisions = (decisions || []).filter(
              d => d.decisionRequirementsDefinitionId === this.drdId
                || d.decisionRequirementsDefinitionKey === drd.key
            );
          }

          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  copyToClipboard(value: string, field: string): void {
    navigator.clipboard.writeText(value).then(() => {
      this.copiedField = field;
      setTimeout(() => {
        this.copiedField = null;
        this.cdr.detectChanges();
      }, 2000);
      this.cdr.detectChanges();
    });
  }

  isCopied(field: string): boolean {
    return this.copiedField === field;
  }

  toggleDrdExpand(): void {
    this.isDrdExpanded = !this.isDrdExpanded;
    this.cdr.detectChanges();
  }
}
