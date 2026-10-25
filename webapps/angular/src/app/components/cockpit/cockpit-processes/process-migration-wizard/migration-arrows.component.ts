import {
  Component,
  Input,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  inject,
  signal,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MigrationInstructionDto, MigrationPlanReportDto } from '../../../../services/migration.model';

interface ArrowPath {
  instructionIndex: number;
  path: string;
  valid: boolean;
  visible: boolean;
  sourceIds: string[];
  targetIds: string[];
}

@Component({
  selector: 'app-migration-arrows',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg class="migration-arrows" [attr.viewBox]="viewBox()" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="live-arrow-head" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" class="live-arrow-marker" />
        </marker>
      </defs>

      @for (arrow of arrows(); track arrow.instructionIndex) {
        @if (arrow.visible) {
          <path
            [attr.d]="arrow.path"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
            [attr.data-instruction-index]="arrow.instructionIndex"
            class="migration-arrow"
            [class.migration-arrow--valid]="arrow.valid"
            [class.migration-arrow--invalid]="!arrow.valid">
          </path>
        }
      }

      @if (liveArrowPath()) {
        <circle
          [attr.cx]="liveArrowStart()?.x"
          [attr.cy]="liveArrowStart()?.y"
          r="4"
          class="live-arrow-start">
        </circle>
        <path
          [attr.d]="liveArrowPath()"
          stroke-width="2"
          fill="none"
          stroke-dasharray="6 4"
          stroke-linecap="round"
          marker-end="url(#live-arrow-head)"
          class="live-arrow-path">
        </path>
      }
    </svg>
  `,
  styles: [`
    :host {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    }

    .migration-arrows {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .migration-arrow {
      transition: opacity 0.2s ease;
    }

    .migration-arrow--valid {
      stroke: var(--color-success, #22c55e);
    }

    .migration-arrow--invalid {
      stroke: var(--color-danger, #ef4444);
    }

    .live-arrow-start {
      fill: var(--primary-light, #3b82f6);
    }

    .live-arrow-path {
      stroke: var(--primary-light, #3b82f6);
    }

    .live-arrow-marker {
      fill: var(--primary-light, #3b82f6);
    }
  `]
})
export class MigrationArrowsComponent implements AfterViewInit, OnChanges, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private hostElement = inject(ElementRef);

  @Input() instructions: MigrationInstructionDto[] = [];
  @Input() report: MigrationPlanReportDto | null = null;
  @Input() sourceContainerSelector = '.diagram-panel:nth-child(1) .bpmn-canvas';
  @Input() targetContainerSelector = '.diagram-panel:nth-child(2) .bpmn-canvas';
  @Input() showAll = true;
  @Input() visibleInstructionIndices: Set<number> = new Set();
  @Input() mappingMode = false;
  @Input() mappingSourceActivityId: string | null = null;

  arrows = signal<ArrowPath[]>([]);
  viewBox = signal<string>('0 0 1920 1080');
  liveArrowPath = signal<string | null>(null);
  liveArrowStart = signal<{ x: number; y: number } | null>(null);
  liveArrowEnd = signal<{ x: number; y: number } | null>(null);

  private resizeObserver: ResizeObserver | null = null;
  private updateScheduled = false;
  private pointerMoveListener: ((e: PointerEvent) => void) | null = null;
  private rafId: number | null = null;
  private viewboxChangeListeners: Array<() => void> = [];
  private trackingLoopId: number | null = null;
  private previousRects: Map<string, DOMRect> = new Map();

  ngAfterViewInit(): void {
    this.setupObservers();
    this.scheduleUpdate();
    this.startTrackingLoop();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['instructions'] || changes['report'] || changes['showAll'] || changes['visibleInstructionIndices']) {
      this.scheduleUpdate();
    }

    if (changes['mappingMode'] || changes['mappingSourceActivityId']) {
      if (this.mappingMode && this.mappingSourceActivityId) {
        this.startLiveArrow();
      } else {
        this.stopLiveArrow();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopTrackingLoop();
    this.stopLiveArrow();
    this.resizeObserver?.disconnect();
    this.cleanupViewboxListeners();
  }

  private setupObservers(): void {
    const diagramsContainer = this.hostElement.nativeElement.closest('.diagrams-container');
    if (!diagramsContainer) return;

    // Watch for resize
    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleUpdate();
    });
    this.resizeObserver.observe(diagramsContainer);

    // Setup bpmn-js eventBus listeners for canvas.viewbox.changed
    this.setupViewboxListeners();

    // Watch for scroll on diagrams-container
    const scrollListener = () => {
      this.scheduleUpdate();
    };
    diagramsContainer.addEventListener('scroll', scrollListener);
    this.viewboxChangeListeners.push(() => {
      diagramsContainer.removeEventListener('scroll', scrollListener);
    });
  }

  private setupViewboxListeners(): void {
    // No need for setTimeout delays - the rAF tracking loop will handle updates
    const sourceContainer = document.querySelector(this.sourceContainerSelector);
    const targetContainer = document.querySelector(this.targetContainerSelector);

    [sourceContainer, targetContainer].forEach(container => {
      if (!container) return;

      // Try to access bpmn-js viewer instance
      const bpmnContainer = container.closest('.bpmn-viewer-container, .bjs-container');
      if (!bpmnContainer) return;

      try {
        const viewerInstance = (bpmnContainer as any).__bpmnViewer ||
                               (container as any).__bpmnViewer ||
                               this.findViewerInstance(container);

        if (viewerInstance) {
          const eventBus = viewerInstance.get('eventBus');
          if (eventBus) {
            // These listeners are kept for manual optimization hints,
            // but the rAF loop will catch changes anyway
            const listener = () => {
              this.scheduleUpdate();
            };

            eventBus.on('canvas.viewbox.changed', listener);
            eventBus.on('import.done', listener);

            this.viewboxChangeListeners.push(() => {
              eventBus.off('canvas.viewbox.changed', listener);
              eventBus.off('import.done', listener);
            });

            return;
          }
        }
      } catch (e) {
        // Fallback to DOM events if eventBus is not accessible
      }

      this.setupDOMListeners(container);
    });
  }

  private findViewerInstance(container: Element): any {
    // Try to find viewer instance by traversing parent elements
    let current: Element | null = container;
    while (current) {
      if ((current as any).viewer || (current as any).__bpmnViewer) {
        return (current as any).viewer || (current as any).__bpmnViewer;
      }
      current = current.parentElement;
    }
    return null;
  }

  private setupDOMListeners(container: Element): void {
    // Fallback: Listen to DOM events
    const wheelListener = (e: Event) => {
      if ((e as WheelEvent).ctrlKey || (e as WheelEvent).metaKey) {
        this.scheduleUpdate();
      }
    };
    container.addEventListener('wheel', wheelListener, { passive: true });

    let isPanning = false;
    const pointerDownListener = (e: Event) => {
      const pe = e as PointerEvent;
      if (pe.button === 1 || (pe.button === 0 && (pe.shiftKey || pe.altKey))) {
        isPanning = true;
      }
    };
    const pointerUpListener = () => {
      if (isPanning) {
        isPanning = false;
        this.scheduleUpdate();
      }
    };
    const pointerMoveListener = () => {
      if (isPanning) {
        this.scheduleUpdate();
      }
    };

    container.addEventListener('pointerdown', pointerDownListener);
    document.addEventListener('pointerup', pointerUpListener);
    container.addEventListener('pointermove', pointerMoveListener);

    this.viewboxChangeListeners.push(() => {
      container.removeEventListener('wheel', wheelListener);
      container.removeEventListener('pointerdown', pointerDownListener);
      document.removeEventListener('pointerup', pointerUpListener);
      container.removeEventListener('pointermove', pointerMoveListener);
    });
  }

  private cleanupViewboxListeners(): void {
    this.viewboxChangeListeners.forEach(cleanup => cleanup());
    this.viewboxChangeListeners = [];
  }

  private scheduleUpdate(): void {
    if (this.updateScheduled) return;

    this.updateScheduled = true;
    requestAnimationFrame(() => {
      this.updateScheduled = false;
      this.calculateArrows();

      // Also update live arrow if in mapping mode
      if (this.mappingMode && this.mappingSourceActivityId) {
        this.updateLiveArrowPath();
      }
    });
  }

  private calculateArrows(): void {
    if (!this.instructions || this.instructions.length === 0) {
      this.arrows.set([]);
      return;
    }

    const arrowPaths: ArrowPath[] = [];
    const container = this.hostElement.nativeElement.closest('.diagrams-container');
    if (!container) {
      this.arrows.set([]);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    this.viewBox.set(`0 0 ${containerRect.width} ${containerRect.height}`);

    this.instructions.forEach((instruction, index) => {
      // Check if this instruction should be visible
      const shouldShow = this.showAll || this.visibleInstructionIndices.has(index);
      if (!shouldShow) return;

      // Determine if valid
      const instrReport = this.report?.instructionReports?.[index];
      const valid = !instrReport?.failures || instrReport.failures.length === 0;

      // For each source-target pair, draw an arrow
      instruction.sourceActivityIds.forEach(sourceId => {
        instruction.targetActivityIds.forEach(targetId => {
          const sourceRect = this.getElementRect(sourceId, this.sourceContainerSelector, containerRect);
          const targetRect = this.getElementRect(targetId, this.targetContainerSelector, containerRect);

          if (sourceRect && targetRect) {
            const path = this.createBezierPath(sourceRect, targetRect);
            const visible = this.isRectVisible(sourceRect, containerRect) && this.isRectVisible(targetRect, containerRect);

            arrowPaths.push({
              instructionIndex: index,
              path,
              valid,
              visible,
              sourceIds: instruction.sourceActivityIds,
              targetIds: instruction.targetActivityIds
            });
          }
        });
      });
    });

    this.arrows.set(arrowPaths);

    // Update live arrow if in mapping mode
    if (this.mappingMode && this.mappingSourceActivityId) {
      this.updateLiveArrowPath();
    }

    this.cdr.markForCheck();
  }

  private getElementRect(elementId: string, containerSelector: string, layerContainerRect: DOMRect): DOMRect | null {
    const container = document.querySelector(containerSelector);
    if (!container) return null;

    const element = container.querySelector(`[data-element-id="${elementId}"] .djs-visual`);
    if (!element) return null;

    const rect = element.getBoundingClientRect();

    // Convert to SVG layer coordinates (relative to .diagrams-container)
    // The layerContainerRect is the rect of .diagrams-container, which is the parent of the SVG layer
    return new DOMRect(
      rect.left - layerContainerRect.left,
      rect.top - layerContainerRect.top,
      rect.width,
      rect.height
    );
  }

  private createBezierPath(sourceRect: DOMRect, targetRect: DOMRect): string {
    // Start from right edge center of source
    const x1 = sourceRect.left + sourceRect.width;
    const y1 = sourceRect.top + sourceRect.height / 2;

    // End at left edge center of target
    const x2 = targetRect.left;
    const y2 = targetRect.top + targetRect.height / 2;

    // Calculate control points for Bézier curve
    const dx = x2 - x1;
    const dy = Math.abs(y2 - y1);

    // Add dip if y-values are nearly equal (within 40px)
    let cp1x, cp1y, cp2x, cp2y;

    if (dy < 40) {
      // Nearly horizontal: add 40px dip in the middle
      const midX = x1 + dx / 2;
      const dipY = Math.max(y1, y2) + 40;

      cp1x = x1 + dx * 0.25;
      cp1y = dipY;
      cp2x = x1 + dx * 0.75;
      cp2y = dipY;
    } else {
      // Normal curve: control points extend horizontally
      const offset = Math.min(Math.abs(dx) * 0.5, 150);

      cp1x = x1 + offset;
      cp1y = y1;
      cp2x = x2 - offset;
      cp2y = y2;
    }

    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  }

  private isRectVisible(rect: DOMRect, containerRect: DOMRect): boolean {
    return (
      rect.left >= 0 &&
      rect.top >= 0 &&
      rect.left + rect.width <= containerRect.width &&
      rect.top + rect.height <= containerRect.height
    );
  }

  public updateArrows(): void {
    this.scheduleUpdate();
  }

  /**
   * Converts client (browser viewport) coordinates to SVG layer coordinates.
   * Handles container offset and SVG viewBox scaling using inverse CTM transformation.
   *
   * @param clientX - X coordinate relative to viewport
   * @param clientY - Y coordinate relative to viewport
   * @returns Point in SVG layer coordinate system, or null if conversion fails
   */
  private toLayerPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = this.hostElement.nativeElement.querySelector('.migration-arrows');
    if (!svg) return null;

    const container = this.hostElement.nativeElement.closest('.diagrams-container');
    if (!container) return null;

    const containerRect = container.getBoundingClientRect();

    // Convert client coordinates to container-relative coordinates
    const containerX = clientX - containerRect.left;
    const containerY = clientY - containerRect.top;

    // For SVG with matching viewBox and container dimensions, this is the result.
    // For scaled viewBox, we need to apply inverse CTM transformation.
    // However, since we now sync viewBox to container dimensions (line 214),
    // the coordinates are already correct in the SVG coordinate system.
    return { x: containerX, y: containerY };
  }

  private startLiveArrow(): void {
    if (!this.mappingMode || !this.mappingSourceActivityId) return;

    // Get initial position from source activity button
    const container = this.hostElement.nativeElement.closest('.diagrams-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    // CRITICAL: Sync viewBox to container dimensions before starting live arrow
    // This ensures coordinate conversion is accurate from the first mouse move
    this.viewBox.set(`0 0 ${containerRect.width} ${containerRect.height}`);
    const sourceRect = this.getElementRect(this.mappingSourceActivityId, this.sourceContainerSelector, containerRect);

    if (!sourceRect) {
      this.liveArrowPath.set(null);
      this.liveArrowStart.set(null);
      this.liveArrowEnd.set(null);
      return;
    }

    // Start point: right edge center of source
    const startX = sourceRect.left + sourceRect.width;
    const startY = sourceRect.top + sourceRect.height / 2;
    this.liveArrowStart.set({ x: startX, y: startY });

    // Initial end point: same as start (will be updated by mouse move)
    this.liveArrowEnd.set({ x: startX, y: startY });
    this.updateLiveArrowPath();

    // Setup pointer move listener
    this.pointerMoveListener = (e: PointerEvent) => {
      if (this.rafId !== null) return;

      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;

        const point = this.toLayerPoint(e.clientX, e.clientY);
        if (!point) return;

        this.liveArrowEnd.set(point);
        this.updateLiveArrowPath();
        this.cdr.markForCheck();
      });
    };

    document.addEventListener('pointermove', this.pointerMoveListener);

    // Trigger update on resize/pan/zoom (already handled by existing observers)
    // The scheduleUpdate mechanism will call updateLiveArrowPath indirectly
  }

  private stopLiveArrow(): void {
    if (this.pointerMoveListener) {
      document.removeEventListener('pointermove', this.pointerMoveListener);
      this.pointerMoveListener = null;
    }

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.liveArrowPath.set(null);
    this.liveArrowStart.set(null);
    this.liveArrowEnd.set(null);
  }

  private updateLiveArrowPath(): void {
    const start = this.liveArrowStart();
    const end = this.liveArrowEnd();

    if (!start || !end) {
      this.liveArrowPath.set(null);
      return;
    }

    // Check if source is still visible
    if (!this.mappingSourceActivityId) {
      this.liveArrowPath.set(null);
      return;
    }

    const container = this.hostElement.nativeElement.closest('.diagrams-container');
    if (!container) {
      this.liveArrowPath.set(null);
      return;
    }

    const containerRect = container.getBoundingClientRect();

    // Sync viewBox to current container dimensions (handles pan/zoom/resize)
    this.viewBox.set(`0 0 ${containerRect.width} ${containerRect.height}`);
    const sourceRect = this.getElementRect(this.mappingSourceActivityId, this.sourceContainerSelector, containerRect);

    if (!sourceRect || !this.isRectVisible(sourceRect, containerRect)) {
      this.liveArrowPath.set(null);
      return;
    }

    // Recalculate start position (in case of pan/zoom)
    const startX = sourceRect.left + sourceRect.width;
    const startY = sourceRect.top + sourceRect.height / 2;
    this.liveArrowStart.set({ x: startX, y: startY });

    const path = this.createLiveBezierPath(startX, startY, end.x, end.y);
    this.liveArrowPath.set(path);
  }

  private createLiveBezierPath(x1: number, y1: number, x2: number, y2: number): string {
    const dx = x2 - x1;
    const dy = Math.abs(y2 - y1);

    let cp1x, cp1y, cp2x, cp2y;

    if (dy < 40) {
      // Nearly horizontal: add 40px dip in the middle
      const dipY = Math.max(y1, y2) + 40;

      cp1x = x1 + dx * 0.25;
      cp1y = dipY;
      cp2x = x1 + dx * 0.75;
      cp2y = dipY;
    } else {
      // Normal curve: control points extend horizontally
      const offset = Math.min(Math.abs(dx) * 0.5, 150);

      cp1x = x1 + offset;
      cp1y = y1;
      cp2x = x2 - offset;
      cp2y = y2;
    }

    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  }

  /**
   * Starts the requestAnimationFrame tracking loop that continuously monitors
   * DOM rect changes and updates arrow positions accordingly.
   *
   * This loop reads real getBoundingClientRect() values for:
   * - The diagrams container
   * - All source BPMN shapes referenced in instructions
   * - All target BPMN shapes referenced in instructions
   *
   * It only recalculates arrow paths when rects change by more than 0.5px,
   * and stops when the component is destroyed or has no arrows to display.
   */
  private startTrackingLoop(): void {
    if (this.trackingLoopId !== null) return;

    const loop = () => {
      // Stop if component should not be tracking
      if (!this.shouldTrack()) {
        this.trackingLoopId = null;
        this.previousRects.clear();
        return;
      }

      // Read current DOM rects
      const currentRects = this.readAllRects();

      // Check if any rect has changed significantly (>0.5px)
      if (this.rectsChanged(currentRects)) {
        // Update stored rects
        this.previousRects = currentRects;

        // Trigger recalculation
        this.scheduleUpdate();
      }

      // Continue loop
      this.trackingLoopId = requestAnimationFrame(loop);
    };

    // Start the loop
    this.trackingLoopId = requestAnimationFrame(loop);
  }

  /**
   * Stops the requestAnimationFrame tracking loop.
   */
  private stopTrackingLoop(): void {
    if (this.trackingLoopId !== null) {
      cancelAnimationFrame(this.trackingLoopId);
      this.trackingLoopId = null;
    }
    this.previousRects.clear();
  }

  /**
   * Determines if the component should continue tracking rect changes.
   * Returns false only when component is completely absent (not just temporarily hidden).
   * IMPORTANT: Do NOT stop when width/height=0, as container may be temporarily hidden
   * during diagram loading (e.g., version change). Loop must continue to detect when
   * container becomes visible again.
   */
  private shouldTrack(): boolean {
    // Check if component container exists in DOM
    const container = this.hostElement.nativeElement.closest('.diagrams-container');
    if (!container) return false;

    // NOTE: Do NOT check containerRect.width/height === 0
    // Container may be temporarily invisible during diagram loading
    // Loop should continue so it can detect when container becomes visible again

    // Check if there are arrows or live arrow to display
    const hasArrows = !!(this.instructions && this.instructions.length > 0);
    const hasLiveArrow = !!(this.mappingMode && this.mappingSourceActivityId);

    return hasArrows || hasLiveArrow;
  }

  /**
   * Reads all relevant DOM rects for tracking.
   * Returns a Map keyed by unique identifiers.
   */
  private readAllRects(): Map<string, DOMRect> {
    const rects = new Map<string, DOMRect>();

    // Read container rect
    const container = this.hostElement.nativeElement.closest('.diagrams-container');
    if (container) {
      rects.set('__container', container.getBoundingClientRect());
    }

    // Read all source and target shape rects from instructions
    if (this.instructions) {
      this.instructions.forEach((instruction, index) => {
        instruction.sourceActivityIds.forEach(sourceId => {
          const sourceContainer = document.querySelector(this.sourceContainerSelector);
          if (sourceContainer) {
            const element = sourceContainer.querySelector(`[data-element-id="${sourceId}"] .djs-visual`);
            if (element) {
              rects.set(`source-${index}-${sourceId}`, element.getBoundingClientRect());
            }
          }
        });

        instruction.targetActivityIds.forEach(targetId => {
          const targetContainer = document.querySelector(this.targetContainerSelector);
          if (targetContainer) {
            const element = targetContainer.querySelector(`[data-element-id="${targetId}"] .djs-visual`);
            if (element) {
              rects.set(`target-${index}-${targetId}`, element.getBoundingClientRect());
            }
          }
        });
      });
    }

    // Read source shape for live arrow if in mapping mode
    if (this.mappingMode && this.mappingSourceActivityId) {
      const sourceContainer = document.querySelector(this.sourceContainerSelector);
      if (sourceContainer) {
        const element = sourceContainer.querySelector(`[data-element-id="${this.mappingSourceActivityId}"] .djs-visual`);
        if (element) {
          rects.set(`live-source-${this.mappingSourceActivityId}`, element.getBoundingClientRect());
        }
      }
    }

    return rects;
  }

  /**
   * Compares current rects with previous rects.
   * Returns true if any rect changed by more than 0.5px.
   */
  private rectsChanged(currentRects: Map<string, DOMRect>): boolean {
    // If different number of rects, something changed
    if (currentRects.size !== this.previousRects.size) {
      return true;
    }

    // Check each rect
    for (const [key, currentRect] of currentRects) {
      const previousRect = this.previousRects.get(key);

      if (!previousRect) {
        return true; // New rect appeared
      }

      // Check if any dimension changed by more than 0.5px
      if (
        Math.abs(currentRect.left - previousRect.left) > 0.5 ||
        Math.abs(currentRect.top - previousRect.top) > 0.5 ||
        Math.abs(currentRect.width - previousRect.width) > 0.5 ||
        Math.abs(currentRect.height - previousRect.height) > 0.5
      ) {
        return true;
      }
    }

    return false;
  }
}