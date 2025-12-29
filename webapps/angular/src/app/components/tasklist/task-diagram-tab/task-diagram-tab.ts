import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { Task } from '../../../models/tasklist';
import { TasklistService } from '../../../services/tasklist/tasklist.service';
import { BpmnViewerComponent } from '../../../shared/bpmn-viewer/bpmn-viewer';

// Simple cache for diagram XML to avoid reloading when switching between tasks of the same process
const xmlCache = new Map<string, string>();

@Component({
  selector: 'app-task-diagram-tab',
  standalone: true,
  imports: [CommonModule, TranslatePipe, BpmnViewerComponent],
  templateUrl: './task-diagram-tab.html',
  styleUrl: './task-diagram-tab.css'
})
export class TaskDiagramTabComponent implements OnInit, OnChanges {
  private readonly tasklistService = inject(TasklistService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() task!: Task;
  @Input() isActive = false;

  @ViewChild('bpmnViewer') bpmnViewer!: BpmnViewerComponent;

  loading = true;
  error: string | null = null;
  xml: string | null = null;

  // Use a property instead of getter to avoid creating new arrays on each change detection
  highlightedActivities: string[] = [];
  selectedActivity: string | null = null;

  private currentDefinitionId: string | null = null;

  ngOnInit(): void {
    this.updateActivityState();
    this.loadDiagram();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Handle tab becoming visible - trigger zoom fit if needed
    if (changes['isActive'] && this.isActive && this.bpmnViewer) {
      // Small delay to ensure the DOM has updated with visibility
      setTimeout(() => {
        this.bpmnViewer?.onContainerVisible();
      }, 0);
    }

    if (changes['task'] && !changes['task'].firstChange) {
      const prevTask = changes['task'].previousValue as Task | null;
      const currTask = changes['task'].currentValue as Task | null;

      const prevDefId = prevTask?.processDefinitionId || prevTask?.caseDefinitionId;
      const currDefId = currTask?.processDefinitionId || currTask?.caseDefinitionId;

      // Always update highlighted activities when task changes
      this.updateActivityState();

      // If same definition, just update highlighting without reloading XML
      if (prevDefId === currDefId && this.xml) {
        // Force change detection and scroll to the new task element
        this.cdr.detectChanges();
        this.scrollToTaskAfterDelay();
        return;
      }

      // Different process definition - need to reload
      this.loadDiagram();
    }
  }

  private updateActivityState(): void {
    const taskDefKey = this.task?.taskDefinitionKey;
    this.highlightedActivities = taskDefKey ? [taskDefKey] : [];
    this.selectedActivity = taskDefKey || null;
  }

  private loadDiagram(): void {
    if (!this.task) return;

    const definitionId = this.task.processDefinitionId || this.task.caseDefinitionId;

    if (!definitionId) {
      this.error = 'No process or case definition available';
      this.loading = false;
      return;
    }

    // Check cache first
    const cachedXml = xmlCache.get(definitionId);
    if (cachedXml) {
      this.xml = cachedXml;
      this.currentDefinitionId = definitionId;
      this.loading = false;
      this.error = null;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = null;
    this.currentDefinitionId = definitionId;

    if (this.task.processDefinitionId) {
      this.tasklistService.getProcessDefinitionXml(this.task.processDefinitionId).subscribe({
        next: (result) => {
          if (result?.bpmn20Xml) {
            this.xml = result.bpmn20Xml;
            xmlCache.set(definitionId, result.bpmn20Xml);
            this.loading = false;
            this.cdr.detectChanges();
          } else {
            this.error = 'Could not load process diagram';
            this.loading = false;
          }
        },
        error: (err) => {
          this.error = err.message || 'Failed to load diagram';
          this.loading = false;
        }
      });
    } else if (this.task.caseDefinitionId) {
      this.tasklistService.getCaseDefinitionXml(this.task.caseDefinitionId).subscribe({
        next: (result) => {
          if (result?.cmmnXml) {
            this.xml = result.cmmnXml;
            xmlCache.set(definitionId, result.cmmnXml);
            this.loading = false;
            this.cdr.detectChanges();
          } else {
            this.error = 'Could not load case diagram';
            this.loading = false;
          }
        },
        error: (err) => {
          this.error = err.message || 'Failed to load diagram';
          this.loading = false;
        }
      });
    }
  }

  onViewerReady(): void {
    this.scrollToTaskAfterDelay();
  }

  private scrollToTaskAfterDelay(): void {
    const taskDefKey = this.task?.taskDefinitionKey;
    if (taskDefKey && this.bpmnViewer) {
      setTimeout(() => {
        this.bpmnViewer.scrollToElement(taskDefKey);
      }, 50);
    }
  }

  onViewerError(err: Error): void {
    console.error('Diagram viewer error:', err);
    this.error = err.message || 'Failed to render diagram';
  }

  zoomIn(): void {
    this.bpmnViewer?.zoomIn();
  }

  zoomOut(): void {
    this.bpmnViewer?.zoomOut();
  }

  resetZoom(): void {
    this.bpmnViewer?.resetZoom();
  }

  scrollToTask(): void {
    const taskDefKey = this.task?.taskDefinitionKey;
    if (taskDefKey && this.bpmnViewer) {
      this.bpmnViewer.scrollToElement(taskDefKey);
    }
  }
}
