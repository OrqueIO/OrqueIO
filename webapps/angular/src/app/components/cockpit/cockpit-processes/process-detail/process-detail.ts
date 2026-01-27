import { Component, OnInit, OnDestroy, DestroyRef, inject, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner,
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
  faPauseCircle,
  faClock,
  faPlay,
  faPause,
  faPlus,
  faEdit,
  faTrash,
  faRedo,
  faUser,
  faUsers,
  faTimes,
  faCheck,
  faHome,
  faInfoCircle,
  faChevronUp,
  faChevronDown,
  faExpand,
  faCompress
} from '@fortawesome/free-solid-svg-icons';
import { forkJoin } from 'rxjs';

import { NavMenuService } from '../../../../services/nav-menu.service';
import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import {
  CockpitService,
  ProcessInstanceDetail,
  ProcessInstance,
  ProcessDefinition,
  Variable,
  Activity,
  Incident,
  ActivityInstanceTree,
  ActivityStatistics,
  Job,
  UserTask,
  ExternalTask
} from '../../../../services/cockpit.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { BpmnViewerComponent, ActivityBadge, BpmnElement } from '../../../../shared/bpmn-viewer/bpmn-viewer';
import { ActivityInstanceTreeComponent } from '../../../../shared/activity-instance-tree/activity-instance-tree';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog';
import { ClipboardDirective } from '../../../../shared/clipboard-directive/clipboard.directive';
import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { SearchWidgetComponent, SearchType, SearchCriteria } from '../../../../shared/search-widget/search-widget';

type TabType = 'variables' | 'incidents' | 'calledInstances' | 'userTasks' | 'jobs' | 'externalTasks';
type SidebarTab = 'info' | 'filter';

interface VariableEdit {
  name: string;
  type: string;
  value: any;
  isNew: boolean;
}

