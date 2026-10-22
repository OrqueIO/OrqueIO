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
      @for (arrow of arrows(); track arrow.instructionIndex) {
        @if (arrow.visible) {
          <path
            [attr.d]="arrow.path"
            [attr.stroke]="arrow.valid ? '#22c55e' : '#ef4444'"
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
      stroke: #22c55e;
    }

    .migration-arrow--invalid {
      stroke: #ef4444;
    }
  `]
})
export class MigrationArrowsComponent implements AfterViewInit, OnChanges, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private hostElement = inject(ElementRef);

  @Input() instructions: MigrationInstructionDto[] = [];
  @Input() report: MigrationPlanReportDto | null = null;
  @Input() sourceContainerSelector = '.diagram-panel:first-child .bpmn-canvas';
  @Input() targetContainerSelector = '.diagram-panel:last-child .bpmn-canvas';
  @Input() showAll = true;
  @Input() visibleInstructionIndices: Set<number> = new Set();

  arrows = signal<ArrowPath[]>([]);
  viewBox = signal<string>('0 0 1920 1080');

  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private updateScheduled = false;

  ngAfterViewInit(): void {
    this.setupObservers();
    this.scheduleUpdate();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['instructions'] || changes['report'] || changes['showAll'] || changes['visibleInstructionIndices']) {
      this.scheduleUpdate();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
  }

  private setupObservers(): void {
    const diagramsContainer = this.hostElement.nativeElement.closest('.diagrams-container');
    if (!diagramsContainer) return;

    // Watch for resize
    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleUpdate();
    });
    this.resizeObserver.observe(diagramsContainer);

    // Watch for DOM changes (diagram load, zoom, pan)
    this.mutationObserver = new MutationObserver(() => {
      this.scheduleUpdate();
    });

    const sourceContainer = document.querySelector(this.sourceContainerSelector);
    const targetContainer = document.querySelector(this.targetContainerSelector);

    if (sourceContainer) {
      this.mutationObserver.observe(sourceContainer, {
        attributes: true,
        attributeFilter: ['transform'],
        subtree: true
      });
    }

    if (targetContainer) {
      this.mutationObserver.observe(targetContainer, {
        attributes: true,
        attributeFilter: ['transform'],
        subtree: true
      });
    }
  }

  private scheduleUpdate(): void {
    if (this.updateScheduled) return;

    this.updateScheduled = true;
    requestAnimationFrame(() => {
      this.updateScheduled = false;
      this.calculateArrows();
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
    this.cdr.markForCheck();
  }

  private getElementRect(elementId: string, containerSelector: string, containerRect: DOMRect): DOMRect | null {
    const container = document.querySelector(containerSelector);
    if (!container) return null;

    const element = container.querySelector(`[data-element-id="${elementId}"] .djs-visual`);
    if (!element) return null;

    const rect = element.getBoundingClientRect();

    // Convert to container-relative coordinates
    return new DOMRect(
      rect.left - containerRect.left,
      rect.top - containerRect.top,
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
}