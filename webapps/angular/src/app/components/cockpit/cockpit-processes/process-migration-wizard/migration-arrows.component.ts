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
import {
  buildOrthogonalRoute,
  routeToPath,
  sidePoint,
  midSegment,
  Side,
  Rect,
  Point as RoutePoint
} from './migration-arrow-route';
import {
  initialWaypoints,
  repairWaypoints,
  waypointsToPath,
  cleanWaypoints,
  segments,
  segmentBarPosition,
  moveSegment,
  moveWaypoint,
  moveDock,
  nearestAnchorSnap,
  snapToSideMiddle,
  nearestPerimeterPoint,
  dockPoint,
  startMarkerPosition,
  endArrowhead,
  Point as WaypointPoint,
  Rect as WaypointRect,
  Side as WaypointSide
} from './migration-waypoints';


export interface RouteParams {
  source?: Anchor;
  target?: Anchor;

  waypoints?: Point[] | null;

  startSide?: Side;
  startT?: number;
  endSide?: Side;
  endT?: number;

  midOffset?: number | null;
  bridgeY?: number | null;
}

interface ArrowPath {
  instructionIndex: number;
  path: string;
  valid: boolean;
  visible: boolean;
  sourceIds: string[];
  targetIds: string[];
  sourceAnchor: Anchor;
  targetAnchor: Anchor;
  startSide?: Side;
  startT?: number;
  endSide?: Side;
  endT?: number;
  midOffset?: number | null;
  bridgeY?: number | null;
  points?: RoutePoint[];
}

