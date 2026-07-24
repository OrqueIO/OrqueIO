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
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';

// @ts-ignore - bpmn-js doesn't have types
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';

export interface ActivityBadge {
  activityId: string;
  instances?: number;
  incidents?: number;
}

export interface BpmnElement {
  id: string;
  type: string;
  name?: string;
}

export interface CallActivityClickEvent {
  callActivityId: string;
  calledElement: string | null;
}

@Component({
  selector: 'app-bpmn-viewer',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './bpmn-viewer.html',
  styleUrls: ['./bpmn-viewer.css'],
  encapsulation: ViewEncapsulation.None
})
export class BpmnViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  private cdr = inject(ChangeDetectorRef);

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

  @Output() elementClick = new EventEmitter<BpmnElement>();
  @Output() elementHover = new EventEmitter<BpmnElement | null>();
  @Output() viewerReady = new EventEmitter<void>();
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
  private currentXml: string | null = null;
  private needsZoomFit = false;
  private resizeTimeout: ReturnType<typeof setTimeout> | null = null;
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
      this.styleCollapsedSubprocessOverlays();
    });

    eventBus.on('element.click', (event: any) => {
      const element = event.element;
      if (element && element.id && element.type !== 'bpmn:Process') {
        this.elementClick.emit({
          id: element.id,
          type: element.type,
          name: element.businessObject?.name
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

    const canvas = this.viewer.get('canvas');
    const elementRegistry = this.viewer.get('elementRegistry');

    // Remove existing highlights
    elementRegistry.forEach((element: any) => {
      if (element.businessObject) {
        canvas.removeMarker(element.id, 'highlight');
      }
    });

    // Add highlights
    this.highlightedActivities.forEach(activityId => {
      const element = elementRegistry.get(activityId);
      if (element) {
        canvas.addMarker(activityId, 'highlight');
      }
    });
  }

  private updateRunningMarkers(): void {
    if (!this.viewer) return;

    const canvas = this.viewer.get('canvas');
    const elementRegistry = this.viewer.get('elementRegistry');

    // Remove existing running markers
    elementRegistry.forEach((element: any) => {
      if (element.businessObject) {
        canvas.removeMarker(element.id, 'running');
      }
    });

    // Add running markers
    this.runningActivities.forEach(activityId => {
      const element = elementRegistry.get(activityId);
      if (element) {
        canvas.addMarker(activityId, 'running');
      }
    });
  }

  private updateSelection(): void {
    if (!this.viewer) return;

    const canvas = this.viewer.get('canvas');
    const elementRegistry = this.viewer.get('elementRegistry');

    // Remove existing selection
    elementRegistry.forEach((element: any) => {
      if (element.businessObject) {
        canvas.removeMarker(element.id, 'selected');
      }
    });

    // Add selection marker
    if (this.selectedActivity) {
      const element = elementRegistry.get(this.selectedActivity);
      if (element) {
        canvas.addMarker(this.selectedActivity, 'selected');
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

    // bpmn-js fires root.set via its own EventBus (not a zone.js-patched DOM event),
    // so Angular's OnPush parent is never marked dirty automatically.
    // detectChanges() bypasses the parent check and re-renders this component immediately.
    this.cdr.detectChanges();
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

  // Public methods for external control
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

    // If zoom fit is pending, do it first
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
}
