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
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';

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

@Component({
  selector: 'app-bpmn-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bpmn-viewer.html',
  styleUrls: ['./bpmn-viewer.css']
})
export class BpmnViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLDivElement>;

  @Input() xml: string | null = null;
  @Input() highlightedActivities: string[] = [];
  @Input() runningActivities: string[] = [];
  @Input() activityBadges: ActivityBadge[] = [];
  @Input() selectedActivity: string | null = null;

  @Output() elementClick = new EventEmitter<BpmnElement>();
  @Output() elementHover = new EventEmitter<BpmnElement | null>();
  @Output() viewerReady = new EventEmitter<void>();
  @Output() error = new EventEmitter<Error>();

  private viewer: any = null;
  private overlays: any = null;
  private isViewerReady = false;
  private badgeOverlayIds: Map<string, string[]> = new Map();
  private currentXml: string | null = null; // Track loaded XML to avoid re-import
  private needsZoomFit = false; // Track if zoom fit is pending

  loading = true;
  errorMessage: string | null = null;

  ngAfterViewInit(): void {
    this.initViewer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['xml'] && this.xml && this.isViewerReady) {
      // Only reload if XML actually changed
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
  }

  ngOnDestroy(): void {
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
    this.clearAllOverlays();

    try {
      const result = await this.viewer.importXML(this.xml);

      // Store current XML to avoid re-import
      this.currentXml = this.xml;

      if (result.warnings && result.warnings.length > 0) {
        console.warn('BPMN import warnings:', result.warnings);
      }

      // Fit diagram to viewport only if container is visible
      if (this.isContainerVisible()) {
        const canvas = this.viewer.get('canvas');
        canvas.zoom('fit-viewport');
        this.needsZoomFit = false;
      } else {
        // Container is hidden, schedule zoom for later
        this.needsZoomFit = true;
      }

      // Apply all visual states
      this.updateHighlights();
      this.updateRunningMarkers();
      this.updateBadges();
      this.updateSelection();

      this.loading = false;
      this.viewerReady.emit();
    } catch (err: any) {
      this.loading = false;
      this.currentXml = null; // Reset on error
      this.errorMessage = err.message || 'Failed to load BPMN diagram';
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

  private clearAllOverlays(): void {
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

  private updateBadges(): void {
    if (!this.viewer || !this.overlays) return;

    // Clear existing badges
    this.clearAllOverlays();

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
      canvas.zoom('fit-viewport');
    }
  }

  /**
   * Call this when the container becomes visible to fit the diagram
   */
  onContainerVisible(): void {
    if (this.needsZoomFit && this.viewer && this.isContainerVisible()) {
      const canvas = this.viewer.get('canvas');
      canvas.zoom('fit-viewport');
      this.needsZoomFit = false;
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