@Component({
  selector: 'app-process-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
    TranslatePipe,
    BpmnViewerComponent,
    ActivityInstanceTreeComponent,
    ConfirmDialogComponent,
    ClipboardDirective,
    CockpitHeaderComponent,
    SearchWidgetComponent
  ],
  templateUrl: './process-detail.html',
  styleUrls: ['./process-detail.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProcessDetailComponent implements OnInit, OnDestroy {
  @ViewChild(BpmnViewerComponent) bpmnViewer?: BpmnViewerComponent;

  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  // Icons
  faSpinner = faSpinner;
  faExclamationTriangle = faExclamationTriangle;
  faCheckCircle = faCheckCircle;
  faTimesCircle = faTimesCircle;
  faPauseCircle = faPauseCircle;
  faClock = faClock;
  faPlay = faPlay;
  faPause = faPause;
  faPlus = faPlus;
  faEdit = faEdit;
  faTrash = faTrash;
  faRedo = faRedo;
  faUser = faUser;
  faUsers = faUsers;
  faTimes = faTimes;
  faCheck = faCheck;
  faHome = faHome;
  faInfoCircle = faInfoCircle;
  faChevronUp = faChevronUp;
  faChevronDown = faChevronDown;
  faExpand = faExpand;
  faCompress = faCompress;

  processId = '';
  loading = true;
  loadingDiagram = false;
  actionInProgress = false;

  // Breadcrumbs for header
  breadcrumbs: BreadcrumbItem[] = [];

  // Data
  processInstance: ProcessInstanceDetail | null = null;
  processDefinition: ProcessDefinition | null = null;
  superProcessInstance: ProcessInstance | null = null;
  variables: Variable[] = [];
  activities: Activity[] = [];
  incidents: Incident[] = [];
  jobs: Job[] = [];
  userTasks: UserTask[] = [];
  externalTasks: ExternalTask[] = [];
  calledInstances: ProcessInstance[] = [];
  bpmnXml: string | null = null;
  activityTree: ActivityInstanceTree | null = null;
  activityStatistics: ActivityStatistics[] = [];

  // Variable editing
  editingVariable: VariableEdit | null = null;
  showAddVariable = false;
  newVariable: VariableEdit = { name: '', type: 'String', value: '', isNew: true };
  variableTypes = ['String', 'Integer', 'Long', 'Double', 'Boolean', 'Date', 'Object', 'Json'];

  // Variable filtering and sorting
  filteredVariables: Variable[] = [];
  variableFilter = '';
  variableSortBy: 'name' | 'type' = 'name';
  variableSortOrder: 'asc' | 'desc' = 'asc';
  variableSearchCriteria: SearchCriteria[] = [];

  // Variable search types configuration (like AngularJS)
  variableSearchTypes: SearchType[] = [
    {
      key: 'variableName',
      label: 'Name',
      operators: [
        { key: 'eq', label: '=' },
        { key: 'like', label: 'like' }
      ],
      placeholder: 'Variable name'
    },
    {
      key: 'variableValue',
      label: 'Value',
      operators: [
        { key: 'eq', label: '=' },
        { key: 'neq', label: '!=' },
        { key: 'gt', label: '>' },
        { key: 'gteq', label: '>=' },
        { key: 'lt', label: '<' },
        { key: 'lteq', label: '<=' },
        { key: 'like', label: 'like' }
      ],
      allowName: true,
      placeholder: 'Value'
    },
    {
      key: 'activityInstanceIdIn',
      label: 'Activity Instance ID',
      operators: [
        { key: 'eq', label: '=' }
      ],
      placeholder: 'Activity instance ID'
    }
  ];

  // Task editing
  editingTaskAssignee: string | null = null;
  editingTaskAssigneeValue = '';

  // Dialogs
  showCancelDialog = false;
  showSuspendDialog = false;
  cancelReason = '';

  // UI State - Sidebar
  sidebarTab: SidebarTab = 'info';

  // UI State - Diagram
  diagramCollapsed = false;
  diagramMaximized = false;

  // UI State - Tabs
  activeTab: TabType = 'variables';
  tabs: { id: TabType; labelKey: string; badgeCount?: () => number }[] = [];

  // UI State - Activity selection (supports multi-select like AngularJS)
  selectedActivityId: string | null = null;
  selectedActivityIds: string[] = [];
  activityFilter = '';
  activityStateFilter: 'all' | 'running' | 'completed' | 'canceled' = 'all';

  constructor(
    private route: ActivatedRoute,
    private cockpitService: CockpitService
  ) {
    this.initTabs();
  }

  private initTabs(): void {
    // Tabs ordered like AngularJS: Variables, Incidents, Called Process Instances, User Tasks, Jobs, External Tasks
    this.tabs = [
      { id: 'variables', labelKey: 'cockpit.processDetail.tabs.variables', badgeCount: () => this.variables.length },
      { id: 'incidents', labelKey: 'cockpit.processDetail.tabs.incidents', badgeCount: () => this.incidents.length },
      { id: 'calledInstances', labelKey: 'cockpit.processDetail.tabs.calledInstances', badgeCount: () => this.calledInstances.length },
      { id: 'userTasks', labelKey: 'cockpit.processDetail.tabs.userTasks', badgeCount: () => this.userTasks.length },
      { id: 'jobs', labelKey: 'cockpit.processDetail.tabs.jobs', badgeCount: () => this.jobs.length },
      { id: 'externalTasks', labelKey: 'cockpit.processDetail.tabs.externalTasks', badgeCount: () => this.externalTasks.length }
    ];
  }

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS);

    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.processId = params['id'];
        this.loadProcessData();
      });
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
  }

  loadProcessData(): void {
    this.loading = true;
    this.bpmnXml = null;
    this.activityTree = null;
    this.activityStatistics = [];
    this.cdr.markForCheck();

    // Load process instance
    this.cockpitService.getProcessInstance(this.processId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (instance) => {
          this.processInstance = instance;
          this.loading = false;
          this.updateBreadcrumbs();
          this.cdr.markForCheck();

          if (instance?.processDefinitionId) {
            this.loadBpmnDiagram(instance.processDefinitionId);
            this.loadActivityStatistics(instance.processDefinitionId);
            this.loadProcessDefinition(instance.processDefinitionId);
          }

          // Load runtime activity tree for running processes
          if (instance?.state === 'ACTIVE' || instance?.state === 'SUSPENDED') {
            this.loadActivityInstanceTree();
            this.loadJobs();
            this.loadUserTasks();
            this.loadExternalTasks();
          }

          // Load super process instance if this is a sub-process
          if (instance?.superProcessInstanceId) {
            this.loadSuperProcessInstance(instance.superProcessInstanceId);
          }

          // Load called instances
          this.loadCalledInstances();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });

    // Load variables
    this.cockpitService.getProcessInstanceVariables(this.processId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (variables) => {
          this.variables = variables;
          this.applyVariableFilter();
          this.cdr.markForCheck();
        }
      });

    // Load activities (history)
    this.cockpitService.getProcessInstanceActivities(this.processId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (activities) => {
          this.activities = activities;
          this.cdr.markForCheck();
        }
      });

    // Load incidents
    this.loadIncidents();
  }

  private loadIncidents(): void {
    // Try runtime incidents first, then history
    this.cockpitService.getProcessInstanceIncidents(this.processId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (incidents) => {
          if (incidents.length === 0) {
            // Fallback to history incidents
            this.cockpitService.getHistoryIncidents(this.processId)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (historyIncidents) => {
                  this.incidents = historyIncidents;
                  this.cdr.markForCheck();
                }
              });
          } else {
            this.incidents = incidents;
            this.cdr.markForCheck();
          }
        }
      });
  }

  private loadBpmnDiagram(definitionId: string): void {
    this.loadingDiagram = true;
    this.cdr.markForCheck();
    this.cockpitService.getBpmn20Xml(definitionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.bpmnXml = response?.bpmn20Xml || null;
          this.loadingDiagram = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingDiagram = false;
          this.cdr.markForCheck();
        }
      });
  }

  private loadActivityStatistics(definitionId: string): void {
    this.cockpitService.getActivityStatistics(definitionId, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          this.activityStatistics = stats;
          this.cdr.markForCheck();
        }
      });
  }

  private loadProcessDefinition(definitionId: string): void {
    this.cockpitService.getProcessDefinition(definitionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (definition) => {
          this.processDefinition = definition;
          this.updateBreadcrumbs();
          this.cdr.markForCheck();
        }
      });
  }

  private updateBreadcrumbs(): void {
    if (!this.processInstance) {
      this.breadcrumbs = [];
      return;
    }

    const processName = this.processDefinition?.name || this.processInstance.processDefinitionKey;

    this.breadcrumbs = [
      {
        translateKey: 'cockpit.menu.processes',
        route: '/cockpit/processes'
      },
      {
        label: processName,
        route: `/cockpit/processes/${this.processInstance.processDefinitionKey}/instances`
      },
      {
        label: this.processInstance.id
      }
    ];
  }

  private loadActivityInstanceTree(): void {
    this.cockpitService.getActivityInstanceTree(this.processId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tree) => {
          this.activityTree = tree;
          this.cdr.markForCheck();
        }
      });
  }

  private loadJobs(): void {
    this.cockpitService.getJobsByProcessInstance(this.processId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobs) => {
          this.jobs = jobs;
          this.cdr.markForCheck();
        }
      });
  }

  private loadUserTasks(): void {
    // Load both runtime and history tasks
    forkJoin({
      runtime: this.cockpitService.getUserTasksByProcessInstance(this.processId),
      history: this.cockpitService.getHistoryUserTasksByProcessInstance(this.processId)
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ runtime, history }) => {
          // Merge and deduplicate
          const taskMap = new Map<string, UserTask>();
          [...runtime, ...history].forEach(t => taskMap.set(t.id, t));
          this.userTasks = Array.from(taskMap.values());
          this.cdr.markForCheck();
        }
      });
  }

  private loadExternalTasks(): void {
    this.cockpitService.getExternalTasksByProcessInstance(this.processId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tasks) => {
          this.externalTasks = tasks;
          this.cdr.markForCheck();
        }
      });
  }

  private loadCalledInstances(): void {
    this.cockpitService.getCalledProcessInstances(this.processId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (instances) => {
          this.calledInstances = instances;
          this.cdr.markForCheck();
        }
      });
  }

  private loadSuperProcessInstance(superProcessInstanceId: string): void {
    this.cockpitService.getProcessInstance(superProcessInstanceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (instance) => {
          this.superProcessInstance = instance;
          this.cdr.markForCheck();
        }
      });
  }

  // Diagram controls
  toggleDiagramCollapse(): void {
    this.diagramCollapsed = !this.diagramCollapsed;
    if (this.diagramCollapsed) {
      this.diagramMaximized = false;
    }
    this.cdr.markForCheck();
    // Resize diagram after transition completes
    if (!this.diagramCollapsed) {
      this.resizeDiagramAfterTransition();
    }
  }

  toggleDiagramMaximize(): void {
    this.diagramMaximized = !this.diagramMaximized;
    this.cdr.markForCheck();
    // Resize diagram after transition completes
    this.resizeDiagramAfterTransition();
  }

  private resizeDiagramAfterTransition(): void {
    // Wait for CSS transition (0.3s) to complete before resizing
    setTimeout(() => {
      this.bpmnViewer?.resize();
    }, 350);
  }

  // Activity selection (AngularJS style with multi-select support)
  handleBpmnElementSelection(element: BpmnElement, event?: MouseEvent): void {
    this.handleActivityInstanceSelection(element.id, element.id, event || null);
  }

  handleActivityInstanceSelection(_instanceId: string, activityId: string, event: MouseEvent | null): void {
    const ctrlKey = event?.ctrlKey || event?.metaKey || false;

    if (ctrlKey) {
      // Multi-select mode
      const index = this.selectedActivityIds.indexOf(activityId);
      if (index > -1) {
        this.selectedActivityIds.splice(index, 1);
      } else {
        this.selectedActivityIds.push(activityId);
      }
      this.selectedActivityId = this.selectedActivityIds.length > 0
        ? this.selectedActivityIds[this.selectedActivityIds.length - 1]
        : null;
    } else {
      // Single select mode
      if (this.selectedActivityId === activityId) {
        this.selectedActivityId = null;
        this.selectedActivityIds = [];
      } else {
        this.selectedActivityId = activityId;
        this.selectedActivityIds = [activityId];
      }
    }

    // Scroll to element in diagram
    if (this.selectedActivityId && this.bpmnViewer) {
      this.bpmnViewer.scrollToElement(this.selectedActivityId);
    }

    this.cdr.markForCheck();
  }

  clearActivitySelection(): void {
    this.selectedActivityId = null;
    this.selectedActivityIds = [];
    this.cdr.markForCheck();
  }

  selectActivity(activityId: string): void {
    this.selectedActivityId = activityId;
    this.selectedActivityIds = [activityId];
    if (this.bpmnViewer) {
      this.bpmnViewer.scrollToElement(activityId);
    }
    this.cdr.markForCheck();
  }

  onActivityHover(_activityId: string | null): void {
    // Could add hover highlight here if needed
  }

  onDiagramElementHover(_element: BpmnElement | null): void {
    // Could add hover feedback here
  }

  // Actions
  suspendInstance(): void {
    if (!this.processInstance || this.actionInProgress) return;
    this.actionInProgress = true;
    this.cdr.markForCheck();

    this.cockpitService.suspendProcessInstance(this.processId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadProcessData();
          this.actionInProgress = false;
          this.showSuspendDialog = false;
        },
        error: () => {
          this.actionInProgress = false;
          this.cdr.markForCheck();
        }
      });
  }

  resumeInstance(): void {
    if (!this.processInstance || this.actionInProgress) return;
    this.actionInProgress = true;
    this.cdr.markForCheck();

    this.cockpitService.resumeProcessInstance(this.processId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadProcessData();
          this.actionInProgress = false;
        },
        error: () => {
          this.actionInProgress = false;
          this.cdr.markForCheck();
        }
      });
  }

  cancelInstance(): void {
    if (!this.processInstance || this.actionInProgress) return;
    this.actionInProgress = true;
    this.cdr.markForCheck();

    this.cockpitService.cancelProcessInstance(this.processId, this.cancelReason || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showCancelDialog = false;
          this.cancelReason = '';
          this.router.navigate(['/cockpit/processes']);
        },
        error: () => {
          this.actionInProgress = false;
          this.cdr.markForCheck();
        }
      });
  }

  // Job actions
  retryJob(jobId: string): void {
    this.cockpitService.retryJob(jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadJobs();
          this.loadIncidents();
        }
      });
  }

  retryAllJobs(): void {
    this.cockpitService.setJobRetriesByProcessInstance(this.processId, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadJobs();
          this.loadIncidents();
        }
      });
  }

  suspendJob(job: Job): void {
    this.cockpitService.suspendJob(job.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadJobs()
      });
  }

  resumeJob(job: Job): void {
    this.cockpitService.resumeJob(job.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadJobs()
      });
  }

  recalculateJobDueDate(job: Job): void {
    this.cockpitService.recalculateJobDueDate(job.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadJobs()
      });
  }

  // Incident actions
  retryIncident(incident: Incident): void {
    if (incident.configuration) {
      this.retryJob(incident.configuration);
    }
  }

  // Variable management
  startAddVariable(): void {
    this.newVariable = { name: '', type: 'String', value: '', isNew: true };
    this.showAddVariable = true;
  }

  cancelAddVariable(): void {
    this.showAddVariable = false;
    this.newVariable = { name: '', type: 'String', value: '', isNew: true };
  }

  saveNewVariable(): void {
    if (!this.newVariable.name.trim() || !this.isProcessRunning()) return;

    const value = this.parseVariableValue(this.newVariable.value, this.newVariable.type);
    this.cockpitService.setProcessInstanceVariable(
      this.processId,
      this.newVariable.name,
      value,
      this.newVariable.type
    ).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showAddVariable = false;
          this.cockpitService.getProcessInstanceVariables(this.processId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(variables => {
              this.variables = variables;
              this.applyVariableFilter();
              this.cdr.markForCheck();
            });
        }
      });
  }

  startEditVariable(variable: Variable): void {
    if (!this.isProcessRunning()) return;
    this.editingVariable = {
      name: variable.name,
      type: variable.type,
      value: this.formatVariableForEdit(variable.value, variable.type),
      isNew: false
    };
  }

  cancelEditVariable(): void {
    this.editingVariable = null;
  }

  saveEditVariable(): void {
    if (!this.editingVariable || !this.isProcessRunning()) return;

    const value = this.parseVariableValue(this.editingVariable.value, this.editingVariable.type);
    this.cockpitService.setProcessInstanceVariable(
      this.processId,
      this.editingVariable.name,
      value,
      this.editingVariable.type
    ).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.editingVariable = null;
          this.cockpitService.getProcessInstanceVariables(this.processId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(variables => {
              this.variables = variables;
              this.applyVariableFilter();
              this.cdr.markForCheck();
            });
        }
      });
  }

  deleteVariable(variableName: string): void {
    if (!this.isProcessRunning()) return;

    this.cockpitService.deleteProcessInstanceVariable(this.processId, variableName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.variables = this.variables.filter(v => v.name !== variableName);
          this.applyVariableFilter();
          this.cdr.markForCheck();
        }
      });
  }

  navigateToScope(variable: Variable): void {
    if (variable.activityInstanceId) {
      this.selectActivity(variable.activityInstanceId);
    }
  }

  private parseVariableValue(value: string, type: string): any {
    switch (type) {
      case 'Integer':
      case 'Long':
        return parseInt(value, 10);
      case 'Double':
        return parseFloat(value);
      case 'Boolean':
        return value.toLowerCase() === 'true';
      case 'Json':
      case 'Object':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  private formatVariableForEdit(value: any, type: string): string {
    if (value === null || value === undefined) return '';
    if (type === 'Json' || type === 'Object') {
      return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    }
    return String(value);
  }

  // Variable filtering and sorting
  applyVariableFilter(): void {
    let filtered = [...this.variables];

    // Apply search criteria filters
    if (this.variableSearchCriteria.length > 0) {
      filtered = filtered.filter(v => this.matchesSearchCriteria(v));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = this.variableSortBy === 'name' ? a.name : a.type;
      const bVal = this.variableSortBy === 'name' ? b.name : b.type;
      const comparison = aVal.localeCompare(bVal);
      return this.variableSortOrder === 'asc' ? comparison : -comparison;
    });

    this.filteredVariables = filtered;
  }

  private matchesSearchCriteria(variable: Variable): boolean {
    // All criteria must match (AND logic)
    return this.variableSearchCriteria.every(criteria => {
      switch (criteria.type.key) {
        case 'variableName':
          return this.matchOperator(variable.name, criteria.operator.key, criteria.value);
        case 'variableValue':
          // If criteria has a name, it must match the variable name
          if (criteria.name && variable.name !== criteria.name) {
            return false;
          }
          return this.matchOperator(String(variable.value), criteria.operator.key, criteria.value);
        case 'activityInstanceIdIn':
          return variable.activityInstanceId === criteria.value;
        default:
          return true;
      }
    });
  }

  private matchOperator(actual: string, operator: string, expected: string): boolean {
    const actualLower = actual.toLowerCase();
    const expectedLower = expected.toLowerCase();

    switch (operator) {
      case 'eq':
        return actualLower === expectedLower;
      case 'neq':
        return actualLower !== expectedLower;
      case 'like':
        return actualLower.includes(expectedLower);
      case 'gt':
        return parseFloat(actual) > parseFloat(expected);
      case 'gteq':
        return parseFloat(actual) >= parseFloat(expected);
      case 'lt':
        return parseFloat(actual) < parseFloat(expected);
      case 'lteq':
        return parseFloat(actual) <= parseFloat(expected);
      default:
        return true;
    }
  }

  onVariableSearchChange(criteria: SearchCriteria[]): void {
    this.variableSearchCriteria = criteria;
    this.applyVariableFilter();
    this.cdr.markForCheck();
  }

  sortVariables(column: 'name' | 'type'): void {
    if (this.variableSortBy === column) {
      this.variableSortOrder = this.variableSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.variableSortBy = column;
      this.variableSortOrder = 'asc';
    }
    this.applyVariableFilter();
  }

  getVariableScope(variable: Variable): string | null {
    if (!variable.activityInstanceId) return null;

    // Find the activity that matches this variable's activityInstanceId
    const activity = this.activities.find(a => a.id === variable.activityInstanceId);
    if (activity) {
      return activity.activityName || activity.activityType || activity.activityId;
    }

    // Check in activity tree for running activities
    if (this.activityTree) {
      const scopeName = this.findActivityNameInTree(this.activityTree, variable.activityInstanceId);
      if (scopeName) return scopeName;
    }

    return null;
  }

  getVariableScopeTooltip(variable: Variable): string {
    const scopeName = this.getVariableScope(variable);
    if (!scopeName) return '';

    // Find activity details for more context
    const activity = this.activities.find(a => a.id === variable.activityInstanceId);
    if (activity) {
      const parts = [];
      if (activity.activityName) parts.push(activity.activityName);
      if (activity.activityType) parts.push(`(${activity.activityType})`);
      if (activity.activityId && activity.activityId !== activity.activityName) {
        parts.push(`ID: ${activity.activityId}`);
      }
      return parts.join(' ');
    }

    return `Scope: ${scopeName}`;
  }

  private findActivityNameInTree(tree: ActivityInstanceTree, activityInstanceId: string): string | null {
    if (tree.id === activityInstanceId) {
      return tree.activityName || tree.activityType || tree.activityId || null;
    }

    if (tree.childActivityInstances) {
      for (const child of tree.childActivityInstances) {
        const result = this.findActivityNameInTree(child, activityInstanceId);
        if (result) return result;
      }
    }

    return null;
  }

  // Task assignee editing
  startEditTaskAssignee(task: UserTask): void {
    this.editingTaskAssignee = task.id;
    this.editingTaskAssigneeValue = task.assignee || '';
  }

  cancelEditTaskAssignee(): void {
    this.editingTaskAssignee = null;
    this.editingTaskAssigneeValue = '';
  }

  saveTaskAssignee(task: UserTask): void {
    this.cockpitService.setTaskAssignee(task.id, this.editingTaskAssigneeValue || null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.editingTaskAssignee = null;
          this.editingTaskAssigneeValue = '';
          this.loadUserTasks();
        }
      });
  }

  getTasklistUrl(task: UserTask): string {
    // Returns URL to tasklist for this task
    return `/camunda/app/tasklist/default/#/?task=${task.id}`;
  }

  openIdentityLinksModal(task: UserTask, type: 'user' | 'group'): void {
    // TODO: Implement identity links modal
    console.log(`Open ${type} identity links modal for task ${task.id}`);
  }

  // Computed properties for BPMN viewer
  get activityBadges(): ActivityBadge[] {
    return this.activityStatistics.map(stat => ({
      activityId: stat.id,
      instances: stat.instances,
      incidents: stat.incidents.reduce((sum, inc) => sum + inc.incidentCount, 0)
    }));
  }

  get runningActivityIds(): string[] {
    if (!this.activityTree) return [];
    return this.extractRunningActivityIds(this.activityTree);
  }

  private extractRunningActivityIds(tree: ActivityInstanceTree): string[] {
    const ids: string[] = [];

    if (tree.activityId && tree.activityId !== tree.processDefinitionId) {
      ids.push(tree.activityId);
    }

    if (tree.childActivityInstances) {
      tree.childActivityInstances.forEach(child => {
        ids.push(...this.extractRunningActivityIds(child));
      });
    }

    if (tree.childTransitionInstances) {
      tree.childTransitionInstances.forEach(transition => {
        ids.push(transition.activityId);
      });
    }

    return ids;
  }

  // UI Actions
  setActiveTab(tab: TabType): void {
    this.activeTab = tab;
  }

  // Helper methods
  getStateIcon(state: string): any {
    switch (state) {
      case 'ACTIVE':
        return this.faCheckCircle;
      case 'SUSPENDED':
        return this.faPauseCircle;
      case 'COMPLETED':
        return this.faCheckCircle;
      case 'EXTERNALLY_TERMINATED':
      case 'INTERNALLY_TERMINATED':
        return this.faTimesCircle;
      default:
        return this.faCheckCircle;
    }
  }

  getStateClass(state: string): string {
    switch (state) {
      case 'ACTIVE':
        return 'state-active';
      case 'SUSPENDED':
        return 'state-suspended';
      case 'COMPLETED':
        return 'state-completed';
      case 'EXTERNALLY_TERMINATED':
      case 'INTERNALLY_TERMINATED':
        return 'state-terminated';
      default:
        return '';
    }
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  isProcessRunning(): boolean {
    return this.processInstance?.state === 'ACTIVE' || this.processInstance?.state === 'SUSPENDED';
  }

  hasFailedJobs(): boolean {
    return this.jobs.some(j => j.retries === 0);
  }

  getFailedJobsCount(): number {
    return this.jobs.filter(j => j.retries === 0).length;
  }

  getTabBadgeCount(tab: { badgeCount?: () => number }): number | null {
    if (!tab.badgeCount) return null;
    const count = tab.badgeCount();
    return count > 0 ? count : null;
  }
}
