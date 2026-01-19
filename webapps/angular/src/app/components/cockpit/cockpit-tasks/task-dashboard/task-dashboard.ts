import { Component, OnInit, OnDestroy, DestroyRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { forkJoin } from 'rxjs';
import {
  faSpinner,
  faTasks,
  faUser,
  faUsers,
  faQuestionCircle,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

import { CockpitHeaderComponent, BreadcrumbItem } from '../../../../shared/cockpit-header/cockpit-header';
import { COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS } from '../../../../shared/cockpit-menu';
import { CockpitService, TaskGroupCount, Group } from '../../../../services/cockpit.service';
import { NavMenuService } from '../../../../services/nav-menu.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';

interface TaskStatistic {
  label: string;
  translateKey: string;
  count: number;
  loading: boolean;
  searchType: string;
}

interface TaskGroupStat {
  groupId: string | null;
  groupName: string;
  taskCount: number;
}

@Component({
  selector: 'app-task-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    CockpitHeaderComponent,
    TranslatePipe
  ],
  templateUrl: './task-dashboard.html',
  styleUrls: ['./task-dashboard.css']
})
export class TaskDashboardComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private navMenuService = inject(NavMenuService);
  private cdr = inject(ChangeDetectorRef);

  // Icons
  faSpinner = faSpinner;
  faTasks = faTasks;
  faUser = faUser;
  faUsers = faUsers;
  faQuestionCircle = faQuestionCircle;
  faInfoCircle = faInfoCircle;

  breadcrumbs: BreadcrumbItem[] = [
    { translateKey: 'cockpit.menu.tasks' }
  ];

  // Statistics by Type
  taskStatistics: TaskStatistic[] = [
    {
      translateKey: 'cockpit.taskDashboard.assignedToUsers',
      count: 0,
      loading: true,
      searchType: 'assignedToUsers'
    },
    {
      translateKey: 'cockpit.taskDashboard.assignedToGroups',
      count: 0,
      loading: true,
      searchType: 'assignedToGroups'
    },
    {
      translateKey: 'cockpit.taskDashboard.unassigned',
      count: 0,
      loading: true,
      searchType: 'unassigned'
    }
  ];

  openTasksCount = 0;
  openTasksLoading = true;

  // Statistics by Group
  taskGroups: TaskGroupStat[] = [];
  taskGroupsLoading = true;

  constructor(private cockpitService: CockpitService) {}

  ngOnInit(): void {
    this.navMenuService.setMenuItems(COCKPIT_MENU_ITEMS, COCKPIT_MORE_MENU_ITEMS);
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
  }

  private loadStatistics(): void {
    // Load total open tasks
    this.cockpitService.getHistoryTaskCount({ unfinished: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (count) => {
          this.openTasksCount = count;
          this.openTasksLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.openTasksLoading = false;
          this.cdr.detectChanges();
        }
      });

    // Load assigned to users
    this.cockpitService.getHistoryTaskCount({ unfinished: true, assigned: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (count) => {
          this.taskStatistics[0].count = count;
          this.taskStatistics[0].loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.taskStatistics[0].loading = false;
          this.cdr.detectChanges();
        }
      });

    // Load assigned to groups (unassigned but with candidate groups)
    this.cockpitService.getHistoryTaskCount({ unfinished: true, unassigned: true, withCandidateGroups: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (count) => {
          this.taskStatistics[1].count = count;
          this.taskStatistics[1].loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.taskStatistics[1].loading = false;
          this.cdr.detectChanges();
        }
      });

    // Load unassigned (no assignee, no candidate groups)
    this.cockpitService.getHistoryTaskCount({ unfinished: true, unassigned: true, withoutCandidateGroups: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (count) => {
          this.taskStatistics[2].count = count;
          this.taskStatistics[2].loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.taskStatistics[2].loading = false;
          this.cdr.detectChanges();
        }
      });

    // Load task counts by candidate group
    this.loadTaskGroupCounts();
  }

  private loadTaskGroupCounts(): void {
    this.cockpitService.getTaskCountByCandidateGroup()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (groupCounts) => {
          // Get unique group IDs (filter out nulls)
          const groupIds = groupCounts
            .map(g => g.groupName)
            .filter((id): id is string => id !== null);

          if (groupIds.length > 0) {
            // Enrich with group names
            this.cockpitService.getGroupsByIds(groupIds)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (groups) => {
                  this.taskGroups = groupCounts.map(gc => {
                    const group = groups.find(g => g.id === gc.groupName);
                    return {
                      groupId: gc.groupName,
                      groupName: group?.name || gc.groupName || 'Without Group',
                      taskCount: gc.taskCount
                    };
                  });
                  this.taskGroupsLoading = false;
                  this.cdr.detectChanges();
                },
                error: () => {
                  // Fallback: use group IDs as names
                  this.taskGroups = groupCounts.map(gc => ({
                    groupId: gc.groupName,
                    groupName: gc.groupName || 'Without Group',
                    taskCount: gc.taskCount
                  }));
                  this.taskGroupsLoading = false;
                  this.cdr.detectChanges();
                }
              });
          } else {
            this.taskGroups = groupCounts.map(gc => ({
              groupId: gc.groupName,
              groupName: gc.groupName || 'Without Group',
              taskCount: gc.taskCount
            }));
            this.taskGroupsLoading = false;
            this.cdr.detectChanges();
          }
        },
        error: () => {
          this.taskGroupsLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  formatGroupName(name: string | null): string {
    return name || 'Without Group';
  }
}
