import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef,
  DestroyRef, inject, signal, computed, effect, untracked, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faExchangeAlt } from '@fortawesome/free-solid-svg-icons';
import { forkJoin, switchMap, of, Subject, debounceTime, catchError, filter, tap } from 'rxjs';

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { CockpitService, ActivityStatistics } from '../../../../services/cockpit.service';
import { ProcessDefinitionService, ProcessDefinition } from '../../../../services/process-definition.service';
import { MigrationService } from '../../../../services/migration.service';
import { MigrationPlanDto, MigrationPlanReportDto, MigrationInstructionDto } from '../../../../services/migration.model';
import { calculateMigrationBadges } from '../../../../services/migration-badge.utils';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { BatchWizardStepperComponent, WizardStep } from '../../cockpit-batch/batch-wizard-stepper/batch-wizard-stepper';
import { BpmnViewerComponent, ActivityBadge } from '../../../../shared/bpmn-viewer/bpmn-viewer';
import { MigrationArrowsComponent, RouteParams } from './migration-arrows.component';
import { Anchor, getAnchorKey } from './migration-arrow-anchors';
import { MigrationUndoToastService } from './migration-undo-toast.service';
import { snapshotMapping, restoreMapping, MigrationState } from './migration-undo-utils';
import { ViewChild } from '@angular/core';

type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

const ENABLE_CONNECTION_EDITOR_SPIKE = false;

