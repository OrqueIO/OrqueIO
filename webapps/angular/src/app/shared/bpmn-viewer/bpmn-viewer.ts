import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  AfterViewInit,
  HostListener,
  ChangeDetectorRef,
  ViewEncapsulation,
  inject,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';

export const EXPAND_DIAGRAM_STATE_KEY = 'expandDiagram' as const;

export interface ParentBreadcrumb {
  link: any[];
  queryParams?: Record<string, string> | null;
  label: string;
  currentLabel: string;
}

// @ts-ignore - bpmn-js doesn't have types
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';

export interface ActivityBadge {
  activityId: string;
  instances?: number;
  incidents?: number;
  migrationStatus?: 'valid' | 'invalid' | 'unmapped';
  tooltip?: string;
}

export interface BpmnElement {
  id: string;
  type: string;
  name?: string;
  isInEventSubprocessScope?: boolean;
  isInMultiInstanceScope?: boolean;
}

export interface CallActivityClickEvent {
  callActivityId: string;
  calledElement: string | null;
}

@Component({
  selector: 'app-bpmn-viewer',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './bpmn-viewer.html',
  styleUrls: ['./bpmn-viewer.css'],
  encapsulation: ViewEncapsulation.None
})
export class BpmnViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLDivElement>;

  @Input() xml: string | null = null;
  @Input() highlightedActivities: string[] = [];
  @Input() runningActivities: string[] = [];
  @Input() activityBadges: ActivityBadge[] = [];
  @Input() selectedActivity: string | null = null;
  @Input() showExpandButton = false;
  @Input() isExpanded = false;
  @Input() showFocusButton = false;
  @Input() focusElementId: string | null | undefined = null;
  @Input() enableCallActivityNavigation = false;
  @Input() callActivityIdsWithInstances: Set<string> = new Set();
  @Input() parentBreadcrumb: ParentBreadcrumb | null = null;

  // Migration mapping mode
  @Input() enableMappingButtons = false;
  @Input() mappedActivityIds: Set<string> = new Set();
  @Input() mappingMode = false;
  @Input() highlightTargets = false;
  @Input() migrationReport: any = null;
  @Input() editableInstructions: any[] = [];

  get expandState(): Record<string, boolean> {
    return { [EXPAND_DIAGRAM_STATE_KEY]: this.isExpanded };
  }

  @Output() elementClick = new EventEmitter<BpmnElement>();
  @Output() elementHover = new EventEmitter<BpmnElement | null>();
  @Output() viewerReady = new EventEmitter<void>();

  // Migration mapping events
  @Output() createMapping = new EventEmitter<string>();
  @Output() deleteMapping = new EventEmitter<string>();
  @Output() selectTarget = new EventEmitter<string>();
  @Output() error = new EventEmitter<Error>();
  @Output() expandToggle = new EventEmitter<void>();
  @Output() focusClick = new EventEmitter<void>();
  @Output() callActivityClick = new EventEmitter<CallActivityClickEvent>();

  private viewer: any = null;
  private overlays: any = null;
  private isViewerReady = false;
  private badgeOverlayIds: Map<string, string[]> = new Map();
  private callActivityOverlayIds: string[] = [];
  private callActivityErrorOverlayIds: string[] = [];
  private correlateOverlayIds: string[] = [];
  private correlateOverlayData: Map<string, { btn: HTMLButtonElement; elementId: string; anchorId: string; hideTimer: ReturnType<typeof setTimeout> | null }> = new Map();
  private correlateHoverListeners: Array<() => void> = [];

  // Migration mapping overlays
  private mappingOverlayIds: string[] = [];
  private targetHighlightOverlayIds: string[] = [];
  // PERMANENT OVERLAYS FIX: Maps as class properties to prevent race conditions
  private buttonContainers: Map<string, HTMLElement> = new Map();
  private hideTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // Migration badge popover
  private activePopover: HTMLElement | null = null;
  private popoverCleanup: (() => void) | null = null;
  private currentXml: string | null = null;
  private needsZoomFit = false;
  private resizeTimeout: ReturnType<typeof setTimeout> | null = null;
  private activeRunningMarkers = new Set<string>();
  private activeHighlightMarkers = new Set<string>();
  private activeSelectionMarker: string | null = null;
  private subprocessStack: { id: string; name: string; element: any }[] = [];
  private currentRootElement: any = null;

  faArrowUp = faArrowUp;
  loading = true;
  subprocessBreadcrumb: string[] = [];
  private windowStart = 0;
  errorMessage: string | null = null;

  get visibleBreadcrumbItems(): Array<{ name: string; index: number | null; isEllipsis: boolean; isRightEllipsis?: boolean }> {
    const items = this.subprocessBreadcrumb;
    const n = items.length;
    if (n <= 5) {
      return items.map((name, i) => ({ name, index: i < n - 1 ? i : null, isEllipsis: false }));
    }
    const winEnd = Math.min(this.windowStart + 2, n - 2);
    const result: Array<{ name: string; index: number | null; isEllipsis: boolean; isRightEllipsis?: boolean }> = [
      { name: items[0], index: 0, isEllipsis: false },
    ];
    if (this.windowStart > 1) {
      result.push({ name: '…', index: null, isEllipsis: true });
    }
    for (let i = this.windowStart; i <= winEnd; i++) {
      result.push({ name: items[i], index: i, isEllipsis: false });
    }
    if (winEnd < n - 2) {
      result.push({ name: '…', index: null, isEllipsis: false, isRightEllipsis: true });
    }
    result.push({ name: items[n - 1], index: null, isEllipsis: false });
    return result;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = setTimeout(() => {
      this.resize();
    }, 200);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.mappingMode) {
      this.ngZone.run(() => {
        this.createMapping.emit('');
      });
    }
  }

  ngAfterViewInit(): void {
    this.initViewer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['xml'] && this.xml && this.isViewerReady) {
      if (this.xml !== this.currentXml) {
        this.loadDiagram();
      }
    }
    if (changes['highlightedActivities'] && this.isViewerReady && this.currentXml) {
      this.updateHighlights();
    }
    if (changes['runningActivities'] && this.isViewerReady && this.currentXml) {
      this.updateRunningMarkers();
    }
    if (changes['activityBadges'] && this.isViewerReady && this.currentXml) {
      this.updateBadges();
    }
    if (changes['selectedActivity'] && this.isViewerReady && this.currentXml) {
      this.updateSelection();
    }
    if (changes['enableCallActivityNavigation'] && this.isViewerReady && this.currentXml) {
      if (this.enableCallActivityNavigation) {
        this.addCallActivityOverlays();
      } else {
        this.clearCallActivityOverlays();
      }
    }
    if (changes['callActivityIdsWithInstances'] && this.isViewerReady && this.currentXml && this.enableCallActivityNavigation) {
      this.addCallActivityOverlays();
    }
    if ((changes['enableMappingButtons'] || changes['mappedActivityIds']) && this.isViewerReady && this.currentXml) {
      this.updateMappingButtons();
    }
    if ((changes['mappingMode'] || changes['highlightTargets']) && this.isViewerReady && this.currentXml) {
      this.updateTargetHighlights();
    }
  }

  ngOnDestroy(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.destroyViewer();
  }

  private initViewer(): void {
    if (this.viewer) {
      return;
    }

    this.viewer = new NavigatedViewer({
      container: this.canvasRef.nativeElement,
      keyboard: { bindTo: document }
    });

    this.overlays = this.viewer.get('overlays');

    // Register event handlers
    const eventBus = this.viewer.get('eventBus');

    // Wire import.done to apply all visual updates AFTER diagram is loaded
    eventBus.on('import.done', () => {
      this.updateHighlights();
      this.updateRunningMarkers();
      this.updateBadges();
      this.updateSelection();
      if (this.enableCallActivityNavigation) {
        this.addCallActivityOverlays();
      }
      if (this.enableMappingButtons) {
        this.updateMappingButtons();
      }
      if (this.highlightTargets) {
        this.updateTargetHighlights();
      }
      this.styleCollapsedSubprocessOverlays();
    });

    eventBus.on('element.click', (event: any) => {
      const element = event.element;
      if (element && element.id && element.type !== 'bpmn:Process') {
        this.elementClick.emit({
          id: element.id,
          type: element.type,
          name: element.businessObject?.name,
          isInEventSubprocessScope: this.checkEventSubprocessScope(element),
          isInMultiInstanceScope: this.checkMultiInstanceScope(element)
        });
      }
    });

    eventBus.on('element.hover', (event: any) => {
      const element = event.element;
      if (element && element.id && element.type !== 'bpmn:Process') {
        this.elementHover.emit({
          id: element.id,
          type: element.type,
          name: element.businessObject?.name
        });
      }
    });

    eventBus.on('element.out', () => {
      this.elementHover.emit(null);
    });

    // Re-center diagram on collapsed subprocess drilldown navigation.
    // bpmn-js fires root.set when the canvas root changes (drill-in or drill-out)
    // without re-importing XML, so importXML / ngOnChanges never trigger the fit.
    eventBus.on('root.set', (event: any) => {
      this.updateSubprocessStack(event.element);
      this.needsZoomFit = true;
      this.scheduleFitToViewport();
    });

    this.isViewerReady = true;

    if (this.xml) {
      this.loadDiagram();
    }
  }

  private isContainerVisible(): boolean {
    const container = this.canvasRef?.nativeElement;
    if (!container) return false;
    const rect = container.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  private scheduleFitToViewport(retryCount = 0): void {
    const maxRetries = 5;
    const retryDelay = 100; // ms

    requestAnimationFrame(() => {
      if (!this.viewer || !this.needsZoomFit) return;

      if (this.isContainerVisible()) {
        try {
          const canvas = this.viewer.get('canvas');
          canvas.resized();
          this.safeZoomFit(canvas);
          this.needsZoomFit = false;
        } catch (e) {
          if (retryCount < maxRetries) {
            setTimeout(() => {
              this.scheduleFitToViewport(retryCount + 1);
            }, retryDelay);
          }
        }
      } else if (retryCount < maxRetries) {
        setTimeout(() => {
          this.scheduleFitToViewport(retryCount + 1);
        }, retryDelay);
      }
    });
  }

  private async loadDiagram(): Promise<void> {
    if (!this.viewer || !this.xml) {
      return;
    }

    // Skip if same XML already loaded
    if (this.xml === this.currentXml) {
      return;
    }

    this.loading = true;
    this.errorMessage = null;
    this.subprocessStack = [];
    this.currentRootElement = null;
    this.subprocessBreadcrumb = [];
    this.windowStart = 0;
    this.activeRunningMarkers.clear();
    this.activeHighlightMarkers.clear();
    this.activeSelectionMarker = null;
    this.cdr.detectChanges();

    try {
      const result = await this.viewer.importXML(this.xml);

      // Store current XML to avoid re-import
      this.currentXml = this.xml;

      if (result.warnings && result.warnings.length > 0) {
        console.warn('BPMN import warnings:', result.warnings);
      }

      // Fit diagram to viewport
      this.needsZoomFit = true;
      this.scheduleFitToViewport();

      this.loading = false;
      this.cdr.detectChanges();
      this.viewerReady.emit();

      // Visual updates are now triggered by import.done event
    } catch (err: any) {
      this.loading = false;
      this.currentXml = null;
      this.errorMessage = err.message || 'Failed to load BPMN diagram';
      this.cdr.detectChanges();
      this.error.emit(err);
      console.error('BPMN import error:', err);
    }
  }

  private updateHighlights(): void {
    if (!this.viewer) return;
    if (this.activeHighlightMarkers.size === 0 && this.highlightedActivities.length === 0) return;

    const canvas = this.viewer.get('canvas');
    const elementRegistry = this.viewer.get('elementRegistry');

    this.activeHighlightMarkers.forEach(id => {
      try { canvas.removeMarker(id, 'highlight'); } catch (_) {}
    });
    this.activeHighlightMarkers.clear();

    this.highlightedActivities.forEach(activityId => {
      const element = elementRegistry.get(activityId);
      if (element) {
        canvas.addMarker(activityId, 'highlight');
        this.activeHighlightMarkers.add(activityId);
      }
    });
  }

  private updateRunningMarkers(): void {
    if (!this.viewer) return;
    if (this.activeRunningMarkers.size === 0 && this.runningActivities.length === 0) return;

    const canvas = this.viewer.get('canvas');
    const elementRegistry = this.viewer.get('elementRegistry');

    this.activeRunningMarkers.forEach(id => {
      try { canvas.removeMarker(id, 'running'); } catch (_) {}
    });
    this.activeRunningMarkers.clear();

    this.runningActivities.forEach(activityId => {
      const element = elementRegistry.get(activityId);
      if (element) {
        canvas.addMarker(activityId, 'running');
        this.activeRunningMarkers.add(activityId);
      }
    });
  }

  private updateSelection(): void {
    if (!this.viewer) return;
    if (this.activeSelectionMarker === null && !this.selectedActivity) return;

    const canvas = this.viewer.get('canvas');
    const elementRegistry = this.viewer.get('elementRegistry');

    if (this.activeSelectionMarker !== null) {
      try { canvas.removeMarker(this.activeSelectionMarker, 'selected'); } catch (_) {}
      this.activeSelectionMarker = null;
    }

    if (this.selectedActivity) {
      const element = elementRegistry.get(this.selectedActivity);
      if (element) {
        canvas.addMarker(this.selectedActivity, 'selected');
        this.activeSelectionMarker = this.selectedActivity;
      }
    }
  }

  private clearBadgeOverlays(): void {
    this.badgeOverlayIds.forEach((ids) => {
      ids.forEach(id => {
        try {
          this.overlays?.remove(id);
        } catch (e) {
          // Overlay might already be removed
        }
      });
    });
    this.badgeOverlayIds.clear();
  }

  private clearCallActivityOverlays(): void {
    [...this.callActivityOverlayIds, ...this.callActivityErrorOverlayIds].forEach(id => {
      try { this.overlays?.remove(id); } catch (_) {}
    });
    this.callActivityOverlayIds = [];
    this.callActivityErrorOverlayIds = [];
  }

  private clearAllOverlays(): void {
    this.clearBadgeOverlays();
    this.clearCallActivityOverlays();
    this.clearCorrelateOverlays();
  }

  private updateBadges(): void {
    if (!this.viewer || !this.overlays) return;

    // Clear existing badges only (not Call Activity overlays)
    this.clearBadgeOverlays();

    const elementRegistry = this.viewer.get('elementRegistry');

    // Create badges for each activity
    this.activityBadges.forEach(badge => {
      const element = elementRegistry.get(badge.activityId);
      if (!element) return;

      const overlayIds: string[] = [];

      // Instance count badge (blue)
      if (badge.instances && badge.instances > 0) {
        const instanceHtml = document.createElement('div');
        instanceHtml.className = 'bpmn-badge bpmn-badge-instances';
        instanceHtml.innerHTML = `<span>${badge.instances}</span>`;
        instanceHtml.title = `${badge.instances} instance(s)`;

        try {
          const overlayId = this.overlays.add(badge.activityId, {
            position: { top: -12, left: -12 },
            html: instanceHtml
          });
          overlayIds.push(overlayId);
        } catch (e) {
          console.warn('Could not add instance badge', e);
        }
      }

      // Incident count badge (red)
      if (badge.incidents && badge.incidents > 0) {
        const incidentHtml = document.createElement('div');
        incidentHtml.className = 'bpmn-badge bpmn-badge-incidents';
        incidentHtml.innerHTML = `<span>${badge.incidents}</span>`;
        incidentHtml.title = `${badge.incidents} incident(s)`;

        try {
          const overlayId = this.overlays.add(badge.activityId, {
            position: { top: -12, right: -12 },
            html: incidentHtml
          });
          overlayIds.push(overlayId);
        } catch (e) {
          console.warn('Could not add incident badge', e);
        }
      }

      // Migration status badge (top-right) - clickable for valid/invalid
      if (badge.migrationStatus) {
        const statusHtml = document.createElement('button');
        statusHtml.type = 'button';
        let iconSvg = '';
        let className = 'bpmn-badge bpmn-badge-migration';
        const isClickable = badge.migrationStatus === 'valid' || badge.migrationStatus === 'invalid';

        if (badge.migrationStatus === 'valid') {
          className += ' bpmn-badge-migration--valid';
          iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 16 16"><path fill="white" d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>';
        } else if (badge.migrationStatus === 'invalid') {
          className += ' bpmn-badge-migration--invalid';
          iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 16 16"><path fill="white" d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>';
        } else if (badge.migrationStatus === 'unmapped') {
          className += ' bpmn-badge-migration--unmapped';
          iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 16 16"><path fill="white" d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path fill="white" d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>';
        }

        statusHtml.className = className;
        statusHtml.innerHTML = iconSvg;
        if (badge.tooltip) {
          statusHtml.title = badge.tooltip;
        }

        if (isClickable) {
          statusHtml.style.cursor = 'pointer';
          statusHtml.setAttribute('aria-label', badge.migrationStatus === 'valid' ? 'Manage mapping' : 'View mapping errors');

          statusHtml.addEventListener('click', (e) => {
            e.stopPropagation();
            this.ngZone.run(() => {
              this.showMappingPopover(badge.activityId, badge.migrationStatus!, statusHtml, badge);
            });
          });
        } else {
          statusHtml.disabled = true;
          statusHtml.style.cursor = 'default';
        }

        try {
          const overlayId = this.overlays.add(badge.activityId, {
            position: { top: -12, right: -12 },
            html: statusHtml
          });
          overlayIds.push(overlayId);
        } catch (e) {
          console.warn('Could not add migration status badge', e);
        }
      }

      if (overlayIds.length > 0) {
        this.badgeOverlayIds.set(badge.activityId, overlayIds);
      }
    });
  }

  private styleCollapsedSubprocessOverlays(): void {
    const container = this.canvasRef.nativeElement;
    const arrowSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16"><path fill="white" fill-rule="evenodd" d="M4.81801948,3.50735931 L10.4996894,9.1896894 L10.5,4 L12,4 L12,12 L4,12 L4,10.5 L9.6896894,10.4996894 L3.75735931,4.56801948 C3.46446609,4.27512627 3.46446609,3.80025253 3.75735931,3.50735931 C4.05025253,3.21446609 4.52512627,3.21446609 4.81801948,3.50735931 Z"/></svg>';
    container.querySelectorAll<HTMLButtonElement>('.bjs-drilldown:not(.bpmn-call-activity-overlay)').forEach(btn => {
      btn.classList.add('bpmn-subprocess-drilldown');
      btn.innerHTML = arrowSvg;
    });
  }

  private addCallActivityOverlays(): void {
    if (!this.viewer || !this.overlays || !this.enableCallActivityNavigation) return;

    this.clearCallActivityOverlays();

    const elementRegistry = this.viewer.get('elementRegistry');

    elementRegistry.forEach((element: any) => {
      if (element.type !== 'bpmn:CallActivity') return;

      const hasInstances = this.callActivityIdsWithInstances.has(element.id);
      const calledElement: string | null = element.businessObject?.calledElement ?? null;

      // Rule 1: no calledElement and no instances → no icon
      if (!calledElement && !hasInstances) return;

      // Rule 2: EL expression with no instances → gray, non-clickable
      // When instances exist, the icon is always clickable (navigation uses the instance ID, not calledElement)
      const isExpression = !hasInstances && calledElement !== null &&
        (calledElement.includes('${') || calledElement.includes('#{'));

      const btn = document.createElement('button');
      const svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16"><path fill="white" fill-rule="evenodd" d="M7.775 3.275a.75.75 0 001.06 1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z"/></svg>';
      btn.innerHTML = svgIcon;

      if (isExpression) {
        btn.className = 'bjs-drilldown bpmn-call-activity-overlay bpmn-call-activity-overlay--expression';
        btn.title = 'Navigation unavailable: calledElement is a dynamic expression';
        btn.disabled = true;
      } else {
        // Rule 3: static reference or has instances → blue, clickable
        btn.className = 'bjs-drilldown bpmn-call-activity-overlay';
        btn.title = hasInstances ? 'Show Called Process Instances' : 'Go to Called Process Definition';
        btn.addEventListener('click', (e: Event) => {
          e.stopPropagation();
          this.callActivityClick.emit({ callActivityId: element.id, calledElement });
        });
      }

      try {
        const id = this.overlays.add(element.id, {
          position: { bottom: -7, right: -8 },
          html: btn
        });
        this.callActivityOverlayIds.push(id);
      } catch (e) {
        console.warn('Could not add Call Activity overlay to', element.id, e);
      }
    });
  }

  showCallActivityError(activityId: string, message: string): void {
    if (!this.overlays) return;

    const container = document.createElement('div');
    container.className = 'bpmn-call-activity-error';
    container.textContent = message;

    try {
      const overlayId = this.overlays.add(activityId, {
        position: { bottom: -38, left: 0 },
        html: container
      });
      this.callActivityErrorOverlayIds.push(overlayId);

      setTimeout(() => {
        try { this.overlays?.remove(overlayId); } catch (_) {}
        this.callActivityErrorOverlayIds = this.callActivityErrorOverlayIds.filter(id => id !== overlayId);
      }, 3000);
    } catch (e) {
      console.warn('Could not add error overlay to', activityId, e);
    }
  }
  private updateMappingButtons(): void {
    // Clear existing mapping overlays
    this.mappingOverlayIds.forEach(id => {
      try { this.overlays?.remove(id); } catch (_) {}
    });
    this.mappingOverlayIds = [];

    // Clear existing class-level Maps and timeouts
    this.hideTimeouts.forEach(timeout => clearTimeout(timeout));
    this.hideTimeouts.clear();
    this.buttonContainers.clear();

    // Remove old event bus listeners
    if (this.hoverListener) {
      const eventBus = this.viewer?.get('eventBus');
      eventBus?.off('element.hover', this.hoverListener);
      eventBus?.off('element.out', this.outListener!);
      this.hoverListener = null;
      this.outListener = null;
    }

    if (!this.viewer || !this.overlays || !this.enableMappingButtons) return;

    const elementRegistry = this.viewer.get('elementRegistry');
    const eventBus = this.viewer.get('eventBus');
    const allElements = elementRegistry.getAll();

    // Add mapping button overlays to mappable flow nodes (excluding Start/End Events)
    allElements.forEach((element: any) => {
      if (!element.businessObject || element.type === 'label') return;

      // Exclude Start/End Events, SequenceFlow, Process, Participant/Pool, labels, and annotations
      if (element.type === 'bpmn:StartEvent' ||
          element.type === 'bpmn:EndEvent' ||
          element.type === 'bpmn:SequenceFlow' ||
          element.type === 'bpmn:Process' ||
          element.type === 'bpmn:Participant' ||
          element.type === 'bpmn:Collaboration' ||
          element.type.includes('Annotation')) {
        return;
      }

      const isFlowNode = element.type && (
        element.type.includes('Task') ||
        element.type.includes('IntermediateCatchEvent') ||
        element.type.includes('IntermediateThrowEvent') ||
        element.type.includes('BoundaryEvent') ||
        element.type.includes('Gateway') ||
        element.type.includes('SubProcess') ||
        element.type.includes('CallActivity')
      );

      if (!isFlowNode) return;

      const isMapped = this.mappedActivityIds.has(element.id);

      // Create button (only for unmapped activities - mapped will use badge click)
      if (isMapped) return; // Mapped activities use the green badge for control

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bpmn-mapping-button bpmn-mapping-create';

      // SVG arrow-right icon from FontAwesome
      const arrowIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 512"><path fill="currentColor" d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"/></svg>';
      btn.innerHTML = arrowIcon;
      btn.setAttribute('aria-label', 'Map to target');
      btn.title = ''; // Will be set via i18n
      btn.style.cssText = 'width: 24px; height: 24px; background: white; color: #3b82f6; border: 1.5px solid #3b82f6; border-radius: 50%; cursor: pointer; pointer-events: auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.12s ease; padding: 0;';

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.ngZone.run(() => {
          this.createMapping.emit(element.id);
        });
      });

      // Hover effect: blue background, white icon, slight scale
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#3b82f6';
        btn.style.color = 'white';
        btn.style.transform = 'scale(1.1)';
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'white';
        btn.style.color = '#3b82f6';
        btn.style.transform = 'scale(1)';
      });

      // Prevent button from hiding when mouse enters it
      btn.addEventListener('mouseenter', () => {
        const timeout = this.hideTimeouts.get(element.id);
        if (timeout) {
          clearTimeout(timeout);
          this.hideTimeouts.delete(element.id);
        }
      });

      // Hide with delay when mouse leaves button
      btn.addEventListener('mouseleave', () => {
        const timeout = setTimeout(() => {
          container.classList.remove('bpmn-mapping-visible');
          this.hideTimeouts.delete(element.id);
        }, 150);
        this.hideTimeouts.set(element.id, timeout);
      });

      // Container with pointer-events none and hidden class
      const container = document.createElement('div');
      container.style.cssText = 'pointer-events: none;';
      container.className = 'bpmn-mapping-container';
      container.appendChild(btn);

      this.buttonContainers.set(element.id, container);

      try {
        const position = {
          top: element.height - 8,
          right: -8
        };
        const overlayId = this.overlays.add(element.id, {
          position,
          html: container
        });
        this.mappingOverlayIds.push(overlayId);
      } catch (e) {
      }
    });

    this.hoverListener = (event: any) => {
      if (!event.element || this.mappingMode) return;

      const container = this.buttonContainers.get(event.element.id);
      if (container) {
        const timeout = this.hideTimeouts.get(event.element.id);
        if (timeout) {
          clearTimeout(timeout);
          this.hideTimeouts.delete(event.element.id);
        }
        container.classList.add('bpmn-mapping-visible');
      }
    };

    this.outListener = (event: any) => {
      if (!event.element || this.mappingMode) return;

      const container = this.buttonContainers.get(event.element.id);
      if (container) {
        const timeout = setTimeout(() => {
          container.classList.remove('bpmn-mapping-visible');
          this.hideTimeouts.delete(event.element.id);
        }, 150);
        this.hideTimeouts.set(event.element.id, timeout);
      }
    };

    eventBus.on('element.hover', this.hoverListener);
    eventBus.on('element.out', this.outListener);
  }

  private hoverListener: ((event: any) => void) | null = null;
  private outListener: ((event: any) => void) | null = null;

  private updateTargetHighlights(): void {
    this.targetHighlightOverlayIds.forEach(id => {
      try { this.overlays?.remove(id); } catch (_) {}
    });
    this.targetHighlightOverlayIds = [];

    if (!this.viewer || !this.highlightTargets) return;

    const canvas = this.viewer.get('canvas');
    const elementRegistry = this.viewer.get('elementRegistry');
    const allElements = elementRegistry.getAll();

    allElements.forEach((element: any) => {
      if (!element.businessObject || element.type === 'label') return;

      if (element.type === 'bpmn:StartEvent' ||
          element.type === 'bpmn:EndEvent' ||
          element.type === 'bpmn:SequenceFlow' ||
          element.type === 'bpmn:Process' ||
          element.type === 'bpmn:Participant' ||
          element.type === 'bpmn:Collaboration' ||
          element.type.includes('Annotation')) {
        return;
      }

      const isFlowNode = element.type && (
        element.type.includes('Task') ||
        element.type.includes('IntermediateCatchEvent') ||
        element.type.includes('IntermediateThrowEvent') ||
        element.type.includes('BoundaryEvent') ||
        element.type.includes('Gateway') ||
        element.type.includes('SubProcess') ||
        element.type.includes('CallActivity')
      );

      if (!isFlowNode) return;

      try {
        canvas.addMarker(element.id, 'target-highlight');

        const canvasContainer = this.canvasRef.nativeElement;
        const elementNode = canvasContainer.querySelector(`[data-element-id="${element.id}"]`);
        if (elementNode) {
          (elementNode as HTMLElement).style.cursor = 'crosshair';
          const clickHandler = (e: Event) => {
            e.stopPropagation();
            this.ngZone.run(() => {
              this.selectTarget.emit(element.id);
            });
            canvas.removeMarker(element.id, 'target-highlight');
            (elementNode as HTMLElement).style.cursor = '';
            elementNode.removeEventListener('click', clickHandler);
          };
          elementNode.addEventListener('click', clickHandler);
        }
      } catch (e) {
        console.warn('Could not highlight target', element.id, e);
      }
    });

    if (this.mappingMode) {
      const canvasContainer = this.canvasRef.nativeElement.querySelector('.djs-container');
      if (canvasContainer) {
        (canvasContainer as HTMLElement).style.cursor = 'crosshair';
      }
    }
  }

  private showMappingPopover(activityId: string, status: 'valid' | 'invalid' | 'unmapped', anchor: HTMLElement, badge: ActivityBadge): void {
    if (status === 'unmapped') return;
    // Close any existing popover
    this.closeMappingPopover();

    const popover = document.createElement('div');
    popover.className = 'bpmn-mapping-popover';

    const title = document.createElement('div');
    title.className = 'bpmn-mapping-popover__title';
    title.textContent = status === 'valid' ? 'Mapping' : 'Mapping Error';
    popover.appendChild(title);

    if (status === 'invalid') {
      const errorList = document.createElement('div');
      errorList.className = 'bpmn-mapping-popover__errors';

      const failures = this.getFailuresForActivity(activityId);

      if (failures && failures.length > 0) {
        failures.forEach(failure => {
          const errorItem = document.createElement('div');
          errorItem.className = 'bpmn-mapping-popover__error-item';
          errorItem.textContent = failure;
          errorList.appendChild(errorItem);
        });
      } else {
        const errorItem = document.createElement('div');
        errorItem.className = 'bpmn-mapping-popover__error-item';
        errorItem.textContent = 'Unknown validation error';
        errorList.appendChild(errorItem);
      }

      popover.appendChild(errorList);
    }

    if (status === 'valid') {
      const element = this.getElement(activityId);
      if (element && this.isEventType(element.type)) {
        const checkboxContainer = document.createElement('label');
        checkboxContainer.className = 'bpmn-mapping-popover__checkbox';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = this.getUpdateEventTriggerForActivity(activityId);

        checkbox.addEventListener('change', () => {
          this.ngZone.run(() => {
            this.updateEventTrigger(activityId, checkbox.checked);
          });
        });

        const label = document.createElement('span');
        label.textContent = 'Update event trigger';

        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        popover.appendChild(checkboxContainer);
      }
    }

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'bpmn-mapping-popover__remove-btn';
    removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg><span>Remove mapping</span>';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.ngZone.run(() => {
        this.deleteMapping.emit(activityId);
        this.closeMappingPopover();
      });
    });
    popover.appendChild(removeBtn);

    const anchorRect = anchor.getBoundingClientRect();
    const containerRect = this.canvasRef.nativeElement.getBoundingClientRect();

    popover.style.position = 'absolute';
    popover.style.top = `${anchorRect.bottom - containerRect.top + 8}px`;
    popover.style.left = `${anchorRect.left - containerRect.left}px`;
    popover.style.zIndex = '1000';

    const arrow = document.createElement('div');
    arrow.className = 'bpmn-mapping-popover__arrow';
    popover.appendChild(arrow);

    this.canvasRef.nativeElement.appendChild(popover);
    this.activePopover = popover;

    const closeOnEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.ngZone.run(() => this.closeMappingPopover());
      }
    };

    const closeOnClickOutside = (e: MouseEvent) => {
      if (!popover.contains(e.target as Node) && !anchor.contains(e.target as Node)) {
        this.ngZone.run(() => this.closeMappingPopover());
      }
    };

    document.addEventListener('keydown', closeOnEsc);
    document.addEventListener('click', closeOnClickOutside);

    this.popoverCleanup = () => {
      document.removeEventListener('keydown', closeOnEsc);
      document.removeEventListener('click', closeOnClickOutside);
    };

    removeBtn.focus();
  }

  private closeMappingPopover(): void {
    if (this.activePopover) {
      this.activePopover.remove();
      this.activePopover = null;
    }
    if (this.popoverCleanup) {
      this.popoverCleanup();
      this.popoverCleanup = null;
    }
  }

  private getFailuresForActivity(activityId: string): string[] {
    if (!this.migrationReport) return [];

    const instructions = this.editableInstructions || [];
    const instructionIndex = instructions.findIndex(instr =>
      instr.sourceActivityIds.includes(activityId) || instr.targetActivityIds.includes(activityId)
    );

    if (instructionIndex === -1) return [];

    const report = this.migrationReport.instructionReports?.[instructionIndex];
    return report?.failures || [];
  }

  private isEventType(type: string): boolean {
    return !!(type && (
      type.includes('Event') ||
      type === 'bpmn:ReceiveTask'
    ));
  }

  private getUpdateEventTriggerForActivity(activityId: string): boolean {
    const instructions = this.editableInstructions || [];
    const instruction = instructions.find(instr => instr.sourceActivityIds.includes(activityId));
    return instruction?.updateEventTrigger || false;
  }

  private updateEventTrigger(activityId: string, value: boolean): void {

  }

  private getElementDisplayName(element: any): string {
    if (element.businessObject?.name) return element.businessObject.name;
    const id = element.id || '';
    return id.endsWith('_plane') ? id.slice(0, -6) : id;
  }

  private updateSubprocessStack(element: any): void {
    if (!element) return;

    if (element.type === 'bpmn:Process' || element.type === 'bpmn:Collaboration') {
      this.subprocessStack = [];
    } else {
      const existingIndex = this.subprocessStack.findIndex(item => item.id === element.id);
      if (existingIndex >= 0) {
        this.subprocessStack = this.subprocessStack.slice(0, existingIndex);
      } else if (this.currentRootElement) {
        const name = this.getElementDisplayName(this.currentRootElement);
        this.subprocessStack.push({ id: this.currentRootElement.id, name, element: this.currentRootElement });
      }
    }

    this.currentRootElement = element;

    if (this.subprocessStack.length === 0) {
      this.subprocessBreadcrumb = [];
      this.windowStart = 0;
    } else {
      const currentName = this.getElementDisplayName(element);
      this.subprocessBreadcrumb = [...this.subprocessStack.map(item => item.name), currentName];
      const n = this.subprocessBreadcrumb.length;
      this.windowStart = n > 5 ? Math.max(1, n - 3) : 0;
    }

    this.cdr.detectChanges();
  }

  private checkEventSubprocessScope(element: any): boolean {
    let current = element.parent;
    while (current) {
      if (current.type === 'bpmn:SubProcess' && current.businessObject?.triggeredByEvent) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  private checkMultiInstanceScope(element: any): boolean {
    let current = element.parent;
    while (current) {
      if (current.type === 'bpmn:SubProcess' && current.businessObject?.loopCharacteristics) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  private destroyViewer(): void {
    if (this.viewer) {
      this.clearAllOverlays();
      this.viewer.destroy();
      this.viewer = null;
      this.overlays = null;
      this.isViewerReady = false;
      this.currentXml = null;
    }
  }

  navigateToSubprocessLevel(index: number): void {
    const item = this.subprocessStack[index];
    if (!item || !this.viewer) return;
    const canvas = this.viewer.get('canvas');
    canvas.setRootElement(item.element);
  }

  shiftWindowLeft(): void {
    this.windowStart = Math.max(1, this.windowStart - 3);
  }

  shiftWindowRight(): void {
    const n = this.subprocessBreadcrumb.length;
    this.windowStart = Math.min(n - 4, this.windowStart + 3);
  }

  zoomIn(): void {
    if (this.viewer) {
      const canvas = this.viewer.get('canvas');
      canvas.zoom(canvas.zoom() * 1.2);
    }
  }

  zoomOut(): void {
    if (this.viewer) {
      const canvas = this.viewer.get('canvas');
      canvas.zoom(canvas.zoom() / 1.2);
    }
  }

  resetZoom(): void {
    if (this.viewer && this.isContainerVisible()) {
      const canvas = this.viewer.get('canvas');
      this.safeZoomFit(canvas);
    }
  }

  resize(): void {
    if (!this.viewer) return;

    requestAnimationFrame(() => {
      if (!this.viewer || !this.isContainerVisible()) return;

      try {
        const canvas = this.viewer.get('canvas');
        canvas.resized();
        this.safeZoomFit(canvas);
      } catch (e) {
      }
    });
  }

  onContainerVisible(): void {
    if (this.needsZoomFit && this.viewer && this.isContainerVisible()) {
      try {
        const canvas = this.viewer.get('canvas');
        this.safeZoomFit(canvas);
        this.needsZoomFit = false;
      } catch (e) {
      }
    }
  }


  private safeZoomFit(canvas: any): void {
    try {
      const viewbox = canvas.viewbox();
      if (viewbox && isFinite(viewbox.width) && isFinite(viewbox.height) &&
          viewbox.width > 0 && viewbox.height > 0) {
        canvas.zoom('fit-viewport', 'auto');
      }
    } catch (e) {
    }
  }

  scrollToElement(elementId: string): void {
    if (!this.viewer) return;

    if (this.needsZoomFit && this.isContainerVisible()) {
      this.onContainerVisible();
    }

    const canvas = this.viewer.get('canvas');
    const elementRegistry = this.viewer.get('elementRegistry');
    const element = elementRegistry.get(elementId);

    if (element) {
      canvas.scrollToElement(element);
    }
  }

  getElement(elementId: string): BpmnElement | null {
    if (!this.viewer) return null;

    const elementRegistry = this.viewer.get('elementRegistry');
    const element = elementRegistry.get(elementId);

    if (element) {
      return {
        id: element.id,
        type: element.type,
        name: element.businessObject?.name
      };
    }
    return null;
  }

  getAllElements(): any[] {
    if (!this.viewer) return [];
    const elementRegistry = this.viewer.get('elementRegistry');
    return elementRegistry.getAll();
  }

  addCorrelateOverlays(messageNodes: Map<string, string>, onClick: (messageName: string) => void): void {
    if (!this.viewer || !this.overlays) return;
    this.clearCorrelateOverlays();

    const elementRegistry = this.viewer.get('elementRegistry');
    const eventBus = this.viewer.get('eventBus');

    const hostBoundaryCount = new Map<string, number>();
    const envelope = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 16 16"><path fill="currentColor" d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105V5.383zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741zM1 11.105l4.708-2.897L1 5.383v5.722z"/></svg>';

    messageNodes.forEach((messageName, elementId) => {
      const element = elementRegistry.get(elementId);
      let anchorId = elementId;
      let position: { top: number; right: number };

      if (element?.type === 'bpmn:BoundaryEvent' && element.host) {
        const hostId: string = element.host.id;
        const idx = hostBoundaryCount.get(hostId) ?? 0;
        hostBoundaryCount.set(hostId, idx + 1);
        anchorId = hostId;
        position = this.correlateOverlayPosition('bpmn:BoundaryEvent', idx);
      } else {
        position = this.correlateOverlayPosition(element?.type ?? '', 0);
      }

      const btn = document.createElement('button');
      btn.className = 'bpmn-correlate-overlay bpmn-correlate-overlay--hidden';
      btn.title = `Correlate message: ${messageName}`;
      btn.setAttribute('aria-label', `Correlate message: ${messageName}`);
      btn.innerHTML = envelope;
      btn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        this.ngZone.run(() => onClick(messageName));
      });

      try {
        const id = this.overlays.add(anchorId, { position, html: btn });
        this.correlateOverlayIds.push(id);

        this.correlateOverlayData.set(id, { btn, elementId, anchorId, hideTimer: null });

        this.ngZone.runOutsideAngular(() => {
          this.setupCorrelateOverlayHover(id, elementId, anchorId, btn, eventBus, elementRegistry);
        });
      } catch (_) {}
    });
  }

  private setupCorrelateOverlayHover(
    overlayId: string,
    elementId: string,
    anchorId: string,
    btn: HTMLButtonElement,
    eventBus: any,
    elementRegistry: any
  ): void {
    const HIDE_DELAY = 150;

    const showOverlay = () => {
      const data = this.correlateOverlayData.get(overlayId);
      if (!data) return;
      if (data.hideTimer) {
        clearTimeout(data.hideTimer);
        data.hideTimer = null;
      }
      btn.classList.remove('bpmn-correlate-overlay--hidden');
    };

    const hideOverlay = () => {
      const data = this.correlateOverlayData.get(overlayId);
      if (!data) return;
      if (data.hideTimer) clearTimeout(data.hideTimer);
      data.hideTimer = setTimeout(() => {
        btn.classList.add('bpmn-correlate-overlay--hidden');
        data.hideTimer = null;
      }, HIDE_DELAY);
    };

    const onElementHover = (event: any) => {
      const hoveredId = event.element?.id;
      if (hoveredId === elementId || hoveredId === anchorId) {
        showOverlay();
      }
    };

    const onElementOut = (event: any) => {
      const leftId = event.element?.id;
      if (leftId === elementId || leftId === anchorId) {
        hideOverlay();
      }
    };

    const onButtonEnter = () => showOverlay();
    const onButtonLeave = () => hideOverlay();

    const onButtonFocus = () => showOverlay();
    const onButtonBlur = () => hideOverlay();

    eventBus.on('element.hover', onElementHover);
    eventBus.on('element.out', onElementOut);
    btn.addEventListener('mouseenter', onButtonEnter);
    btn.addEventListener('mouseleave', onButtonLeave);
    btn.addEventListener('focus', onButtonFocus);
    btn.addEventListener('blur', onButtonBlur);

    this.correlateHoverListeners.push(() => {
      eventBus.off('element.hover', onElementHover);
      eventBus.off('element.out', onElementOut);
      btn.removeEventListener('mouseenter', onButtonEnter);
      btn.removeEventListener('mouseleave', onButtonLeave);
      btn.removeEventListener('focus', onButtonFocus);
      btn.removeEventListener('blur', onButtonBlur);
      const data = this.correlateOverlayData.get(overlayId);
      if (data?.hideTimer) {
        clearTimeout(data.hideTimer);
        data.hideTimer = null;
      }
    });
  }

  private correlateOverlayPosition(
    elementType: string,
    boundaryIndex: number
  ): { top: number; right: number } {
    const BTN = 24;
    const GAP = 4;

    if (elementType === 'bpmn:BoundaryEvent') {
      return { top: -BTN, right: boundaryIndex * (BTN + GAP) };
    }

    return { top: -BTN, right: 0 };
  }

  clearCorrelateOverlays(): void {
    for (const data of this.correlateOverlayData.values()) {
      if (data.hideTimer) {
        clearTimeout(data.hideTimer);
        data.hideTimer = null;
      }
    }

    for (const cleanup of this.correlateHoverListeners) {
      cleanup();
    }
    this.correlateHoverListeners = [];

    for (const id of this.correlateOverlayIds) {
      try { this.overlays?.remove(id); } catch (_) {}
    }

    this.correlateOverlayIds = [];
    this.correlateOverlayData.clear();
  }
}
