import {
  Component,
  Input,
  Output,
  EventEmitter,
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
import { Anchor, anchorPoint, nearestAnchor, buildArrowPath, getAnchorKey, Point, Rect as AnchorRect } from './migration-arrow-anchors';
import { TranslatePipe } from '../../../../i18n/translate.pipe';

interface ArrowPath {
  instructionIndex: number;
  path: string;
  valid: boolean;
  visible: boolean;
  sourceIds: string[];
  targetIds: string[];
  sourceAnchor: Anchor;
  targetAnchor: Anchor;
}

@Component({
  selector: 'app-migration-arrows',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <svg class="migration-arrows" [attr.viewBox]="viewBox()" xmlns="http://www.w3.org/2000/svg"
         (click)="onBackgroundClick()">
      <defs>
        <marker id="live-arrow-head" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" class="live-arrow-marker" />
        </marker>
      </defs>

      @for (arrow of arrows(); track arrow.instructionIndex; let i = $index) {
        @if (arrow.visible) {
          <g class="arrow-group"
             [class.arrow-group--hovered]="hoveredArrowIndex() === i"
             [class.arrow-group--selected]="selectedArrowIndex() === i"
             [class.arrow-group--dragging]="draggingHandle()?.arrowIndex === i"
             (mouseenter)="onArrowHover(i)"
             (mouseleave)="onArrowLeave()">
            <!-- Hit area: transparent path with wider stroke for easier clicking -->
            <path
              [attr.d]="arrow.path"
              stroke-width="14"
              fill="none"
              stroke="transparent"
              stroke-linecap="round"
              class="arrow-hit-area"
              (click)="onArrowClick(i, $event)">
            </path>
            <!-- Visible arrow path -->
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
            <!-- Anchor handles (only when hovered or selected or dragging, not in mapping mode, and path has endpoints) -->
            @if (!mappingMode && (hoveredArrowIndex() === i || selectedArrowIndex() === i || draggingHandle()?.arrowIndex === i) && arrow.path) {
              @let endpoints = parsePathEndpoints(arrow.path);
              @if (endpoints.start && endpoints.end) {
                <!-- Start handle -->
                <circle
                  [attr.cx]="endpoints.start.x"
                  [attr.cy]="endpoints.start.y"
                  r="6"
                  class="anchor-handle anchor-handle--start"
                  [class.anchor-handle--dragging]="draggingHandle()?.arrowIndex === i && draggingHandle()?.end === 'source'"
                  [attr.data-arrow-index]="i"
                  [attr.data-end]="'source'"
                  [attr.aria-label]="'migration.anchorStart' | translate"
                  (pointerdown)="onHandlePointerDown(i, 'source', $event)">
                </circle>
                <!-- End handle -->
                <circle
                  [attr.cx]="endpoints.end.x"
                  [attr.cy]="endpoints.end.y"
                  r="6"
                  class="anchor-handle anchor-handle--end"
                  [class.anchor-handle--dragging]="draggingHandle()?.arrowIndex === i && draggingHandle()?.end === 'target'"
                  [attr.data-arrow-index]="i"
                  [attr.data-end]="'target'"
                  [attr.aria-label]="'migration.anchorEnd' | translate"
                  (pointerdown)="onHandlePointerDown(i, 'target', $event)">
                </circle>
              }
            }
          </g>
        }
      }

      <!-- Anchor position indicators during drag -->
      @if (draggingHandle() && dragTargetRect()) {
        @let rect = dragTargetRect()!;
        @let nearestAnchor = dragPreviewAnchor();
        @for (anchor of ['top', 'right', 'bottom', 'left']; track anchor) {
          @let point = getAnchorPoint(rect, anchor);
          <circle
            [attr.cx]="point.x"
            [attr.cy]="point.y"
            r="8"
            class="anchor-indicator"
            [class.anchor-indicator--nearest]="anchor === nearestAnchor">
          </circle>
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

    .arrow-group {
      pointer-events: none;
    }

    .arrow-hit-area {
      pointer-events: stroke;
      cursor: pointer;
    }

    .migration-arrow {
      transition: opacity 0.2s ease;
      pointer-events: none;
    }

    .migration-arrow--valid {
      stroke: var(--color-success, #22c55e);
    }

    .migration-arrow--invalid {
      stroke: var(--color-danger, #ef4444);
    }

    .anchor-handle {
      fill: var(--primary, #3b82f6);
      stroke: white;
      stroke-width: 2;
      cursor: grab;
      pointer-events: auto;
      opacity: 1;
      visibility: visible;
      transition: opacity 120ms ease, visibility 0s linear 160ms, r 0.15s ease;
      transform-box: fill-box;
      transform-origin: center;
    }

    .anchor-handle:hover {
      transform: scale(1.167);
    }

    .anchor-handle--dragging {
      cursor: grabbing;
      r: 7;
    }

    .anchor-indicator {
      fill: var(--primary-light, #93c5fd);
      stroke: var(--primary, #3b82f6);
      stroke-width: 2;
      opacity: 0.6;
      pointer-events: none;
      transition: fill 0.15s ease, opacity 0.15s ease, r 0.15s ease;
    }

    .anchor-indicator--nearest {
      fill: var(--primary, #3b82f6);
      opacity: 1;
      r: 10;
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
  // ACTION 2: Use class-based selectors instead of :nth-child for robustness
  @Input() sourceContainerSelector = '.diagram-panel-source .bpmn-canvas';
  @Input() targetContainerSelector = '.diagram-panel-target .bpmn-canvas';
  @Input() showAll = true;
  @Input() visibleInstructionIndices: Set<number> = new Set();
  @Input() mappingMode = false;
  @Input() mappingSourceActivityId: string | null = null;
  @Input() customAnchors: Map<string, { source: Anchor; target: Anchor }> = new Map();

  @Output() anchorsChanged = new EventEmitter<Map<string, { source: Anchor; target: Anchor }>>();

  arrows = signal<ArrowPath[]>([]);
  viewBox = signal<string>('0 0 1920 1080');
  liveArrowPath = signal<string | null>(null);
  liveArrowStart = signal<{ x: number; y: number } | null>(null);
  liveArrowEnd = signal<{ x: number; y: number } | null>(null);

  selectedArrowIndex = signal<number | null>(null);
  hoveredArrowIndex = signal<number | null>(null);
  draggingHandle = signal<{ arrowIndex: number; end: 'source' | 'target'; initialAnchor: Anchor } | null>(null);

  dragPreviewAnchor = signal<Anchor | null>(null);
  dragTargetRect = signal<DOMRect | null>(null);
  dragPointerPos = signal<Point | null>(null);

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
            const instructionKey = sourceId + '-' + targetId;
            const anchors = this.customAnchors.get(instructionKey);
            const sourceAnchor: Anchor = anchors?.source || 'right';
            const targetAnchor: Anchor = anchors?.target || 'left';
            const startPoint = anchorPoint(sourceRect, sourceAnchor);
            const endPoint = anchorPoint(targetRect, targetAnchor);
            const path = buildArrowPath(startPoint, sourceAnchor, endPoint, targetAnchor);
            const visible = this.isRectVisible(sourceRect, containerRect) && this.isRectVisible(targetRect, containerRect);

            arrowPaths.push({
              instructionIndex: index,
              path,
              valid,
              visible,
              sourceIds: instruction.sourceActivityIds,
              targetIds: instruction.targetActivityIds,
              sourceAnchor,
              targetAnchor
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

    const element = container.querySelector(`[data-element-id="${elementId}"]`);
    if (!element) return null;

    const rect = element.getBoundingClientRect();

    return this.toLayerRect(rect, layerContainerRect);
  }

  /**
   * Converts a DOMRect from client (viewport) coordinates to SVG layer coordinates.
   * Unified conversion method used by both plan arrows and live arrow.
   *
   * @param rect - DOMRect in client coordinates
   * @param layerContainerRect - DOMRect of the .diagrams-container
   * @returns DOMRect in SVG layer coordinate system
   */
  private toLayerRect(rect: DOMRect, layerContainerRect: DOMRect): DOMRect {
    return new DOMRect(
      rect.left - layerContainerRect.left,
      rect.top - layerContainerRect.top,
      rect.width,
      rect.height
    );
  }

  private createBezierPath(sourceRect: DOMRect, targetRect: DOMRect): string {
    const x1 = sourceRect.left + sourceRect.width;
    const y1 = sourceRect.top + sourceRect.height / 2;

    const x2 = targetRect.left;
    const y2 = targetRect.top + targetRect.height / 2;

    const dx = x2 - x1;
    const dy = Math.abs(y2 - y1);

    let cp1x, cp1y, cp2x, cp2y;

    if (dy < 40) {
      const midX = x1 + dx / 2;
      const dipY = Math.max(y1, y2) + 40;

      cp1x = x1 + dx * 0.25;
      cp1y = dipY;
      cp2x = x1 + dx * 0.75;
      cp2y = dipY;
    } else {
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
    const containerX = clientX - containerRect.left;
    const containerY = clientY - containerRect.top;
    return { x: containerX, y: containerY };
  }

  private startLiveArrow(): void {
    if (!this.mappingMode || !this.mappingSourceActivityId) return;

    const container = this.hostElement.nativeElement.closest('.diagrams-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    this.viewBox.set(`0 0 ${containerRect.width} ${containerRect.height}`);
    const sourceRect = this.getElementRect(this.mappingSourceActivityId, this.sourceContainerSelector, containerRect);

    if (!sourceRect) {
      this.liveArrowPath.set(null);
      this.liveArrowStart.set(null);
      this.liveArrowEnd.set(null);
      return;
    }

    const startX = sourceRect.left + sourceRect.width;
    const startY = sourceRect.top + sourceRect.height / 2;
    this.liveArrowStart.set({ x: startX, y: startY });

    this.liveArrowEnd.set({ x: startX, y: startY });
    this.updateLiveArrowPath();
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
    this.viewBox.set(`0 0 ${containerRect.width} ${containerRect.height}`);
    const sourceRect = this.getElementRect(this.mappingSourceActivityId, this.sourceContainerSelector, containerRect);

    if (!sourceRect || !this.isRectVisible(sourceRect, containerRect)) {
      this.liveArrowPath.set(null);
      return;
    }

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
      const dipY = Math.max(y1, y2) + 40;

      cp1x = x1 + dx * 0.25;
      cp1y = dipY;
      cp2x = x1 + dx * 0.75;
      cp2y = dipY;
    } else {
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
      if (!this.shouldTrack()) {
        this.trackingLoopId = null;
        this.previousRects.clear();
        return;
      }

      const currentRects = this.readAllRects();

      if (this.rectsChanged(currentRects)) {
        this.previousRects = currentRects;
        this.scheduleUpdate();
      }
      this.trackingLoopId = requestAnimationFrame(loop);
    };
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
    const container = this.hostElement.nativeElement.closest('.diagrams-container');
    if (!container) return false;
    const hasArrows = !!(this.instructions && this.instructions.length > 0);
    const hasLiveArrow = !!(this.mappingMode && this.mappingSourceActivityId);

    return hasArrows || hasLiveArrow;
  }


  private readAllRects(): Map<string, DOMRect> {
    const rects = new Map<string, DOMRect>();
    const container = this.hostElement.nativeElement.closest('.diagrams-container');
    if (container) {
      rects.set('__container', container.getBoundingClientRect());
    }
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

  /**
   * Parses start and end points from an SVG path string.
   * Extracts coordinates from "M x y" (start) and the final coordinates (end).
   *
   * @param path - SVG path string (e.g., "M 100 150 C 200 150, 300 250, 400 250")
   * @returns Object with start and end points, or nulls if parsing fails
   */
  parsePathEndpoints(path: string): { start: Point | null; end: Point | null } {
    if (!path) {
      return { start: null, end: null };
    }

    const startMatch = path.match(/^M\s*([\d.]+)\s+([\d.]+)/);
    const endMatch = path.match(/([\d.]+)\s+([\d.]+)$/);

    const start = startMatch ? {
      x: parseFloat(startMatch[1]),
      y: parseFloat(startMatch[2])
    } : null;

    const end = endMatch ? {
      x: parseFloat(endMatch[1]),
      y: parseFloat(endMatch[2])
    } : null;

    return { start, end };
  }

  /**
   * Handles hover event on an arrow (via hit area).
   * Sets hoveredArrowIndex to show handles.
   */
  onArrowHover(index: number): void {
    this.hoveredArrowIndex.set(index);
  }

  /**
   * Handles mouse leave event on an arrow.
   * Clears hoveredArrowIndex if not selected.
   */
  onArrowLeave(): void {
    this.hoveredArrowIndex.set(null);
  }

  /**
   * Handles click event on an arrow.
   * Sets selectedArrowIndex and prevents event bubbling.
   */
  onArrowClick(index: number, event: Event): void {
    event.stopPropagation();
    this.selectedArrowIndex.set(index);
  }

  /**
   * Handles click on SVG background.
   * Clears selection.
   */
  onBackgroundClick(): void {
    this.selectedArrowIndex.set(null);
  }

  /**
   * Helper method for template: gets anchor point from rect.
   * Used to display anchor position indicators during drag.
   */
  getAnchorPoint(rect: DOMRect, anchor: string): Point {
    return anchorPoint(rect, anchor as Anchor);
  }

  /**
   * Handles pointerdown on an anchor handle.
   * Starts drag operation with pointer capture.
   */
  onHandlePointerDown(arrowIndex: number, end: 'source' | 'target', event: PointerEvent): void {
    event.stopPropagation();
    event.preventDefault();

    const arrow = this.arrows()[arrowIndex];
    if (!arrow) return;

    const instruction = this.instructions[arrow.instructionIndex];
    if (!instruction) return;

    const activityId = end === 'source'
      ? instruction.sourceActivityIds[0]
      : instruction.targetActivityIds[0];

    const containerSelector = end === 'source'
      ? this.sourceContainerSelector
      : this.targetContainerSelector;

    const container = this.hostElement.nativeElement.closest('.diagrams-container');
    if (!container) return;

    const layerContainerRect = container.getBoundingClientRect();
    const shapeRect = this.getElementRect(activityId, containerSelector, layerContainerRect);
    if (!shapeRect) return;

    const instructionKey = this.getInstructionKey(instruction);
    const anchors = this.customAnchors.get(instructionKey);
    const currentAnchor: Anchor = end === 'source'
      ? (anchors?.source || 'right')
      : (anchors?.target || 'left');

    this.draggingHandle.set({
      arrowIndex,
      end,
      initialAnchor: currentAnchor
    });
    this.dragTargetRect.set(shapeRect);

    const target = event.target as Element;
    if (target.setPointerCapture) {
      target.setPointerCapture(event.pointerId);
    }

    const moveHandler = (e: PointerEvent) => this.onHandlePointerMove(e);
    const upHandler = (e: PointerEvent) => this.onHandlePointerUp(e, moveHandler, upHandler, event.pointerId);
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.onHandleEscape(moveHandler, upHandler, escapeHandler, event.pointerId, target as Element);
      }
    };

    document.addEventListener('pointermove', moveHandler);
    document.addEventListener('pointerup', upHandler);
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Handles pointermove during anchor drag.
   * Updates preview anchor based on pointer position.
   */
  private onHandlePointerMove(event: PointerEvent): void {
    const dragState = this.draggingHandle();
    if (!dragState) return;

    const layerPoint = this.toLayerPoint(event.clientX, event.clientY);
    if (!layerPoint) return;

    this.dragPointerPos.set(layerPoint);

    const rect = this.dragTargetRect();
    if (!rect) return;

    const nearest = nearestAnchor(rect, layerPoint);
    this.dragPreviewAnchor.set(nearest);
  }

  /**
   * Handles pointerup to complete or cancel anchor drag.
   * Snaps to nearest anchor if within range, otherwise cancels.
   */
  private onHandlePointerUp(
    event: PointerEvent,
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    pointerId: number
  ): void {
    document.removeEventListener('pointermove', moveHandler);
    document.removeEventListener('pointerup', upHandler);
    document.removeEventListener('keydown', this.findEscapeHandler(moveHandler, upHandler));

    const dragState = this.draggingHandle();
    if (!dragState) return;

    const layerPoint = this.toLayerPoint(event.clientX, event.clientY);
    const rect = this.dragTargetRect();

    const target = event.target as Element;
    if (target.releasePointerCapture) {
      try {
        target.releasePointerCapture(pointerId);
      } catch (e) {
      }
    }

    if (layerPoint && rect) {
      const distance = this.distanceToRect(layerPoint, rect);

      if (distance <= 80) {
        const nearest = nearestAnchor(rect, layerPoint);
        this.applyAnchorChange(dragState.arrowIndex, dragState.end, nearest);
      }
    }

    this.draggingHandle.set(null);
    this.dragTargetRect.set(null);
    this.dragPreviewAnchor.set(null);
    this.dragPointerPos.set(null);
  }

  /**
   * Handles Escape key to cancel drag.
   */
  private onHandleEscape(
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number,
    target: Element
  ): void {
    document.removeEventListener('pointermove', moveHandler);
    document.removeEventListener('pointerup', upHandler);
    document.removeEventListener('keydown', escapeHandler);

    if (target.releasePointerCapture) {
      try {
        target.releasePointerCapture(pointerId);
      } catch (e) {
      }
    }

    this.draggingHandle.set(null);
    this.dragTargetRect.set(null);
    this.dragPreviewAnchor.set(null);
    this.dragPointerPos.set(null);
  }

  /**
   * Placeholder for finding escape handler (TypeScript limitation workaround).
   */
  private findEscapeHandler(moveHandler: any, upHandler: any): (e: KeyboardEvent) => void {
    // Return a no-op since we'll remove in escape handler itself
    return () => {};
  }

  /**
   * Calculates distance from a point to the nearest edge of a rectangle.
   */
  private distanceToRect(point: Point, rect: DOMRect): number {
    const closestX = Math.max(rect.left, Math.min(point.x, rect.left + rect.width));
    const closestY = Math.max(rect.top, Math.min(point.y, rect.top + rect.height));

    const dx = point.x - closestX;
    const dy = point.y - closestY;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Applies anchor change and emits to parent component.
   */
  private applyAnchorChange(arrowIndex: number, end: 'source' | 'target', newAnchor: Anchor): void {
    const arrow = this.arrows()[arrowIndex];
    if (!arrow) return;

    const instruction = this.instructions[arrow.instructionIndex];
    if (!instruction) return;

    const instructionKey = this.getInstructionKey(instruction);

    const currentAnchors = this.customAnchors.get(instructionKey);
    const currentSource: Anchor = currentAnchors?.source || 'right';
    const currentTarget: Anchor = currentAnchors?.target || 'left';

    const newAnchors = {
      source: end === 'source' ? newAnchor : currentSource,
      target: end === 'target' ? newAnchor : currentTarget
    };

    const newMap = new Map(this.customAnchors);
    newMap.set(instructionKey, newAnchors);

    this.anchorsChanged.emit(newMap);

    this.scheduleUpdate();
  }

  /**
   * Gets instruction key for anchor map.
   * Uses shared getAnchorKey function to ensure consistent key format.
   */
  private getInstructionKey(instruction: MigrationInstructionDto): string {
    return getAnchorKey(instruction.sourceActivityIds[0], instruction.targetActivityIds[0]);
  }
}