@Component({
  selector: 'app-migration-arrows',
  standalone: true,
  imports: [CommonModule],
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
             [attr.data-arrow-index]="i"
             [class.arrow-group--hovered]="hoveredArrowIndex() === i"
             [class.arrow-group--selected]="selectedArrowIndex() === i"
             [class.arrow-group--dragging]="draggingHandle()?.arrowIndex === i"
             (mouseenter)="onArrowHover(i)"
             (mouseleave)="onArrowLeave()">
            @let effectivePath = getEffectivePath(i, arrow);
            <!-- Hit area: transparent path with wider stroke for easier clicking -->
            <path
              [attr.d]="effectivePath"
              stroke-width="14"
              fill="none"
              stroke="transparent"
              stroke-linecap="round"
              class="arrow-hit-area"
              (click)="onArrowClick(i, $event)">
            </path>
            <!-- Visible arrow path -->
            <path
              [attr.d]="effectivePath"
              stroke-width="2"
              fill="none"
              stroke-linecap="round"
              [attr.data-instruction-index]="arrow.instructionIndex"
              class="migration-arrow"
              [class.migration-arrow--valid]="arrow.valid"
              [class.migration-arrow--invalid]="!arrow.valid">
            </path>
            <!-- Start marker: small circle at arrow origin -->
            @if (arrow.points && arrow.points.length > 0) {
              @let startMarker = getStartMarker(arrow.points);
              <circle
                [attr.cx]="startMarker.x"
                [attr.cy]="startMarker.y"
                r="3"
                class="migration-arrow-start-marker"
                [class.migration-arrow-start-marker--valid]="arrow.valid"
                [class.migration-arrow-start-marker--invalid]="!arrow.valid"
                style="pointer-events: none">
              </circle>
            }
            <!-- End arrowhead: triangle pointing in direction of last segment -->
            @if (arrow.points && arrow.points.length > 0) {
              @let arrowhead = getEndArrowhead(arrow.points);
              <polygon
                points="-8,-4 0,0 -8,4"
                [attr.transform]="'translate(' + arrowhead.x + ',' + arrowhead.y + ') rotate(' + arrowhead.angleDeg + ')'"
                class="migration-arrow-end-marker"
                [class.migration-arrow-end-marker--valid]="arrow.valid"
                [class.migration-arrow-end-marker--invalid]="!arrow.valid"
                style="pointer-events: none">
              </polygon>
            }
            <!-- Selection handles: always in DOM, visibility controlled by CSS -->
            @if (!mappingMode) {
              @let handles = getSelectionHandles(arrow);
              @let bars = getSegmentBars(arrow);
              @let showDecors = selectedArrowIndex() === i || hoveredArrowIndex() === i || draggingHandle()?.arrowIndex === i;

              <!-- Blue circles at all route points (endpoints + corners) - W-A model -->
              @if (handles) {
                @for (handle of handles; track '|wp-' + $index) {
                  <circle
                    [attr.cx]="handle.x"
                    [attr.cy]="handle.y"
                    r="5"
                    class="selection-handle-point"
                    [class.selection-handle-point--visible]="showDecors"
                    [style.cursor]="$index === 0 || $index === handles.length - 1 ? 'grab' : 'move'"
                    [style.pointer-events]="showDecors ? 'all' : 'none'"
                    (pointerdown)="onWaypointPointerDown(i, $index, $event)">
                  </circle>
                }
              }
              <!-- Segment bars: blue rectangle on EACH segment - W-A model -->
              @if (bars.length > 0) {
                @for (bar of bars; track '|bar-' + bar.segmentIndex) {
                  <rect
                    [attr.x]="bar.x"
                    [attr.y]="bar.y"
                    [attr.width]="bar.width"
                    [attr.height]="bar.height"
                    class="selection-handle-bar"
                    [class.selection-handle-bar--visible]="showDecors"
                    [class.selection-handle-bar--horizontal]="bar.orientation === 'horizontal'"
                    [class.selection-handle-bar--vertical]="bar.orientation === 'vertical'"
                    [style.cursor]="bar.orientation === 'horizontal' ? 'ns-resize' : 'ew-resize'"
                    [style.pointer-events]="showDecors ? 'all' : 'none'"
                    (pointerdown)="onSegmentBarPointerDown(i, bar.segmentIndex, bar.orientation, $event)">
                  </rect>
                  <!-- Draggable area: extended hit zone for segment -->
                  @if (bar.orientation === 'horizontal') {
                    <rect
                      [attr.x]="bar.x"
                      [attr.y]="bar.y - 7"
                      [attr.width]="bar.width"
                      [attr.height]="14"
                      class="segment-drag-zone"
                      [style.cursor]="'ns-resize'"
                      [style.fill]="'transparent'"
                      [style.pointer-events]="showDecors ? 'stroke' : 'none'"
                      (pointerdown)="onSegmentBarPointerDown(i, bar.segmentIndex, bar.orientation, $event)">
                    </rect>
                  } @else {
                    <rect
                      [attr.x]="bar.x - 7"
                      [attr.y]="bar.y"
                      [attr.width]="14"
                      [attr.height]="bar.height"
                      class="segment-drag-zone"
                      [style.cursor]="'ew-resize'"
                      [style.fill]="'transparent'"
                      [style.pointer-events]="showDecors ? 'stroke' : 'none'"
                      (pointerdown)="onSegmentBarPointerDown(i, bar.segmentIndex, bar.orientation, $event)">
                    </rect>
                  }
                }
              }
            }
          </g>
        }
      }

      <!-- Anchor position indicators during drag (W-A: old anchor drag + W-B: endpoint waypoint drag) -->
      @if ((draggingHandle() || (draggingWaypoint() && draggingWaypoint()?.isEndpoint)) && dragTargetRect()) {
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

    .migration-arrow-start-marker {
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    .migration-arrow-start-marker--valid {
      fill: var(--color-success, #22c55e);
    }

    .migration-arrow-start-marker--invalid {
      fill: var(--color-danger, #ef4444);
    }

    .migration-arrow-end-marker {
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    .migration-arrow-end-marker--valid {
      fill: var(--color-success, #22c55e);
    }

    .migration-arrow-end-marker--invalid {
      fill: var(--color-danger, #ef4444);
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

    /* Selection handles for orthogonal routing */
    .selection-handle-point {
      fill: var(--primary, #3b82f6);
      stroke: white;
      stroke-width: 1.5;
      pointer-events: none;
      /* Hidden by default, shown on hover/select */
      opacity: 0;
      visibility: hidden;
      /* Smooth transitions: opacity instant, visibility delayed on hide */
      transition: opacity 120ms ease, visibility 0s linear 160ms;
      /* No transition on position (cx/cy) */
    }

    .selection-handle-point--visible {
      opacity: 0.9;
      visibility: visible;
      /* Remove visibility delay on show */
      transition: opacity 120ms ease, visibility 0s linear;
    }

    .selection-handle-bar {
      fill: var(--primary, #3b82f6);
      stroke: white;
      stroke-width: 1.5;
      pointer-events: none;
      rx: 3;
      ry: 3;
      /* Hidden by default, shown on hover/select */
      opacity: 0;
      visibility: hidden;
      /* Smooth transitions: opacity instant, visibility delayed on hide */
      transition: opacity 120ms ease, visibility 0s linear 160ms;
      /* No transition on position (x/y) */
    }

    .selection-handle-bar--visible {
      opacity: 0.8;
      visibility: visible;
      /* Remove visibility delay on show */
      transition: opacity 120ms ease, visibility 0s linear;
    }

    /* Draggable zone for center segment - extended hit area */
    .center-segment-drag-zone {
      fill: transparent;
      stroke: none;
      pointer-events: all;
      /* Cursor set inline based on orientation */
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
  @Input() customAnchors: Map<string, RouteParams> = new Map();

  @Output() anchorsChanged = new EventEmitter<Map<string, RouteParams>>();

  arrows = signal<ArrowPath[]>([]);
  viewBox = signal<string>('0 0 1920 1080');
  liveArrowPath = signal<string | null>(null);
  liveArrowStart = signal<{ x: number; y: number } | null>(null);
  liveArrowEnd = signal<{ x: number; y: number } | null>(null);

  selectedArrowIndex = signal<number | null>(null);
  hoveredArrowIndex = signal<number | null>(null);
  draggingHandle = signal<{ arrowIndex: number; end: 'source' | 'target'; initialAnchor: Anchor; isSnapping?: boolean; snapTarget?: Anchor } | null>(null);
  draggingCenterSegment = signal<{
    arrowIndex: number;
    initialMidOffset: number;
    initialPointerPos: Point;
    orientation: 'horizontal' | 'vertical';
  } | null>(null);
  draggingBridgeCreate = signal<{
    arrowIndex: number;
    initialPointerY: number;
    initialBridgeY: number;
  } | null>(null);

  draggingWaypoint = signal<{
    arrowIndex: number;
    waypointIndex: number;
    isEndpoint: boolean;
    initialWaypoints: Point[];
    initialPointerPos: Point;
  } | null>(null);

  draggingSegment = signal<{
    arrowIndex: number;
    segmentIndex: number;
    orientation: 'horizontal' | 'vertical';
    initialWaypoints: Point[];
    initialPointerPos: Point;
  } | null>(null);

  dragPreviewAnchor = signal<Anchor | null>(null);
  dragTargetRect = signal<DOMRect | null>(null);
  dragPointerPos = signal<Point | null>(null);

  private snapStartTime: number = 0;

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

    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleUpdate();
    });
    this.resizeObserver.observe(diagramsContainer);

    this.setupViewboxListeners();

    const scrollListener = () => {
      this.scheduleUpdate();
    };
    diagramsContainer.addEventListener('scroll', scrollListener);
    this.viewboxChangeListeners.push(() => {
      diagramsContainer.removeEventListener('scroll', scrollListener);
    });
  }

  private setupViewboxListeners(): void {
    const sourceContainer = document.querySelector(this.sourceContainerSelector);
    const targetContainer = document.querySelector(this.targetContainerSelector);

    [sourceContainer, targetContainer].forEach(container => {
      if (!container) return;

      const bpmnContainer = container.closest('.bpmn-viewer-container, .bjs-container');
      if (!bpmnContainer) return;

      try {
        const viewerInstance = (bpmnContainer as any).__bpmnViewer ||
                               (container as any).__bpmnViewer ||
                               this.findViewerInstance(container);

        if (viewerInstance) {
          const eventBus = viewerInstance.get('eventBus');
          if (eventBus) {
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
      }

      this.setupDOMListeners(container);
    });
  }

  private findViewerInstance(container: Element): any {
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
      const shouldShow = this.showAll || this.visibleInstructionIndices.has(index);
      if (!shouldShow) return;

      const instrReport = this.report?.instructionReports?.[index];
      const valid = !instrReport?.failures || instrReport.failures.length === 0;

      instruction.sourceActivityIds.forEach(sourceId => {
        instruction.targetActivityIds.forEach(targetId => {
          const sourceRect = this.getElementRect(sourceId, this.sourceContainerSelector, containerRect);
          const targetRect = this.getElementRect(targetId, this.targetContainerSelector, containerRect);

          if (sourceRect && targetRect) {
            const instructionKey = sourceId + '-' + targetId;
            const routeParams = this.customAnchors.get(instructionKey);

            let startSide: Side;
            let startT: number;
            let endSide: Side;
            let endT: number;
            let storedWaypoints: Point[] | null | undefined;

            if (routeParams && routeParams.startSide !== undefined) {
              startSide = routeParams.startSide!;
              startT = routeParams.startT ?? 0.5;
              endSide = routeParams.endSide!;
              endT = routeParams.endT ?? 0.5;

              if (routeParams.waypoints !== undefined) {
                storedWaypoints = routeParams.waypoints;
              } else if (routeParams.midOffset !== undefined || routeParams.bridgeY !== undefined) {
                storedWaypoints = null;
              } else {
                storedWaypoints = null;
              }
            } else if (routeParams && (routeParams.source || routeParams.target)) {
              startSide = (routeParams.source as Side) || 'right';
              startT = 0.5;
              endSide = (routeParams.target as Side) || 'left';
              endT = 0.5;
              storedWaypoints = null;
            } else {
              startSide = 'right';
              startT = 0.5;
              endSide = 'left';
              endT = 0.5;
              storedWaypoints = null;
            }

            const sourceRectData: WaypointRect = {
              left: sourceRect.left,
              top: sourceRect.top,
              width: sourceRect.width,
              height: sourceRect.height
            };

            const targetRectData: WaypointRect = {
              left: targetRect.left,
              top: targetRect.top,
              width: targetRect.width,
              height: targetRect.height
            };

            let points: WaypointPoint[];
            if (storedWaypoints === null || storedWaypoints === undefined) {
              points = initialWaypoints(sourceRectData, targetRectData, startSide, startT, endSide, endT);
            } else {
              points = repairWaypoints(storedWaypoints, sourceRectData, targetRectData, startSide, startT, endSide, endT);
            }

            const path = waypointsToPath(points);
            const visible = this.isRectVisible(sourceRect, containerRect) && this.isRectVisible(targetRect, containerRect);

            const sourceAnchor = startSide as Anchor;
            const targetAnchor = endSide as Anchor;

            arrowPaths.push({
              instructionIndex: index,
              path,
              valid,
              visible,
              sourceIds: instruction.sourceActivityIds,
              targetIds: instruction.targetActivityIds,
              sourceAnchor,
              targetAnchor,
              startSide,
              startT,
              endSide,
              endT,
              midOffset: null,
              bridgeY: null,
              points
            });
          }
        });
      });
    });

    this.arrows.set(arrowPaths);

    if (this.mappingMode && this.mappingSourceActivityId) {
      this.updateLiveArrowPath();
    }

    this.cdr.markForCheck();
  }

  getSelectionHandles(arrow: ArrowPath): RoutePoint[] | null {
    if (!arrow.points || arrow.points.length === 0) {
      return null;
    }
    return arrow.points;
  }

  getSegmentBars(arrow: ArrowPath): Array<{ x: number; y: number; width: number; height: number; orientation: 'horizontal' | 'vertical'; segmentIndex: number }> {
    if (!arrow.points || arrow.points.length < 2) {
      return [];
    }

    const segs = segments(arrow.points);
    return segs.map(seg => {
      const center = segmentBarPosition(seg);

      if (seg.orientation === 'horizontal') {
        return {
          x: center.x - 10,
          y: center.y - 3,
          width: 20,
          height: 6,
          orientation: 'horizontal' as const,
          segmentIndex: seg.index
        };
      } else {
        return {
          x: center.x - 3,
          y: center.y - 10,
          width: 6,
          height: 20,
          orientation: 'vertical' as const,
          segmentIndex: seg.index
        };
      }
    });
  }

  getStartMarker(points: WaypointPoint[]): { x: number; y: number } {
    return startMarkerPosition(points);
  }

  getEndArrowhead(points: WaypointPoint[]): { x: number; y: number; angleDeg: number } {
    return endArrowhead(points);
  }


  getCenterBar(arrow: ArrowPath): { x: number; y: number; width: number; height: number; orientation: 'horizontal' | 'vertical' } | null {
    const bars = this.getSegmentBars(arrow);
    if (bars.length === 0) return null;
    const middleIndex = Math.floor(bars.length / 2);
    return bars[middleIndex];
  }

  getHorizontalBridgeZones(arrow: ArrowPath): Array<{ x: number; y: number; width: number; height: number }> | null {
    // Only for routes without bridge
    if (arrow.bridgeY !== null && arrow.bridgeY !== undefined) {
      return null;
    }

    if (!arrow.points || arrow.points.length < 3) {
      return null;
    }

    const points = arrow.points;

    if (points.length === 4) {
      const seg0Horizontal = Math.abs(points[1].y - points[0].y) < 0.01;
      const seg2Horizontal = Math.abs(points[3].y - points[2].y) < 0.01;

      if (seg0Horizontal && seg2Horizontal) {
        return [
          {
            x: Math.min(points[0].x, points[1].x),
            y: points[0].y - 7,
            width: Math.abs(points[1].x - points[0].x),
            height: 14
          },
          {
            x: Math.min(points[2].x, points[3].x),
            y: points[2].y - 7,
            width: Math.abs(points[3].x - points[2].x),
            height: 14
          }
        ];
      }
    } else if (points.length === 3) {
      const allSameY = points.every(p => Math.abs(p.y - points[0].y) < 0.01);
      if (allSameY) {
        const minX = Math.min(points[0].x, points[1].x, points[2].x);
        const maxX = Math.max(points[0].x, points[1].x, points[2].x);
        return [
          {
            x: minX,
            y: points[0].y - 7,
            width: maxX - minX,
            height: 14
          }
        ];
      }
    }

    return null;
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
        return true;
      }

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
   * @param path
   * @returns
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
   * Gets effective path for an arrow (elastic during drag, static otherwise).
   */
  /**
   * Returns the path to display for an arrow.
   * Note: Drag animation removed in R1 - will be reimplemented in R2.
   */
  getEffectivePath(arrowIndex: number, arrow: ArrowPath): string {
    return arrow.path;
  }

  /**
   * Gets handle positions for an arrow (dragPointerPos during drag, anchorPoint otherwise).
   */
  getHandlePositions(arrowIndex: number, arrow: ArrowPath): { start: Point | null; end: Point | null } {
    const dragState = this.draggingHandle();
    const instruction = this.instructions[arrow.instructionIndex];
    if (!instruction) {
      return { start: null, end: null };
    }

    const container = this.hostElement.nativeElement.closest('.diagrams-container');
    if (!container) {
      return { start: null, end: null };
    }

    const containerRect = container.getBoundingClientRect();
    const sourceRect = this.getElementRect(instruction.sourceActivityIds[0], this.sourceContainerSelector, containerRect);
    const targetRect = this.getElementRect(instruction.targetActivityIds[0], this.targetContainerSelector, containerRect);

    if (!sourceRect || !targetRect) {
      return { start: null, end: null };
    }

    let startPos: Point;
    let endPos: Point;

    if (dragState && dragState.arrowIndex === arrowIndex) {
      if (dragState.isSnapping && dragState.snapTarget) {
        const snapRect = dragState.end === 'source' ? sourceRect : targetRect;
        const snapPoint = anchorPoint(snapRect, dragState.snapTarget);

        if (dragState.end === 'source') {
          startPos = snapPoint;
          endPos = anchorPoint(targetRect, arrow.targetAnchor);
        } else {
          startPos = anchorPoint(sourceRect, arrow.sourceAnchor);
          endPos = snapPoint;
        }
      } else {
        const dragPos = this.dragPointerPos();
        if (dragState.end === 'source' && dragPos) {
          startPos = dragPos;
          endPos = anchorPoint(targetRect, arrow.targetAnchor);
        } else if (dragState.end === 'target' && dragPos) {
          startPos = anchorPoint(sourceRect, arrow.sourceAnchor);
          endPos = dragPos;
        } else {
          startPos = anchorPoint(sourceRect, arrow.sourceAnchor);
          endPos = anchorPoint(targetRect, arrow.targetAnchor);
        }
      }
    } else {
      startPos = anchorPoint(sourceRect, arrow.sourceAnchor);
      endPos = anchorPoint(targetRect, arrow.targetAnchor);
    }

    return { start: startPos, end: endPos };
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

    const fixedEnd = end === 'source' ? 'target' : 'source';
    const fixedRect = end === 'source' ? this.getElementRect(instruction.targetActivityIds[0], this.targetContainerSelector, layerContainerRect) : shapeRect;

    if (fixedRect) {
      const fixedAnchor = end === 'source' ? (this.customAnchors.get(this.getInstructionKey(instruction))?.target || 'left') : currentAnchor;
    }

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

    let snapTarget: Anchor;
    if (layerPoint && rect) {
      const distance = this.distanceToRect(layerPoint, rect);

      if (distance <= 80) {
        snapTarget = nearestAnchor(rect, layerPoint);
      } else {
        snapTarget = dragState.initialAnchor;
      }
    } else {
      snapTarget = dragState.initialAnchor;
    }

    this.snapStartTime = performance.now();
    this.draggingHandle.set({
      ...dragState,
      isSnapping: true,
      snapTarget
    });
    this.dragPreviewAnchor.set(snapTarget);
  }

  /**
   * Handles Escape key to cancel drag.
   * Starts snap animation back to initial anchor.
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

    const dragState = this.draggingHandle();
    if (!dragState) return;

    this.snapStartTime = performance.now();
    this.draggingHandle.set({
      ...dragState,
      isSnapping: true,
      snapTarget: dragState.initialAnchor
    });
    this.dragPreviewAnchor.set(dragState.initialAnchor);
  }

  /**
   * Placeholder for finding escape handler (TypeScript limitation workaround).
   */
  private findEscapeHandler(moveHandler: any, upHandler: any): (e: KeyboardEvent) => void {
    // Return a no-op since we'll remove in escape handler itself
    return () => {};
  }

  /**
   * Handles pointerdown on center segment drag zone.
   * CRITICAL: stopPropagation + preventDefault to prevent bpmn-js from panning.
   * PUBLIC: Called from template.
   */
  onCenterSegmentPointerDown(arrowIndex: number, bar: any, event: PointerEvent): void {
    event.stopPropagation();
    event.preventDefault();

    const arrow = this.arrows()[arrowIndex];
    if (!arrow || !arrow.points || arrow.points.length < 3) return;
    const currentMidOffset = arrow.midOffset ?? 0;
    const initialPointerPos = this.toLayerPoint(event.clientX, event.clientY);
    if (!initialPointerPos) return;
    const mid = midSegment(arrow.points);
    this.draggingCenterSegment.set({
      arrowIndex,
      initialMidOffset: currentMidOffset,
      initialPointerPos,
      orientation: mid.orientation
    });

    const target = event.currentTarget as Element;
    target.setPointerCapture(event.pointerId);

    const moveHandler = (e: PointerEvent) => this.onCenterSegmentPointerMove(e);
    let escapeHandler: ((e: KeyboardEvent) => void) | null = null;
    let cancelHandler: ((e: PointerEvent) => void) | null = null;
    let lostCaptureHandler: ((e: Event) => void) | null = null;
    let upHandler: ((e: PointerEvent) => void) | null = null;

    escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && escapeHandler && upHandler && cancelHandler && lostCaptureHandler) {
        this.onCenterSegmentEscape(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, event.pointerId);
      }
    };

    upHandler = (e: PointerEvent) => {
      if (upHandler && cancelHandler && lostCaptureHandler && escapeHandler) {
        this.onCenterSegmentPointerUp(e, moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, event.pointerId);
      }
    };

    cancelHandler = (e: PointerEvent) => {
      if (upHandler && cancelHandler && lostCaptureHandler && escapeHandler) {
        this.onCenterSegmentCancel(e, moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, event.pointerId);
      }
    };

    lostCaptureHandler = (e: Event) => {
      if (upHandler && cancelHandler && lostCaptureHandler && escapeHandler) {
        this.onCenterSegmentLostCapture(e, moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, event.pointerId);
      }
    };

    document.addEventListener('pointermove', moveHandler);
    document.addEventListener('pointerup', upHandler);
    document.addEventListener('pointercancel', cancelHandler);
    target.addEventListener('lostpointercapture', lostCaptureHandler);
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Handles pointermove during center segment drag.
   * FORMULA WITHOUT JUMP: midOffset = initialMidOffset + (currentPos - initialPos) projected on axis
   */
  private onCenterSegmentPointerMove(event: PointerEvent): void {
    const dragState = this.draggingCenterSegment();
    if (!dragState) return;

    const currentPointerPos = this.toLayerPoint(event.clientX, event.clientY);
    if (!currentPointerPos) return;

    const deltaX = currentPointerPos.x - dragState.initialPointerPos.x;
    const deltaY = currentPointerPos.y - dragState.initialPointerPos.y;

    let deltaMidOffset: number;
    if (dragState.orientation === 'horizontal') {
      deltaMidOffset = deltaY;
    } else {
      deltaMidOffset = deltaX;
    }

    const newMidOffset = dragState.initialMidOffset + deltaMidOffset;
    this.updateArrowMidOffset(dragState.arrowIndex, newMidOffset);
  }

  /**
   * Handles pointerup to finalize center segment drag.
   */
  private onCenterSegmentPointerUp(
    event: PointerEvent,
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number
  ): void {
    this.cleanupCenterSegmentDrag(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, pointerId, event.currentTarget as Element);
    this.draggingCenterSegment.set(null);
  }

  /**
   * Handles Escape key to cancel center segment drag and restore initial state.
   */
  private onCenterSegmentEscape(
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number
  ): void {
    const dragState = this.draggingCenterSegment();
    if (!dragState) return;

    this.updateArrowMidOffset(dragState.arrowIndex, dragState.initialMidOffset);

    const dragZones = document.querySelectorAll('.center-segment-drag-zone');
    const target = dragZones[dragState.arrowIndex] as Element;

    this.cleanupCenterSegmentDrag(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, pointerId, target);
    this.draggingCenterSegment.set(null);
  }

  /**
   * Handles pointercancel to abort center segment drag.
   */
  private onCenterSegmentCancel(
    event: PointerEvent,
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number
  ): void {
    const dragState = this.draggingCenterSegment();
    if (!dragState) return;
    this.updateArrowMidOffset(dragState.arrowIndex, dragState.initialMidOffset);
    this.cleanupCenterSegmentDrag(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, pointerId, event.currentTarget as Element);
    this.draggingCenterSegment.set(null);
  }

  /**
   * Handles lostpointercapture to abort center segment drag.
   */
  private onCenterSegmentLostCapture(
    event: Event,
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number
  ): void {
    const dragState = this.draggingCenterSegment();
    if (!dragState) return;
    this.updateArrowMidOffset(dragState.arrowIndex, dragState.initialMidOffset);
    this.cleanupCenterSegmentDrag(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, pointerId, event.currentTarget as Element);
    this.draggingCenterSegment.set(null);
  }

  /**
   * Common cleanup for all center segment drag end scenarios.
   */
  private cleanupCenterSegmentDrag(
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number,
    target: Element
  ): void {
    document.removeEventListener('pointermove', moveHandler);
    document.removeEventListener('pointerup', upHandler);
    document.removeEventListener('pointercancel', cancelHandler);
    target.removeEventListener('lostpointercapture', lostCaptureHandler);
    document.removeEventListener('keydown', escapeHandler);

    if (target.releasePointerCapture) {
      try {
        target.releasePointerCapture(pointerId);
      } catch (e) {
      }
    }
  }

  /**
   * Handles pointerdown on horizontal segments to create bridge.
   * Creates bridge (bridgeY) by dragging vertically.
   */
  onBridgeCreatePointerDown(arrowIndex: number, event: PointerEvent): void {
    event.stopPropagation();
    event.preventDefault();

    const arrow = this.arrows()[arrowIndex];
    if (!arrow) return;

    const target = event.currentTarget as Element;
    target.setPointerCapture(event.pointerId);
    this.draggingBridgeCreate.set({
      arrowIndex,
      initialPointerY: event.clientY,
      initialBridgeY: 0
    });

    const moveHandler = (e: PointerEvent) => this.onBridgeCreatePointerMove(e);
    const upHandler = (e: PointerEvent) => this.onBridgeCreatePointerUp(e, moveHandler, upHandler, cancelHandler!, lostCaptureHandler!, escapeHandler!, e.pointerId);
    const cancelHandler = (e: PointerEvent) => this.onBridgeCreatePointerCancel(e, moveHandler, upHandler, cancelHandler, lostCaptureHandler!, escapeHandler!, e.pointerId);
    let lostCaptureHandler: ((e: Event) => void) | null = null;
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.onBridgeCreateEscape(moveHandler, upHandler, cancelHandler, lostCaptureHandler!, escapeHandler, event.pointerId);
      }
    };

    lostCaptureHandler = (e: Event) => {
      if (upHandler && cancelHandler && lostCaptureHandler && escapeHandler) {
        this.onBridgeCreateLostCapture(e, moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, event.pointerId);
      }
    };

    document.addEventListener('pointermove', moveHandler);
    document.addEventListener('pointerup', upHandler);
    document.addEventListener('pointercancel', cancelHandler);
    target.addEventListener('lostpointercapture', lostCaptureHandler);
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Handles pointermove during bridge creation.
   * Updates bridgeY = vertical displacement from initial position.
   */
  private onBridgeCreatePointerMove(event: PointerEvent): void {
    const dragState = this.draggingBridgeCreate();
    if (!dragState) return;

    const arrow = this.arrows()[dragState.arrowIndex];
    if (!arrow || !arrow.points) return;

    const deltaY = event.clientY - dragState.initialPointerY;
    const bridgeY = dragState.initialBridgeY + deltaY;
    this.updateArrowBridgeY(dragState.arrowIndex, bridgeY);
  }

  private onBridgeCreatePointerUp(
    event: PointerEvent,
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number
  ): void {
    this.cleanupBridgeCreateDrag(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, pointerId, event.currentTarget as Element);

    const dragState = this.draggingBridgeCreate();
    if (!dragState) return;

    const arrow = this.arrows()[dragState.arrowIndex];
    if (!arrow) return;

    const currentBridgeY = arrow.bridgeY ?? 0;
    if (Math.abs(currentBridgeY) < 4) {
      this.updateArrowBridgeY(dragState.arrowIndex, null);
    }

    this.draggingBridgeCreate.set(null);
  }

  /**
   * Handles pointercancel during bridge creation.
   * Cancels bridge creation (set bridgeY = null).
   */
  private onBridgeCreatePointerCancel(
    event: PointerEvent,
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number
  ): void {
    const dragState = this.draggingBridgeCreate();
    if (!dragState) return;

    this.updateArrowBridgeY(dragState.arrowIndex, null);

    this.cleanupBridgeCreateDrag(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, pointerId, event.currentTarget as Element);
    this.draggingBridgeCreate.set(null);
  }

  /**
   * Handles Escape key during bridge creation.
   * Cancels bridge creation.
   */
  private onBridgeCreateEscape(
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number
  ): void {
    const dragState = this.draggingBridgeCreate();
    if (!dragState) return;

    this.updateArrowBridgeY(dragState.arrowIndex, null);

    const bridgeZones = document.querySelectorAll('.bridge-create-zone');
    const target = bridgeZones[0] as Element;

    this.cleanupBridgeCreateDrag(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, pointerId, target);
    this.draggingBridgeCreate.set(null);
  }

  /**
   * Handles lostpointercapture during bridge creation.
   * Cancels bridge creation.
   */
  private onBridgeCreateLostCapture(
    event: Event,
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number
  ): void {
    const dragState = this.draggingBridgeCreate();
    if (!dragState) return;

    this.updateArrowBridgeY(dragState.arrowIndex, null);

    this.cleanupBridgeCreateDrag(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, pointerId, event.currentTarget as Element);
    this.draggingBridgeCreate.set(null);
  }

  /**
   * Cleans up event listeners and pointer capture for bridge creation drag.
   */
  private cleanupBridgeCreateDrag(
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number,
    target: Element
  ): void {
    document.removeEventListener('pointermove', moveHandler);
    document.removeEventListener('pointerup', upHandler);
    document.removeEventListener('pointercancel', cancelHandler);
    target.removeEventListener('lostpointercapture', lostCaptureHandler);
    document.removeEventListener('keydown', escapeHandler);

    if (target.releasePointerCapture) {
      try {
        target.releasePointerCapture(pointerId);
      } catch (e) {
      }
    }
  }

  /**
   * Updates midOffset for an arrow and recalculates routes.
   */
  private updateArrowMidOffset(arrowIndex: number, newMidOffset: number): void {
    const arrow = this.arrows()[arrowIndex];
    if (!arrow) return;

    const instruction = this.instructions[arrow.instructionIndex];
    if (!instruction) return;

    const key = `${instruction.sourceActivityIds[0]}_${instruction.targetActivityIds[0]}`;
    const currentParams = this.customAnchors.get(key);
    const updatedParams: RouteParams = {
      ...currentParams,
      midOffset: newMidOffset
    };

    const newMap = new Map(this.customAnchors);
    newMap.set(key, updatedParams);
    this.anchorsChanged.emit(newMap);
  }

  /**
   * Updates bridgeY for an arrow and recalculates routes.
   */
  private updateArrowBridgeY(arrowIndex: number, newBridgeY: number | null): void {
    const arrow = this.arrows()[arrowIndex];
    if (!arrow) return;

    const instruction = this.instructions[arrow.instructionIndex];
    if (!instruction) return;

    const key = `${instruction.sourceActivityIds[0]}_${instruction.targetActivityIds[0]}`;
    const currentParams = this.customAnchors.get(key);
    const updatedParams: RouteParams = {
      ...currentParams,
      bridgeY: newBridgeY
    };

    const newMap = new Map(this.customAnchors);
    newMap.set(key, updatedParams);
    this.anchorsChanged.emit(newMap);
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
   * Updates the new orthogonal routing format while maintaining backward compatibility.
   */
  private applyAnchorChange(arrowIndex: number, end: 'source' | 'target', newAnchor: Anchor): void {
    const arrow = this.arrows()[arrowIndex];
    if (!arrow) return;

    const instruction = this.instructions[arrow.instructionIndex];
    if (!instruction) return;

    const instructionKey = this.getInstructionKey(instruction);

    const currentParams = this.customAnchors.get(instructionKey);

    let currentStartSide: Side = currentParams?.startSide || (currentParams?.source as Side) || 'right';
    let currentStartT: number = currentParams?.startT ?? 0.5;
    let currentEndSide: Side = currentParams?.endSide || (currentParams?.target as Side) || 'left';
    let currentEndT: number = currentParams?.endT ?? 0.5;
    let currentMidOffset: number | null = currentParams?.midOffset ?? null;

    if (end === 'source') {
      currentStartSide = newAnchor as Side;
    } else {
      currentEndSide = newAnchor as Side;
    }

    const newRouteParams: RouteParams = {
      startSide: currentStartSide,
      startT: currentStartT,
      endSide: currentEndSide,
      endT: currentEndT,
      midOffset: currentMidOffset,
      source: currentStartSide as Anchor,
      target: currentEndSide as Anchor
    };

    const newMap = new Map(this.customAnchors);
    newMap.set(instructionKey, newRouteParams);

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

  onSegmentBarPointerDown(arrowIndex: number, segmentIndex: number, orientation: 'horizontal' | 'vertical', event: PointerEvent): void {
    if (this.mappingMode) return;

    event.stopPropagation();
    event.preventDefault();

    const arrow = this.arrows()[arrowIndex];
    if (!arrow || !arrow.points || arrow.points.length < 2) return;

    const initialPointerPos = this.toLayerPoint(event.clientX, event.clientY);
    if (!initialPointerPos) return;

    this.draggingSegment.set({
      arrowIndex,
      segmentIndex,
      orientation,
      initialWaypoints: [...arrow.points],
      initialPointerPos
    });

    const target = event.currentTarget as Element;
    target.setPointerCapture(event.pointerId);

    const moveHandler = (e: PointerEvent) => this.onSegmentPointerMove(e);
    let upHandler: ((e: PointerEvent) => void) | null = null;
    let cancelHandler: ((e: PointerEvent) => void) | null = null;
    let lostCaptureHandler: ((e: Event) => void) | null = null;
    let escapeHandler: ((e: KeyboardEvent) => void) | null = null;

    upHandler = (e: PointerEvent) => {
      if (upHandler && cancelHandler && lostCaptureHandler && escapeHandler) {
        this.onSegmentPointerUp(e, moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, event.pointerId);
      }
    };

    cancelHandler = (e: PointerEvent) => {
      if (upHandler && cancelHandler && lostCaptureHandler && escapeHandler) {
        this.onSegmentPointerCancel(e, moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, event.pointerId);
      }
    };

    escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && upHandler && cancelHandler && lostCaptureHandler && escapeHandler) {
        this.onSegmentEscape(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, event.pointerId, target);
      }
    };

    lostCaptureHandler = (e: Event) => {
      if (upHandler && cancelHandler && lostCaptureHandler && escapeHandler) {
        this.onSegmentLostCapture(e, moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, event.pointerId);
      }
    };

    document.addEventListener('pointermove', moveHandler);
    document.addEventListener('pointerup', upHandler);
    document.addEventListener('pointercancel', cancelHandler);
    target.addEventListener('lostpointercapture', lostCaptureHandler);
    document.addEventListener('keydown', escapeHandler);
  }

  private onSegmentPointerMove(event: PointerEvent): void {
    const dragState = this.draggingSegment();
    if (!dragState) return;

    const currentPointerPos = this.toLayerPoint(event.clientX, event.clientY);
    if (!currentPointerPos) return;

    const arrow = this.arrows()[dragState.arrowIndex];
    if (!arrow) return;

    const diagramsContainer = this.hostElement.nativeElement.closest('.diagrams-container');
    if (!diagramsContainer) return;
    const containerRect = diagramsContainer.getBoundingClientRect();

    const sourceRect = this.getElementRect(arrow.sourceIds[0], this.sourceContainerSelector, containerRect);
    const targetRect = this.getElementRect(arrow.targetIds[0], this.targetContainerSelector, containerRect);
    if (!sourceRect || !targetRect) return;

    const sourceRectData = {
      left: sourceRect.left,
      top: sourceRect.top,
      width: sourceRect.width,
      height: sourceRect.height
    };
    const targetRectData = {
      left: targetRect.left,
      top: targetRect.top,
      width: targetRect.width,
      height: targetRect.height
    };

    const deltaX = currentPointerPos.x - dragState.initialPointerPos.x;
    const deltaY = currentPointerPos.y - dragState.initialPointerPos.y;

    const delta = dragState.orientation === 'horizontal' ? deltaY : deltaX;

    const startSide: WaypointSide = arrow.startSide || 'right';
    const startT = arrow.startT !== undefined ? arrow.startT : 0.5;
    const endSide: WaypointSide = arrow.endSide || 'left';
    const endT = arrow.endT !== undefined ? arrow.endT : 0.5;

    const result = moveSegment(dragState.initialWaypoints, dragState.segmentIndex, delta, sourceRectData, targetRectData, startSide, startT, endSide, endT);

    this.updateArrowWaypoints(dragState.arrowIndex, result.points, false, result.startSide, result.startT, result.endSide, result.endT);
  }

  private onSegmentPointerUp(
    event: PointerEvent,
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number
  ): void {
    this.cleanupSegmentDrag(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, pointerId, event.currentTarget as Element);

    const dragState = this.draggingSegment();
    if (!dragState) return;

    const arrow = this.arrows()[dragState.arrowIndex];
    if (arrow && arrow.points) {
      // Emit final side/t to Map
      this.updateArrowWaypoints(dragState.arrowIndex, arrow.points, true,
                                arrow.startSide, arrow.startT, arrow.endSide, arrow.endT);
    }

    this.draggingSegment.set(null);
  }

  private onSegmentPointerCancel(
    event: PointerEvent,
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number
  ): void {
    const dragState = this.draggingSegment();
    if (!dragState) return;

    this.updateArrowWaypoints(dragState.arrowIndex, dragState.initialWaypoints, true);
    this.cleanupSegmentDrag(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, pointerId, event.currentTarget as Element);
    this.draggingSegment.set(null);
  }

  private onSegmentEscape(
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number,
    target: Element
  ): void {
    const dragState = this.draggingSegment();
    if (!dragState) return;

    this.updateArrowWaypoints(dragState.arrowIndex, dragState.initialWaypoints, true);
    this.cleanupSegmentDrag(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, pointerId, target);
    this.draggingSegment.set(null);
  }

  private onSegmentLostCapture(
    event: Event,
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number
  ): void {
    const dragState = this.draggingSegment();
    if (!dragState) return;

    this.updateArrowWaypoints(dragState.arrowIndex, dragState.initialWaypoints, true);
    this.cleanupSegmentDrag(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, pointerId, event.currentTarget as Element);
    this.draggingSegment.set(null);
  }

  private cleanupSegmentDrag(
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number,
    target: Element
  ): void {
    document.removeEventListener('pointermove', moveHandler);
    document.removeEventListener('pointerup', upHandler);
    document.removeEventListener('pointercancel', cancelHandler);
    target.removeEventListener('lostpointercapture', lostCaptureHandler);
    document.removeEventListener('keydown', escapeHandler);

    if (target.releasePointerCapture) {
      try {
        target.releasePointerCapture(pointerId);
      } catch (e) {
        // Ignore
      }
    }
  }


  onWaypointPointerDown(arrowIndex: number, waypointIndex: number, event: PointerEvent): void {
    if (this.mappingMode) return;

    event.stopPropagation();
    event.preventDefault();

    const arrow = this.arrows()[arrowIndex];
    if (!arrow || !arrow.points || arrow.points.length < 2) return;

    const initialPointerPos = this.toLayerPoint(event.clientX, event.clientY);
    if (!initialPointerPos) return;

    const isEndpoint = waypointIndex === 0 || waypointIndex === arrow.points.length - 1;

    this.draggingWaypoint.set({
      arrowIndex,
      waypointIndex,
      isEndpoint,
      initialWaypoints: [...arrow.points],
      initialPointerPos
    });

    if (isEndpoint) {
      const instruction = this.instructions[arrow.instructionIndex];
      if (!instruction) return;

      const whichEnd = waypointIndex === 0 ? 'source' : 'target';
      const containerSelector = whichEnd === 'source' ? this.sourceContainerSelector : this.targetContainerSelector;
      const activityId = whichEnd === 'source' ? instruction.sourceActivityIds[0] : instruction.targetActivityIds[0];

      const container = this.hostElement.nativeElement.closest('.diagrams-container');
      if (!container) return;

      const layerContainerRect = container.getBoundingClientRect();
      const shapeRect = this.getElementRect(activityId, containerSelector, layerContainerRect);
      if (!shapeRect) return;

      this.dragTargetRect.set(shapeRect);
    }

    const target = event.currentTarget as Element;
    target.setPointerCapture(event.pointerId);

    const moveHandler = (e: PointerEvent) => this.onWaypointPointerMove(e);
    let upHandler: ((e: PointerEvent) => void) | null = null;
    let cancelHandler: ((e: PointerEvent) => void) | null = null;
    let lostCaptureHandler: ((e: Event) => void) | null = null;
    let escapeHandler: ((e: KeyboardEvent) => void) | null = null;

    upHandler = (e: PointerEvent) => {
      if (upHandler && cancelHandler && lostCaptureHandler && escapeHandler) {
        this.onWaypointPointerUp(e, moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, event.pointerId);
      }
    };

    cancelHandler = (e: PointerEvent) => {
      if (upHandler && cancelHandler && lostCaptureHandler && escapeHandler) {
        this.onWaypointPointerCancel(e, moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, event.pointerId);
      }
    };

    escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && upHandler && cancelHandler && lostCaptureHandler && escapeHandler) {
        this.onWaypointEscape(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, event.pointerId, target);
      }
    };

    lostCaptureHandler = (e: Event) => {
      if (upHandler && cancelHandler && lostCaptureHandler && escapeHandler) {
        this.onWaypointLostCapture(e, moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, event.pointerId);
      }
    };

    document.addEventListener('pointermove', moveHandler);
    document.addEventListener('pointerup', upHandler);
    document.addEventListener('pointercancel', cancelHandler);
    target.addEventListener('lostpointercapture', lostCaptureHandler);
    document.addEventListener('keydown', escapeHandler);
  }

  private onWaypointPointerMove(event: PointerEvent): void {
    const dragState = this.draggingWaypoint();
    if (!dragState) return;

    const currentPointerPos = this.toLayerPoint(event.clientX, event.clientY);
    if (!currentPointerPos) return;

    const arrow = this.arrows()[dragState.arrowIndex];
    if (!arrow) return;

    const diagramsContainer = this.hostElement.nativeElement.closest('.diagrams-container');
    if (!diagramsContainer) return;
    const containerRect = diagramsContainer.getBoundingClientRect();

    const sourceRect = this.getElementRect(arrow.sourceIds[0], this.sourceContainerSelector, containerRect);
    const targetRect = this.getElementRect(arrow.targetIds[0], this.targetContainerSelector, containerRect);
    if (!sourceRect || !targetRect) return;

    const sourceRectData = {
      left: sourceRect.left,
      top: sourceRect.top,
      width: sourceRect.width,
      height: sourceRect.height
    };
    const targetRectData = {
      left: targetRect.left,
      top: targetRect.top,
      width: targetRect.width,
      height: targetRect.height
    };

    const startSide: WaypointSide = arrow.startSide || 'right';
    const startT = arrow.startT !== undefined ? arrow.startT : 0.5;
    const endSide: WaypointSide = arrow.endSide || 'left';
    const endT = arrow.endT !== undefined ? arrow.endT : 0.5;

    let newWaypoints: Point[];
    let newStartSide = startSide;
    let newStartT = startT;
    let newEndSide = endSide;
    let newEndT = endT;

    if (dragState.isEndpoint) {
      const whichEnd = dragState.waypointIndex === 0 ? 'start' : 'end';
      const result = moveDock(dragState.initialWaypoints, whichEnd, sourceRectData, targetRectData, currentPointerPos, startSide, startT, endSide, endT);

      newWaypoints = result.points;
      newStartSide = result.startSide;
      newStartT = result.startT;
      newEndSide = result.endSide;
      newEndT = result.endT;

      const movingRect = whichEnd === 'start' ? sourceRect : targetRect;
      const snapResult = nearestAnchorSnap(movingRect, currentPointerPos, 14);
      this.dragPreviewAnchor.set(snapResult ? snapResult.side as Anchor : null);
    } else {
      const result = moveWaypoint(dragState.initialWaypoints, dragState.waypointIndex, currentPointerPos, sourceRectData, targetRectData, startSide, startT, endSide, endT);
      newWaypoints = result.points;
      newStartSide = result.startSide;
      newStartT = result.startT;
      newEndSide = result.endSide;
      newEndT = result.endT;
    }

    this.updateArrowWaypoints(dragState.arrowIndex, newWaypoints, false, newStartSide, newStartT, newEndSide, newEndT);
  }

  private onWaypointPointerUp(
    event: PointerEvent,
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number
  ): void {
    this.cleanupWaypointDrag(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, pointerId, event.currentTarget as Element);

    const dragState = this.draggingWaypoint();
    if (!dragState) return;

    const currentPointerPos = this.toLayerPoint(event.clientX, event.clientY);

    if (dragState.isEndpoint && currentPointerPos) {
      const rect = this.dragTargetRect();
      if (rect) {
        const distance = this.distanceToRect(currentPointerPos, rect);
        if (distance > 80) {
          this.updateArrowWaypoints(dragState.arrowIndex, dragState.initialWaypoints, true);
          this.draggingWaypoint.set(null);
          this.dragTargetRect.set(null);
          this.dragPreviewAnchor.set(null);
          return;
        }
      }
    }

    const arrow = this.arrows()[dragState.arrowIndex];
    if (arrow && arrow.points) {
      this.updateArrowWaypoints(dragState.arrowIndex, arrow.points, true);
    }

    this.draggingWaypoint.set(null);
    this.dragTargetRect.set(null);
    this.dragPreviewAnchor.set(null);
  }

  private onWaypointPointerCancel(
    event: PointerEvent,
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number
  ): void {
    const dragState = this.draggingWaypoint();
    if (!dragState) return;

    this.updateArrowWaypoints(dragState.arrowIndex, dragState.initialWaypoints, true);
    this.cleanupWaypointDrag(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, pointerId, event.currentTarget as Element);
    this.draggingWaypoint.set(null);
    this.dragTargetRect.set(null);
    this.dragPreviewAnchor.set(null);
  }

  private onWaypointEscape(
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number,
    target: Element
  ): void {
    const dragState = this.draggingWaypoint();
    if (!dragState) return;

    this.updateArrowWaypoints(dragState.arrowIndex, dragState.initialWaypoints, true);
    this.cleanupWaypointDrag(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, pointerId, target);
    this.draggingWaypoint.set(null);
    this.dragTargetRect.set(null);
    this.dragPreviewAnchor.set(null);
  }

  private onWaypointLostCapture(
    event: Event,
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number
  ): void {
    const dragState = this.draggingWaypoint();
    if (!dragState) return;

    this.updateArrowWaypoints(dragState.arrowIndex, dragState.initialWaypoints, true);
    this.cleanupWaypointDrag(moveHandler, upHandler, cancelHandler, lostCaptureHandler, escapeHandler, pointerId, event.currentTarget as Element);
    this.draggingWaypoint.set(null);
    this.dragTargetRect.set(null);
    this.dragPreviewAnchor.set(null);
  }

  private cleanupWaypointDrag(
    moveHandler: (e: PointerEvent) => void,
    upHandler: (e: PointerEvent) => void,
    cancelHandler: (e: PointerEvent) => void,
    lostCaptureHandler: (e: Event) => void,
    escapeHandler: (e: KeyboardEvent) => void,
    pointerId: number,
    target: Element
  ): void {
    document.removeEventListener('pointermove', moveHandler);
    document.removeEventListener('pointerup', upHandler);
    document.removeEventListener('pointercancel', cancelHandler);
    target.removeEventListener('lostpointercapture', lostCaptureHandler);
    document.removeEventListener('keydown', escapeHandler);

    if (target.releasePointerCapture) {
      try {
        target.releasePointerCapture(pointerId);
      } catch (e) {
      }
    }
  }


  private updateArrowWaypoints(
    arrowIndex: number,
    newWaypoints: Point[],
    emit: boolean,
    startSide?: Side,
    startT?: number,
    endSide?: Side,
    endT?: number
  ): void {
    const arrow = this.arrows()[arrowIndex];
    if (!arrow) return;

    const instruction = this.instructions[arrow.instructionIndex];
    if (!instruction) return;

    const updatedArrows = [...this.arrows()];
    updatedArrows[arrowIndex] = {
      ...arrow,
      points: newWaypoints,
      path: waypointsToPath(newWaypoints),
      startSide: startSide !== undefined ? startSide : arrow.startSide,
      startT: startT !== undefined ? startT : arrow.startT,
      endSide: endSide !== undefined ? endSide : arrow.endSide,
      endT: endT !== undefined ? endT : arrow.endT
    };
    this.arrows.set(updatedArrows);

    if (emit) {
      const instructionKey = this.getInstructionKey(instruction);
      const currentParams = this.customAnchors.get(instructionKey);

      const updatedParams: RouteParams = {
        ...currentParams,
        waypoints: newWaypoints,
        startSide: startSide !== undefined ? startSide : currentParams?.startSide,
        startT: startT !== undefined ? startT : currentParams?.startT,
        endSide: endSide !== undefined ? endSide : currentParams?.endSide,
        endT: endT !== undefined ? endT : currentParams?.endT
      };

      // Mutate existing Map to preserve references (for tests)
      this.customAnchors.set(instructionKey, updatedParams);

      // Emit copy for parent components
      const newMap = new Map(this.customAnchors);
      this.anchorsChanged.emit(newMap);
    }

    this.cdr.markForCheck();
  }
}