@Component({
  selector: 'app-process-migration-wizard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
    CockpitHeaderComponent,
    TranslatePipe,
    BatchWizardStepperComponent,
    BpmnViewerComponent,
    MigrationArrowsComponent
  ],
  templateUrl: './process-migration-wizard.component.html',
  styleUrl: './process-migration-wizard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MigrationUndoToastService]
})
export class ProcessMigrationWizardComponent implements OnInit, OnDestroy {
  @ViewChild(MigrationArrowsComponent) migrationArrowsComponent?: MigrationArrowsComponent;

  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);
  private cockpitService = inject(CockpitService);
  private processDefinitionService = inject(ProcessDefinitionService);
  private migrationService = inject(MigrationService);
  private cdr = inject(ChangeDetectorRef);
  undoToastService = inject(MigrationUndoToastService);

  faExchangeAlt = faExchangeAlt;

  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Processes', translateKey: 'cockpit.menu.processes' }
  ];

  wizardSteps: WizardStep[] = [
    { number: 1, labelKey: 'migration.steps.defineMapping' },
    { number: 2, labelKey: 'migration.steps.setVariables' },
    { number: 3, labelKey: 'migration.steps.selectInstances' },
    { number: 4, labelKey: 'migration.steps.confirm' },
    { number: 5, labelKey: 'migration.steps.results' }
  ];

  currentStep = signal(1);
  loadingState = signal<LoadingState>('loading');
  errorMessage = signal<string | null>(null);

  // All process definitions loaded
  private allDefinitions = signal<ProcessDefinition[]>([]);

  // Available unique keys sorted
  availableKeys = computed(() => {
    const defs = this.allDefinitions();
    const keys = [...new Set(defs.map(d => d.key))];
    return keys.sort();
  });

  // Source selectors
  sourceKey = signal('');
  sourceVersion = signal<number | null>(null);
  sourceDefinitionId = signal<string | null>(null);

  sourceVersions = computed(() => {
    const key = this.sourceKey();
    if (!key) return [];
    const defs = this.allDefinitions().filter(d => d.key === key);
    return defs.sort((a, b) => b.version - a.version);
  });

  // Target selectors
  targetKey = signal('');
  targetVersion = signal<number | null>(null);
  targetDefinitionId = signal<string | null>(null);

  targetVersions = computed(() => {
    const key = this.targetKey();
    if (!key) return [];
    const defs = this.allDefinitions().filter(d => d.key === key);
    return defs.sort((a, b) => b.version - a.version);
  });

  // BPMN XML
  sourceXml = signal<string | null>(null);
  targetXml = signal<string | null>(null);
  sourceXmlLoading = signal(false);
  targetXmlLoading = signal(false);

  // Activity statistics for badges (source only)
  sourceActivityStats = signal<ActivityStatistics[]>([]);

  sourceActivityBadges = computed<ActivityBadge[]>(() => {
    const stats = this.sourceActivityStats();
    const plan = this.migrationPlan();
    const report = this.migrationReport();

    // Calculate instance badges (blue - hide when 0)
    const instanceBadges = stats
      .filter(stat => stat.instances > 0)
      .map(stat => ({
        activityId: stat.id,
        instances: stat.instances
      }));

    // Calculate migration status badges
    const migrationBadges = calculateMigrationBadges(plan, report, stats);
    const migrationBadgeMap = new Map(
      migrationBadges.sourceBadges.map(b => [b.activityId, b])
    );

    // Merge badges by activity ID
    const badgeMap = new Map<string, ActivityBadge>();

    // Add instance badges
    instanceBadges.forEach(badge => {
      badgeMap.set(badge.activityId, { ...badge });
    });

    // Add/merge migration badges
    migrationBadgeMap.forEach((migBadge, activityId) => {
      const existing = badgeMap.get(activityId);
      if (existing) {
        existing.migrationStatus = migBadge.type;
        existing.tooltip = migBadge.tooltip;
      } else {
        badgeMap.set(activityId, {
          activityId,
          migrationStatus: migBadge.type,
          tooltip: migBadge.tooltip
        });
      }
    });

    return Array.from(badgeMap.values());
  });

  targetActivityBadges = computed<ActivityBadge[]>(() => {
    const plan = this.migrationPlan();
    const report = this.migrationReport();
    const stats = this.sourceActivityStats(); // needed for calculation

    const migrationBadges = calculateMigrationBadges(plan, report, stats);

    return migrationBadges.targetBadges.map(b => ({
      activityId: b.activityId,
      migrationStatus: b.type,
      tooltip: b.tooltip
    }));
  });

  // Migration plan
  migrationPlan = signal<MigrationPlanDto | null>(null);
  migrationReport = signal<MigrationPlanReportDto | null>(null);
  planLoading = signal(false);

  // Editable instructions for manual mapping
  editableInstructions = signal<MigrationInstructionDto[]>([]);

  customAnchors = signal<Map<string, RouteParams>>(new Map());

  hoveredSourceActivityId = signal<string | null>(null);
  hoveredTargetActivityId = signal<string | null>(null);

  hoveredRemoveButtonSource = signal<Set<string>>(new Set());

  // Mapping mode state
  mappingMode = signal(false);
  mappingSourceActivityId = signal<string | null>(null);

  // Debounced validation subject
  private validateSubject = new Subject<MigrationPlanDto>();

  // Reactive subjects for definition changes
  private sourceDefinitionChangeSubject = new Subject<string | null>();
  private targetDefinitionChangeSubject = new Subject<string | null>();
  private planGenerationSubject = new Subject<{ sourceId: string; targetId: string }>();

  // Plan generation error
  planGenerationError = signal<string | null>(null);

  // Escape key listener for mapping mode
  private escapeKeyListener: ((event: KeyboardEvent) => void) | null = null;

  // Check if source and target are identical
  isSourceTargetIdentical = computed(() => {
    const sourceId = this.sourceDefinitionId();
    const targetId = this.targetDefinitionId();
    return sourceId !== null && targetId !== null && sourceId === targetId;
  });

  // Plan is valid if report has no failures and source !== target
  isPlanValid = computed(() => {
    if (this.isSourceTargetIdentical()) return false;
    const report = this.migrationReport();
    if (!report) return false;
    return !report.instructionReports || report.instructionReports.every(r => !r.failures || r.failures.length === 0);
  });

  // UI controls
  showMigrationPlan = true;
  linkDiagramsNavigation = false;

  // Computed for enabling mapping buttons
  enableMappingButtons = computed(() => !!(this.sourceDefinitionId() && this.targetDefinitionId()));

  // Effect to dismiss toast when context changes (source/target/step)
  private dismissToastOnContextChange = effect(() => {
    // Track these signals to trigger effect on change
    this.sourceDefinitionId();
    this.targetDefinitionId();
    this.currentStep();

    // Dismiss toast if visible (untracked to avoid circular dependency)
    untracked(() => {
      if (this.undoToastService.toastState().visible) {
        this.undoToastService.dismiss();
      }
    });
  });

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS);
    this.loadProcessDefinitions();

    // Setup debounced validation
    this.validateSubject
      .pipe(
        debounceTime(250),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(plan => {
        this.validateMigrationPlan(plan);
      });

    // Setup source diagram loading pipeline
    this.sourceDefinitionChangeSubject
      .pipe(
        tap(() => {
          this.sourceXmlLoading.set(true);
          this.sourceXml.set(null);
          this.sourceActivityStats.set([]);
        }),
        switchMap(defId =>
          defId
            ? forkJoin({
                xml: this.processDefinitionService.getBpmn20Xml(defId),
                stats: this.processDefinitionService.getActivityStatistics(defId, true),
                defId: of(defId)
              }).pipe(
                catchError(() => of(null)),
                filter(result => result !== null && result.defId === this.sourceDefinitionId())
              )
            : of(null)
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(result => {
        if (result) {
          this.sourceXml.set(result.xml?.bpmn20Xml || null);
          this.sourceActivityStats.set(result.stats);
        }
        this.sourceXmlLoading.set(false);
        this.cdr.markForCheck();
      });

    // Setup target diagram loading pipeline
    this.targetDefinitionChangeSubject
      .pipe(
        tap(() => {
          this.targetXmlLoading.set(true);
          this.targetXml.set(null);
        }),
        switchMap(defId =>
          defId
            ? this.processDefinitionService.getBpmn20Xml(defId).pipe(
                catchError(() => of(null)),
                filter(() => defId === this.targetDefinitionId())
              )
            : of(null)
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(xml => {
        if (xml) {
          this.targetXml.set(xml.bpmn20Xml || null);
        }
        this.targetXmlLoading.set(false);
        this.cdr.markForCheck();
      });

    // Setup plan generation pipeline
    this.planGenerationSubject
      .pipe(
        tap(() => {
          this.planLoading.set(true);
          this.planGenerationError.set(null);
        }),
        switchMap(({ sourceId, targetId }) =>
          this.migrationService.generateMigrationPlan({
            sourceProcessDefinitionId: sourceId,
            targetProcessDefinitionId: targetId
          }).pipe(
            catchError(() => {
              this.planGenerationError.set('migration.errorGeneratingPlan');
              this.migrationPlan.set(null);
              this.migrationReport.set(null);
              this.editableInstructions.set([]);
              this.planLoading.set(false);
              this.cdr.markForCheck();
              return of(null);
            }),
            tap(plan => {
              const currentSource = this.sourceDefinitionId();
              const currentTarget = this.targetDefinitionId();
              if (plan && currentSource === sourceId && currentTarget === targetId) {
                // Valid response for current selection
              } else if (currentSource !== sourceId || currentTarget !== targetId) {
                // Discard late response
                return;
              }
            })
          )
        ),
        filter(plan => {
          const currentSource = this.sourceDefinitionId();
          const currentTarget = this.targetDefinitionId();
          return plan !== null && plan.sourceProcessDefinitionId === currentSource && plan.targetProcessDefinitionId === currentTarget;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(plan => {
        this.migrationPlan.set(plan);
        if (plan && plan.instructions) {
          // Apply updateEventTrigger flags based on BPMN analysis
          const instructionsWithFlags = this.applyUpdateEventTriggerFlags(plan.instructions);
          this.editableInstructions.set(instructionsWithFlags);

          // Update plan with flags for validation
          const planWithFlags = { ...plan, instructions: instructionsWithFlags };
          this.validateMigrationPlan(planWithFlags);
        } else {
          this.editableInstructions.set([]);
          this.planLoading.set(false);
        }
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
    this.removeEscapeKeyListener();
  }

  private loadProcessDefinitions(): void {
    this.loadingState.set('loading');
    this.processDefinitionService.getProcessDefinitionsStatisticsRaw()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          const defs = stats.map(s => s.definition);
          this.allDefinitions.set(defs);
          this.loadingState.set('loaded');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingState.set('error');
          this.errorMessage.set(err.message || 'Failed to load process definitions');
          this.cdr.markForCheck();
        }
      });
  }

  private resetDerivedState(): void {
    this.mappingMode.set(false);
    this.mappingSourceActivityId.set(null);
    this.removeEscapeKeyListener();
    this.editableInstructions.set([]);
    this.customAnchors.set(new Map());
    this.migrationPlan.set(null);
    this.migrationReport.set(null);
    this.planGenerationError.set(null);

    // Reset hover state (prevents leaks when changing versions)
    this.hoveredSourceActivityId.set(null);
    this.hoveredTargetActivityId.set(null);
    this.hoveredRemoveButtonSource.set(new Set());

    // Reset downstream wizard steps
    this.resetDownstream();
  }

  /**
   * Reset all downstream wizard state (steps 2-5).
   * Called whenever the source or target definition changes.
   * This ensures that instance selection, variables, confirmation options,
   * and execution results are cleared when the migration plan changes.
   */
  private resetDownstream(): void {
    this.currentStep.set(1);
  }

  /**
   * Determine if an activity should have updateEventTrigger = true.
   * According to Camunda 7.24 docs: "By default, the update event trigger flag in cockpit migration
   * is set for activities with message references"
   * This includes:
   * - Message boundary events (interrupting and non-interrupting)
   * - Message intermediate catch events
   * - Receive tasks
   */
  private shouldUpdateEventTrigger(activityId: string, sourceXml: string): boolean {
    if (!sourceXml) return false;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(sourceXml, 'text/xml');

      const element = doc.querySelector(`[id="${activityId}"]`);
      if (!element) return false;

      const tagName = element.tagName;

      if (tagName.includes('receiveTask')) {
        return true;
      }

      if (tagName.includes('boundaryEvent') || tagName.includes('intermediateCatchEvent')) {
        const messageEventDef = element.querySelector('messageEventDefinition');
        if (messageEventDef) {
          return true;
        }
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Apply updateEventTrigger flag to instructions based on source BPMN analysis
   */
  private applyUpdateEventTriggerFlags(instructions: MigrationInstructionDto[]): MigrationInstructionDto[] {
    const sourceXml = this.sourceXml();
    if (!sourceXml) return instructions;

    return instructions.map(instr => ({
      ...instr,
      updateEventTrigger: instr.sourceActivityIds.some(activityId =>
        this.shouldUpdateEventTrigger(activityId, sourceXml)
      )
    }));
  }

  onSourceKeyChange(key: string): void {
    const prevKey = this.sourceKey();

    if (key === prevKey) {
      return;
    }

    this.sourceKey.set(key);
    this.sourceVersion.set(null);
    const prevDefId = this.sourceDefinitionId();
    this.sourceDefinitionId.set(null);

    this.resetDerivedState();

    this.sourceDefinitionChangeSubject.next(null);

    if (key) {
      const versions = this.sourceVersions();
      if (versions.length > 0) {
        const mostRecent = versions[0];
        this.onSourceVersionChange(mostRecent.version);
      }
    }
  }

  onSourceVersionChange(version: number): void {
    this.sourceVersion.set(version);
    const def = this.sourceVersions().find(d => d.version === version);
    const defId = def?.id || null;
    const prevDefId = this.sourceDefinitionId();

    if (defId === prevDefId) {
      return;
    }

    this.sourceDefinitionId.set(defId);
    this.resetDerivedState();
    this.sourceDefinitionChangeSubject.next(defId);
    this.triggerPlanGeneration();
  }


  onTargetKeyChange(key: string): void {
    const prevKey = this.targetKey();

    if (key === prevKey) {
      return;
    }

    this.targetKey.set(key);
    this.targetVersion.set(null);
    const prevDefId = this.targetDefinitionId();
    this.targetDefinitionId.set(null);

    this.resetDerivedState();

    this.targetDefinitionChangeSubject.next(null);

    if (key) {
      const versions = this.targetVersions();
      if (versions.length > 0) {
        const mostRecent = versions[0];
        this.onTargetVersionChange(mostRecent.version);
      }
    }
  }

  onTargetVersionChange(version: number): void {
    this.targetVersion.set(version);
    const def = this.targetVersions().find(d => d.version === version);
    const defId = def?.id || null;
    const prevDefId = this.targetDefinitionId();

    if (defId === prevDefId) {
      return;
    }

    this.targetDefinitionId.set(defId);
    this.resetDerivedState();
    this.targetDefinitionChangeSubject.next(defId);
    this.triggerPlanGeneration();
  }

  private triggerPlanGeneration(): void {
    const sourceId = this.sourceDefinitionId();
    const targetId = this.targetDefinitionId();

    if (!sourceId || !targetId) {
      return;
    }

    if (sourceId === targetId) {
      this.planGenerationError.set('migration.identicalSourceTarget');
      this.migrationPlan.set(null);
      this.migrationReport.set(null);
      this.editableInstructions.set([]);
      return;
    }
    this.planGenerationSubject.next({ sourceId, targetId });
  }


  private validateMigrationPlan(plan: MigrationPlanDto): void {
    this.migrationService.validateMigrationPlan(plan)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          this.migrationReport.set(report);
          this.planLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.planLoading.set(false);
          this.cdr.markForCheck();
        }
      });
  }

  mappedSourceActivityIds = computed(() => {
    const mapped = new Set<string>();
    this.editableInstructions().forEach(instr => {
      instr.sourceActivityIds.forEach(id => mapped.add(id));
    });
    return mapped;
  });

  mappedTargetActivityIds = computed(() => {
    const mapped = new Set<string>();
    this.editableInstructions().forEach(instr => {
      instr.targetActivityIds.forEach(id => mapped.add(id));
    });
    return mapped;
  });

  onCreateMapping(sourceActivityId: string): void {
    this.mappingMode.set(true);
    this.mappingSourceActivityId.set(sourceActivityId);

    this.setupEscapeKeyListener();
  }

  onCancelMapping(): void {
    this.mappingMode.set(false);
    this.mappingSourceActivityId.set(null);

    this.removeEscapeKeyListener();
  }

  private setupEscapeKeyListener(): void {
    this.removeEscapeKeyListener();
    this.escapeKeyListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.onCancelMapping();
        this.cdr.markForCheck();
      }
    };

    document.addEventListener('keydown', this.escapeKeyListener, true);
  }

  private removeEscapeKeyListener(): void {
    if (this.escapeKeyListener) {
      document.removeEventListener('keydown', this.escapeKeyListener, true);
      this.escapeKeyListener = null;
    }
  }

  onSelectTarget(targetActivityId: string): void {
    const sourceId = this.mappingSourceActivityId();
    if (!sourceId) return;

    const newInstruction: MigrationInstructionDto = {
      sourceActivityIds: [sourceId],
      targetActivityIds: [targetActivityId],
      updateEventTrigger: false
    };

    const current = this.editableInstructions();
    this.editableInstructions.set([...current, newInstruction]);

    const plan = this.migrationPlan();
    if (plan) {
      const updatedPlan = {
        ...plan,
        instructions: this.editableInstructions()
      };
      this.migrationPlan.set(updatedPlan);
      this.validateSubject.next(updatedPlan);
    }

    this.mappingMode.set(false);
    this.mappingSourceActivityId.set(null);
    this.removeEscapeKeyListener();
  }

  onDeleteMapping(sourceActivityId: string): void {
    const current = this.editableInstructions();
    const instruction = current.find(instr => instr.sourceActivityIds.includes(sourceActivityId));

    if (!instruction) {
      return;
    }

    // Create snapshot before deletion for undo
    const key = this.getInstructionKey(instruction);
    const state: MigrationState = {
      editableInstructions: current,
      customAnchors: this.customAnchors()
    };
    const snapshot = snapshotMapping(state, key);

    if (!snapshot) {
      return;
    }

    // Perform deletion
    const filtered = current.filter(instr => !instr.sourceActivityIds.includes(sourceActivityId));
    this.editableInstructions.set(filtered);

    const anchors = this.customAnchors();
    if (anchors.has(key)) {
      const newAnchors = new Map(anchors);
      newAnchors.delete(key);
      this.customAnchors.set(newAnchors);
    }

    const plan = this.migrationPlan();
    if (plan) {
      const updatedPlan = {
        ...plan,
        instructions: filtered
      };
      this.migrationPlan.set(updatedPlan);
      this.validateSubject.next(updatedPlan);
    }
    this.hoveredSourceActivityId.set(null);
    this.hoveredTargetActivityId.set(null);
    this.hoveredRemoveButtonSource.set(new Set());

    this.undoToastService.show(snapshot);
  }

  onUndoDeleteMapping(): void {
    const snapshot = this.undoToastService.getCurrentSnapshot();
    if (!snapshot) {
      return;
    }

    const state: MigrationState = {
      editableInstructions: [...this.editableInstructions()],
      customAnchors: new Map(this.customAnchors())
    };

    restoreMapping(state, snapshot);

    this.editableInstructions.set(state.editableInstructions);
    this.customAnchors.set(state.customAnchors);

    const plan = this.migrationPlan();
    if (plan) {
      const updatedPlan = {
        ...plan,
        instructions: state.editableInstructions
      };
      this.migrationPlan.set(updatedPlan);
      this.validateSubject.next(updatedPlan);
    }

    this.hoveredSourceActivityId.set(null);
    this.hoveredTargetActivityId.set(null);
    this.hoveredRemoveButtonSource.set(new Set());

    this.undoToastService.dismiss();
  }

  /**
   * Gets a unique key for an instruction based on its source and target activities.
   */
  private getInstructionKey(instruction: MigrationInstructionDto): string {
    return getAnchorKey(instruction.sourceActivityIds[0], instruction.targetActivityIds[0]);
  }

  /**
   * Handles anchor changes from migration arrows component.
   * Updates customAnchors signal with new Map to trigger change detection.
   */
  onAnchorsChanged(newMap: Map<string, RouteParams>): void {
    this.customAnchors.set(newMap);
  }

  onSelectMappedActivity(sourceActivityId: string): void {
    if (this.migrationArrowsComponent) {
      this.migrationArrowsComponent.selectArrowBySourceActivity(sourceActivityId);
    }
  }

  onArrowHover(event: string | null): void {
    if (event) {
      // When hovering arrow, show remove button on SOURCE only (never on target)
      const instruction = this.editableInstructions().find((instr: any) => {
        return instr.sourceActivityIds?.[0] === event;
      });

      if (instruction) {
        const sourceId = instruction.sourceActivityIds?.[0];
        const targetId = instruction.targetActivityIds?.[0];

        // Set hovered activity IDs for both sides (for visual feedback - blue halo)
        this.hoveredSourceActivityId.set(sourceId || null);
        this.hoveredTargetActivityId.set(targetId || null);

        // Show remove button on SOURCE only
        const sourceSet = new Set<string>();
        if (sourceId) sourceSet.add(sourceId);
        this.hoveredRemoveButtonSource.set(sourceSet);
      } else {
        this.hoveredSourceActivityId.set(null);
        this.hoveredTargetActivityId.set(null);
        this.hoveredRemoveButtonSource.set(new Set());
      }
    } else {
      this.hoveredSourceActivityId.set(null);
      this.hoveredTargetActivityId.set(null);
      this.hoveredRemoveButtonSource.set(new Set());
    }
  }

  onElementHover(event: any): void {
    // Handle both old format (BpmnElement | null) and new format ({side, element})
    // Migration wizard receives new format, but we need to handle backward compatibility
    if (!event || typeof event !== 'object') {
      return;
    }

    // Check if event has 'side' property (new format from migration context)
    const isNewFormat = 'side' in event && 'element' in event;
    if (!isNewFormat) {
      // Old format: event is BpmnElement directly - shouldn't happen in wizard but be defensive
      return;
    }

    const { side, element } = event as { side: 'source' | 'target'; element: { id: string; type: string; name?: string } | null };

    if (!element || this.mappingMode()) {
      // Clear hover state for the relevant side
      if (side === 'source') {
        this.hoveredSourceActivityId.set(null);
        this.hoveredRemoveButtonSource.set(new Set());
      } else {
        // Target side: clear halo, no remove button ever
        this.hoveredTargetActivityId.set(null);
      }
      return;
    }

    // Find if this element is part of a mapping (either source or target)
    const instruction = this.editableInstructions().find((instr: any) => {
      return instr.sourceActivityIds?.includes(element.id) ||
             instr.targetActivityIds?.includes(element.id);
    });

    if (instruction) {
      const sourceId = instruction.sourceActivityIds?.[0];
      const targetId = instruction.targetActivityIds?.[0];

      // Set hovered activity ID for visual feedback (blue halo)
      // Remove button appears ONLY on SOURCE, never on TARGET
      if (side === 'source') {
        this.hoveredSourceActivityId.set(sourceId || null);
        this.hoveredRemoveButtonSource.set(new Set([element.id]));
        // Don't modify target side
      } else {
        // Target side: show blue halo on linked source, but NO remove button
        this.hoveredTargetActivityId.set(targetId || null);
        // hoveredRemoveButtonSource stays unchanged (no button on target)
      }
    } else {
      // Not mapped - clear hover state for this side only
      if (side === 'source') {
        this.hoveredSourceActivityId.set(null);
        this.hoveredRemoveButtonSource.set(new Set());
      } else {
        // Target side: just clear halo, no remove button to clear
        this.hoveredTargetActivityId.set(null);
      }
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Delete' && event.key !== 'Suppr') return;

    // Don't trigger if focus is in an input element
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.getAttribute('contenteditable') === 'true'
    )) {
      return;
    }

    // Check if an arrow is selected via migration arrows component
    const selectedIndex = this.migrationArrowsComponent?.selectedArrowIndex();
    if (selectedIndex !== null && selectedIndex !== undefined && selectedIndex >= 0) {
      const instructions = this.editableInstructions();
      if (instructions && instructions[selectedIndex]) {
        const instruction = instructions[selectedIndex];
        const sourceActivityId = instruction.sourceActivityIds[0];
        if (sourceActivityId) {
          event.preventDefault();
          this.onDeleteMapping(sourceActivityId);
        }
      }
    }
  }
}