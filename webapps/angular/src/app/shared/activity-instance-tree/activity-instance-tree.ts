import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faChevronRight,
  faChevronDown,
  faCircle,
  faCheckCircle,
  faBan,
  faPlay,
  faStop,
  faFlag,
  faCog,
  faEnvelope,
  faCodeBranch,
  faArrowRight,
  faLayerGroup,
  faClock,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

import { Activity, ActivityInstanceTree } from '../../services/cockpit.service';

export interface ActivityNode {
  id: string;
  activityId: string;
  activityName?: string;
  activityType: string;
  state: 'running' | 'completed' | 'canceled';
  hasIncidents: boolean;
  children: ActivityNode[];
  expanded: boolean;
}

@Component({
  selector: 'app-activity-instance-tree',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './activity-instance-tree.html',
  styleUrls: ['./activity-instance-tree.css']
})
export class ActivityInstanceTreeComponent {
  // For runtime activity tree
  @Input() activityTree: ActivityInstanceTree | null = null;

  // For history activity list
  @Input() activities: Activity[] = [];

  // Selected activity ID
  @Input() selectedActivityId: string | null = null;
  @Input() selectedActivityIds: string[] = [];

  // Filter
  @Input() filter: string = '';
  @Input() stateFilter: 'all' | 'running' | 'completed' | 'canceled' = 'all';

  @Output() activitySelect = new EventEmitter<{ id: string; activityId: string; event: MouseEvent }>();
  @Output() activityHover = new EventEmitter<string | null>();

  // Icons
  faChevronRight = faChevronRight;
  faChevronDown = faChevronDown;
  faCircle = faCircle;
  faCheckCircle = faCheckCircle;
  faBan = faBan;
  faExclamationTriangle = faExclamationTriangle;

  expandedNodes: Set<string> = new Set();

  // Convert runtime tree to display nodes
  get treeNodes(): ActivityNode[] {
    if (this.activityTree) {
      return this.buildTreeFromRuntime(this.activityTree);
    }
    return this.buildTreeFromHistory(this.activities);
  }

  private buildTreeFromRuntime(tree: ActivityInstanceTree): ActivityNode[] {
    const nodes: ActivityNode[] = [];

    // Add child activity instances
    if (tree.childActivityInstances) {
      tree.childActivityInstances.forEach(child => {
        const node: ActivityNode = {
          id: child.id,
          activityId: child.activityId,
          activityName: child.activityName,
          activityType: child.activityType,
          state: 'running',
          hasIncidents: (child.incidentIds?.length || 0) > 0,
          children: this.buildTreeFromRuntime(child),
          expanded: this.expandedNodes.has(child.id)
        };
        nodes.push(node);
      });
    }

    // Add transition instances (activities in progress)
    if (tree.childTransitionInstances) {
      tree.childTransitionInstances.forEach(transition => {
        const node: ActivityNode = {
          id: transition.id,
          activityId: transition.activityId,
          activityName: transition.activityName,
          activityType: transition.activityType,
          state: 'running',
          hasIncidents: (transition.incidentIds?.length || 0) > 0,
          children: [],
          expanded: false
        };
        nodes.push(node);
      });
    }

    return nodes;
  }

  private buildTreeFromHistory(activities: Activity[]): ActivityNode[] {
    // Group activities by activityId and create flat list
    const activityMap = new Map<string, Activity[]>();

    activities.forEach(activity => {
      const existing = activityMap.get(activity.activityId) || [];
      existing.push(activity);
      activityMap.set(activity.activityId, existing);
    });

    const nodes: ActivityNode[] = [];

    activityMap.forEach((activityList, activityId) => {
      // Use the first activity for metadata
      const first = activityList[0];
      const state = this.getActivityState(first);

      // Filter by state
      if (this.stateFilter !== 'all' && state !== this.stateFilter) {
        return;
      }

      // Filter by name
      if (this.filter) {
        const name = (first.activityName || first.activityId).toLowerCase();
        if (!name.includes(this.filter.toLowerCase())) {
          return;
        }
      }

      const node: ActivityNode = {
        id: first.id,
        activityId: first.activityId,
        activityName: first.activityName,
        activityType: first.activityType,
        state: state,
        hasIncidents: false,
        children: [],
        expanded: false
      };

      nodes.push(node);
    });

    return nodes;
  }

  private getActivityState(activity: Activity): 'running' | 'completed' | 'canceled' {
    if (activity.canceled) {
      return 'canceled';
    }
    if (activity.endTime) {
      return 'completed';
    }
    return 'running';
  }

  toggleExpand(node: ActivityNode, event: Event): void {
    event.stopPropagation();
    if (node.children.length > 0) {
      if (this.expandedNodes.has(node.id)) {
        this.expandedNodes.delete(node.id);
      } else {
        this.expandedNodes.add(node.id);
      }
      node.expanded = !node.expanded;
    }
  }

  selectActivity(node: ActivityNode, event: MouseEvent): void {
    this.activitySelect.emit({ id: node.id, activityId: node.activityId, event });
  }

  onMouseEnter(node: ActivityNode): void {
    this.activityHover.emit(node.activityId);
  }

  onMouseLeave(): void {
    this.activityHover.emit(null);
  }

  getActivityIcon(type: string): any {
    const typeMapping: { [key: string]: any } = {
      'startEvent': faPlay,
      'endEvent': faStop,
      'boundaryEvent': faFlag,
      'intermediateThrowEvent': faFlag,
      'intermediateCatchEvent': faFlag,
      'userTask': faCog,
      'serviceTask': faCog,
      'scriptTask': faCog,
      'businessRuleTask': faCog,
      'sendTask': faEnvelope,
      'receiveTask': faEnvelope,
      'manualTask': faCog,
      'exclusiveGateway': faCodeBranch,
      'parallelGateway': faCodeBranch,
      'inclusiveGateway': faCodeBranch,
      'eventBasedGateway': faCodeBranch,
      'subProcess': faLayerGroup,
      'callActivity': faArrowRight,
      'transaction': faLayerGroup,
      'task': faCog
    };

    // Extract base type from full type
    let baseType = type.replace('bpmn:', '');
    baseType = baseType.charAt(0).toLowerCase() + baseType.slice(1);

    return typeMapping[baseType] || faCog;
  }

  getStateIcon(state: string): any {
    switch (state) {
      case 'running':
        return faCircle;
      case 'completed':
        return faCheckCircle;
      case 'canceled':
        return faBan;
      default:
        return faCircle;
    }
  }

  getStateClass(state: string): string {
    switch (state) {
      case 'running':
        return 'state-running';
      case 'completed':
        return 'state-completed';
      case 'canceled':
        return 'state-canceled';
      default:
        return '';
    }
  }

  isSelected(node: ActivityNode): boolean {
    if (this.selectedActivityIds.length > 0) {
      return this.selectedActivityIds.includes(node.activityId);
    }
    return this.selectedActivityId === node.activityId;
  }
}
