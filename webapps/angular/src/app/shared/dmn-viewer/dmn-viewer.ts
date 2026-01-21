import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';

// Import dmn-js Viewer (read-only mode)
import DmnViewer from 'dmn-js/lib/Viewer';
// Import DMN migration utility for older DMN versions
import { migrateDiagram } from '@bpmn-io/dmn-migrate';

// Interface for decision input/output values
export interface DecisionVariable {
  clauseId?: string;
  clauseName?: string;
  ruleId?: string;
  ruleOrder?: number;
  type?: string;
  value?: any;
  variableName?: string;
}

@Component({
  selector: 'app-dmn-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dmn-viewer-wrapper">
      <div class="dmn-viewer-container" [class.loading]="loading">
        <div class="dmn-canvas" #dmnCanvas></div>
        <div class="loading-overlay" *ngIf="loading">
          <span class="loading-text">Loading DMN...</span>
        </div>
        <div class="error-overlay" *ngIf="error">
          <span class="error-text">{{ error }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dmn-viewer-wrapper {
      width: 100%;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
    }

    .dmn-viewer-container {
      width: 100%;
      min-height: 300px;
      position: relative;
      background: #fff;
    }

    .dmn-canvas {
      width: 100%;
      min-height: 300px;
    }

    .loading-overlay,
    .error-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.9);
      z-index: 10;
    }

    .loading-text {
      color: #6b7280;
      font-size: 0.9rem;
    }

    .error-text {
      color: #999;
      font-size: 0.9rem;
    }

    /* Hide branding/powered-by logos */
    :host ::ng-deep .powered-by-logo,
    :host ::ng-deep .dmn-js-powered-by,
    :host ::ng-deep .bjs-powered-by {
      display: none !important;
    }

    /* Decision Table Container */
    :host ::ng-deep .dmn-decision-table-container {
      width: 100%;
      overflow: auto;
    }

    :host ::ng-deep .tjs-container {
      min-height: 200px;
      overflow: auto;
    }

    /* Table styling */
    :host ::ng-deep .tjs-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    :host ::ng-deep .tjs-table th,
    :host ::ng-deep .tjs-table td {
      border: 1px solid #ccd1d5;
      padding: 8px 12px;
      text-align: left;
      vertical-align: middle;
    }

    :host ::ng-deep .tjs-table thead th {
      background: #f8f9fa;
      font-weight: 600;
      color: #374151;
    }

    :host ::ng-deep .tjs-table tbody tr:hover {
      background: #f9fafb;
    }

    /* Highlighted rules (for decision instances) */
    :host ::ng-deep .tjs-table tbody tr.highlight,
    :host ::ng-deep .tjs-table tbody tr.highlighted {
      background: #f0f0f0 !important;
    }

    :host ::ng-deep .tjs-table tbody tr.highlight > td,
    :host ::ng-deep .tjs-table tbody tr.highlighted > td {
      background: #f0f0f0 !important;
      background-clip: padding-box;
    }

    /* Input header styling */
    :host ::ng-deep .input-cell,
    :host ::ng-deep th.input-cell {
      background: #f5f5f5 !important;
    }

    /* Output header styling */
    :host ::ng-deep .output-cell,
    :host ::ng-deep th.output-cell {
      background: #fafafa !important;
    }

    /* Real input/output values */
    :host ::ng-deep .dmn-input,
    :host ::ng-deep .dmn-output {
      display: block;
      font-weight: 600;
      color: #333;
      margin-top: 4px;
      padding: 2px 6px;
      background: #e8e8e8;
      border-radius: 3px;
      font-size: 12px;
    }

    :host ::ng-deep .dmn-input-object,
    :host ::ng-deep .dmn-output-object {
      display: block;
      font-weight: 600;
      color: #666;
      margin-top: 4px;
      padding: 2px 6px;
      background: #e0e0e0;
      border-radius: 3px;
      font-size: 12px;
      font-style: italic;
    }

    /* Hide editing controls in viewer mode */
    :host ::ng-deep .tjs-add-rule,
    :host ::ng-deep .tjs-add-clause,
    :host ::ng-deep .tjs-controls,
    :host ::ng-deep .dmn-definitions-bar,
    :host ::ng-deep .dmn-icon-plus,
    :host ::ng-deep .add-rule,
    :host ::ng-deep .add-input,
    :host ::ng-deep .add-output,
    :host ::ng-deep .context-menu {
      display: none !important;
    }

    /* Remove edit cursors */
    :host ::ng-deep .tjs-table td,
    :host ::ng-deep .tjs-table th {
      cursor: default !important;
    }

    :host ::ng-deep [contenteditable] {
      cursor: default !important;
      -webkit-user-modify: read-only !important;
      user-modify: read-only !important;
    }

    /* Index column */
    :host ::ng-deep .tjs-table .index-column,
    :host ::ng-deep .tjs-table .rule-index {
      background: #f3f4f6;
      font-weight: 600;
      color: #6b7280;
      text-align: center;
      width: 40px;
    }

    /* Annotations column */
    :host ::ng-deep .tjs-table .annotation {
      background: #fefce8;
      font-style: italic;
      color: #78716c;
    }

    /* Decision Table Properties Header (Name + Hit Policy) */
    :host ::ng-deep .decision-table-properties {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border: 1px solid #d1d5db;
      border-bottom: none;
      background: #fff;
    }

    :host ::ng-deep .decision-table-name {
      font-size: 18px;
      font-weight: 400;
      color: #1f2937;
      margin: 0;
      flex-grow: 1;
    }

    :host ::ng-deep .decision-table-header-separator {
      display: block;
      height: 24px;
      border-left: 1px solid #d1d5db;
      margin: 0 16px;
    }

    :host ::ng-deep .hit-policy {
      display: flex;
      align-items: center;
      font-size: 14px;
      font-weight: 400;
      color: #374151;
    }

    :host ::ng-deep .hit-policy-explanation {
      margin-left: 6px;
      color: #9ca3af;
      font-size: 14px;
    }
  `]
})
export class DmnViewerComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @ViewChild('dmnCanvas', { static: true }) private canvasRef!: ElementRef;

  @Input() xml: string | null = null;
  @Input() decisionId: string | null = null;
  @Input() highlightedRules: string[] = [];
  @Input() inputs: DecisionVariable[] = [];
  @Input() outputs: DecisionVariable[] = [];

  @Output() loaded = new EventEmitter<void>();
  @Output() loadError = new EventEmitter<string | null>();

  loading = true;
  error: string | null = null;

  private dmnViewer: any = null;
  private initialized = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initViewer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['xml'] && !changes['xml'].firstChange) {
      this.renderDmn();
    }
    if (changes['highlightedRules'] && !changes['highlightedRules'].firstChange) {
      this.applyHighlighting();
    }
    if ((changes['inputs'] || changes['outputs']) && this.initialized) {
      this.injectRealValues();
    }
  }

  ngOnDestroy(): void {
    this.destroyViewer();
  }

  private initViewer(): void {
    if (this.initialized) return;

    try {
      const container = this.canvasRef.nativeElement;

      this.dmnViewer = new DmnViewer({
        container
      });

      this.initialized = true;

      if (this.xml) {
        this.renderDmn();
      } else {
        this.loading = false;
      }
    } catch (err) {
      console.error('Failed to initialize DMN viewer:', err);
      this.error = 'Failed to initialize DMN viewer';
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private async renderDmn(): Promise<void> {
    if (!this.dmnViewer || !this.xml) {
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    try {
      // Migrate XML to DMN 1.3 if needed (supports DMN 1.1, 1.2, 1.3)
      let xmlToImport = this.xml;
      try {
        xmlToImport = await migrateDiagram(this.xml);
      } catch (migrationError) {
        // If migration fails, try with original XML
        console.warn('DMN migration skipped:', migrationError);
      }

      // Import XML
      const { warnings } = await this.dmnViewer.importXML(xmlToImport);

      if (warnings && warnings.length) {
        console.warn('DMN import warnings:', warnings);
      }

      // Get the active view (decision table, DRD, or literal expression)
      const activeView = this.dmnViewer.getActiveView();

      // If we have a specific decision ID, try to open it
      if (this.decisionId && activeView) {
        const views = this.dmnViewer.getViews();
        const targetView = views.find((v: any) =>
          v.element && v.element.id === this.decisionId
        );
        if (targetView) {
          await this.dmnViewer.open(targetView);
        }
      }

      this.loading = false;
      this.cdr.detectChanges();

      // Apply highlighting and inject values after a short delay to ensure DOM is ready
      setTimeout(() => {
        this.applyHighlighting();
        this.injectRealValues();
        this.loaded.emit();
      }, 100);

    } catch (err: any) {
      console.error('Failed to render DMN:', err);
      this.error = err.message || 'Failed to render DMN diagram';
      this.loading = false;
      this.loadError.emit(this.error);
      this.cdr.detectChanges();
    }
  }

  private applyHighlighting(): void {
    if (!this.highlightedRules || this.highlightedRules.length === 0) return;

    const container = this.canvasRef.nativeElement;

    // Clear previous highlights
    const previousHighlights = container.querySelectorAll('.highlight, .highlighted');
    previousHighlights.forEach((el: Element) => {
      el.classList.remove('highlight', 'highlighted');
    });

    // Apply new highlights
    this.highlightedRules.forEach(ruleId => {
      // Try to find by data-row-id attribute
      const ruleRow = container.querySelector(`tr[data-row-id="${ruleId}"]`);
      if (ruleRow) {
        ruleRow.classList.add('highlight');
        return;
      }

      // Try to find by data-element-id attribute
      const elementRow = container.querySelector(`tr[data-element-id="${ruleId}"]`);
      if (elementRow) {
        elementRow.classList.add('highlight');
        return;
      }

      // Try to find output cells and highlight their parent row
      const outputCell = container.querySelector(`.output-cell[data-row-id="${ruleId}"]`);
      if (outputCell && outputCell.parentElement) {
        outputCell.parentElement.classList.add('highlight');
      }
    });
  }

  private injectRealValues(): void {
    const container = this.canvasRef.nativeElement;

    // Inject input values into header cells
    if (this.inputs && this.inputs.length > 0) {
      this.inputs.forEach(input => {
        if (!input.clauseId) return;

        // Find the header cell with matching clauseId
        const headerCell = container.querySelector(`th[data-col-id="${input.clauseId}"]`);
        if (headerCell) {
          // Remove any existing injected value
          const existingValue = headerCell.querySelector('.dmn-input, .dmn-input-object');
          if (existingValue) {
            existingValue.remove();
          }

          // Create and append new value element
          const valueSpan = document.createElement('span');
          const isComplexType = this.isComplexType(input.type);
          valueSpan.className = isComplexType ? 'dmn-input-object' : 'dmn-input';
          valueSpan.textContent = this.formatValue(input.value, input.type);
          headerCell.appendChild(valueSpan);
        }
      });
    }

    // Inject output values into table cells
    if (this.outputs && this.outputs.length > 0) {
      this.outputs.forEach(output => {
        if (!output.clauseId || !output.ruleId) return;

        // Find the output cell with matching clauseId and ruleId
        const outputCell = container.querySelector(
          `.output-cell[data-col-id="${output.clauseId}"][data-row-id="${output.ruleId}"]`
        );
        if (outputCell) {
          // Remove any existing injected value
          const existingValue = outputCell.querySelector('.dmn-output, .dmn-output-object');
          if (existingValue) {
            existingValue.remove();
          }

          // Create and append new value element
          const valueSpan = document.createElement('span');
          const isComplexType = this.isComplexType(output.type);
          valueSpan.className = isComplexType ? 'dmn-output-object' : 'dmn-output';
          valueSpan.textContent = this.formatValue(output.value, output.type);
          outputCell.appendChild(valueSpan);
        }
      });
    }
  }

  private isComplexType(type: string | undefined): boolean {
    if (!type) return false;
    const complexTypes = ['Object', 'Bytes', 'File', 'Json', 'Xml'];
    const simplifiedType = type.split('.').pop() || type;
    return complexTypes.some(t => simplifiedType.toLowerCase().includes(t.toLowerCase()));
  }

  private formatValue(value: any, type?: string): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[Object]';
      }
    }
    return String(value);
  }

  private destroyViewer(): void {
    if (this.dmnViewer) {
      try {
        this.dmnViewer.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
      this.dmnViewer = null;
    }
    this.initialized = false;
  }

  // Public method to refresh the viewer
  refresh(): void {
    this.renderDmn();
  }

  // Public method to fit the viewport
  fitViewport(): void {
    if (this.dmnViewer) {
      const activeViewer = this.dmnViewer.getActiveViewer();
      if (activeViewer) {
        const canvas = activeViewer.get('canvas');
        if (canvas && typeof canvas.zoom === 'function') {
          canvas.zoom('fit-viewport', 'auto');
        }
      }
    }
  }

  // Public method to highlight a specific row
  highlightRow(ruleId: string): void {
    const container = this.canvasRef.nativeElement;
    const row = container.querySelector(`tr[data-row-id="${ruleId}"], tr[data-element-id="${ruleId}"]`);
    if (row) {
      row.classList.add('highlight');
    }
  }

  // Public method to clear all highlights
  clearHighlights(): void {
    const container = this.canvasRef.nativeElement;
    const highlights = container.querySelectorAll('.highlight, .highlighted');
    highlights.forEach((el: Element) => {
      el.classList.remove('highlight', 'highlighted');
    });
  }
}
