import {
  Component,
  Input,
  ElementRef,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  AfterViewInit,
  HostListener,
  ChangeDetectorRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';

// @ts-ignore - cmmn-js doesn't have types
import CmmnViewer from 'cmmn-js/lib/NavigatedViewer';

@Component({
  selector: 'app-cmmn-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cmmn-viewer.html',
  styleUrls: ['./cmmn-viewer.css']
})
export class CmmnViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLDivElement>;

  @Input() xml: string | null = null;

  private viewer: any = null;
  private isViewerReady = false;
  private currentXml: string | null = null;
  private needsZoomFit = false;
  private resizeTimeout: ReturnType<typeof setTimeout> | null = null;

  loading = true;
  errorMessage: string | null = null;

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

    this.viewer = new CmmnViewer({
      container: this.canvasRef.nativeElement
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
    const retryDelay = 100;

    requestAnimationFrame(() => {
      if (!this.viewer || !this.needsZoomFit) return;

      if (this.isContainerVisible()) {
        try {
          const canvas = this.viewer.get('canvas');
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

  private loadDiagram(): void {
    if (!this.viewer || !this.xml) {
      return;
    }

    if (this.xml === this.currentXml) {
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    // cmmn-js uses callback-based API
    this.viewer.importXML(this.xml, (err: any, warnings: any[]) => {
      if (err) {
        this.loading = false;
        this.currentXml = null;
        this.errorMessage = err.message || 'Failed to load CMMN diagram';
        this.cdr.detectChanges();
        console.error('CMMN import error:', err);
        return;
      }

      this.currentXml = this.xml;

      if (warnings && warnings.length > 0) {
        console.warn('CMMN import warnings:', warnings);
      }

      this.needsZoomFit = true;
      this.scheduleFitToViewport();

      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  private destroyViewer(): void {
    if (this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
      this.isViewerReady = false;
      this.currentXml = null;
    }
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
        // Ignore zoom errors
      }
    });
  }

  private safeZoomFit(canvas: any): void {
    try {
      const viewbox = canvas.viewbox();
      if (viewbox && isFinite(viewbox.width) && isFinite(viewbox.height) &&
          viewbox.width > 0 && viewbox.height > 0) {
        canvas.zoom('fit-viewport');
      }
    } catch (e) {
      // Silently ignore zoom errors
    }
  }
}
