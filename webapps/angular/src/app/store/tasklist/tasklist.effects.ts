import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of, forkJoin } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom, tap, concatMap } from 'rxjs/operators';
import { TasklistService } from '../../services/tasklist/tasklist.service';
import { TasksActions, FiltersActions, TaskDetailActions, TasklistUIActions } from './tasklist.actions';
import {
  selectTasksQueryParams,
  selectSelectedFilterId,
  selectSearchPills,
  selectMatchAny
} from './tasklist.selectors';
import {
  SearchPill,
  SearchQuery,
  EXPRESSION_REGEX,
  EXPRESSION_SUPPORTED_FIELDS,
  ISO_DATE_REGEX,
  DATE_BASE_MAP
} from '../../models/tasklist';
import { TaskQueryParams, VariableFilter } from '../../models/tasklist';

@Injectable()
export class TasklistEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly tasklistService = inject(TasklistService);

  //  SEARCH QUERY BUILDER 

  private parseValue(value: string, enforceString = false): any {
    if (enforceString) {
      return '' + value;
    }
    if (!isNaN(Number(value)) && value.trim() !== '') {
      return +value;
    }
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'NULL') return null;
    if (value.indexOf("'") === 0 && value.lastIndexOf("'") === value.length - 1) {
      return value.substr(1, value.length - 2);
    }
    return value;
  }


  private sanitizeValue(value: string, operator: string, allowDates = true): any {
    const specialWildCardCharExp = /(\\%)|(\\_)/g;
    const wildCardExp = /(%)|(_)/;

    if ((operator.toLowerCase() === 'like' || operator.toLowerCase() === 'notlike') &&
        !wildCardExp.test(value.replace(specialWildCardCharExp, ''))) {
      return '%' + value + '%';
    } else if (operator === 'in') {
      return value.split(',').map(v => v.trim());
    } else if (allowDates && ISO_DATE_REGEX.test(value)) {
      return new Date(value).toISOString();
    }
    return value;
  }


  private sanitizeProperty(key: string, operator: string, value: string): string {
    // Special case for priority: use dedicated Camunda keys
    if (key === 'priority') {
      if (operator === 'gteq') return 'minPriority';
      if (operator === 'lteq') return 'maxPriority';
      return 'priority';
    }

    // followUpBeforeOrNotExistent is a direct API key
    if (key === 'followUpBeforeOrNotExistent') {
      if (EXPRESSION_REGEX.test(value)) {
        return key + 'Expression';
      }
      return key;
    }

    // Date fields: Camunda API uses dueBefore/dueAfter, not dueDateBefore/dueDateAfter
    const dateBase = DATE_BASE_MAP[key];
    if (dateBase && ['before', 'after'].includes(operator.toLowerCase())) {
      let out = dateBase + operator.charAt(0).toUpperCase() + operator.slice(1).toLowerCase();
      if (EXPRESSION_REGEX.test(value) && EXPRESSION_SUPPORTED_FIELDS.includes(key)) {
        out += 'Expression';
      }
      return out;
    }

    let out = key;

    // Add operator suffix for certain operators
    if (['like', 'before', 'after'].includes(operator.toLowerCase())) {
      out += operator.charAt(0).toUpperCase() + operator.slice(1).toLowerCase();
    }

    // Add Expression suffix for expression values on supported fields
    if (EXPRESSION_REGEX.test(value) && EXPRESSION_SUPPORTED_FIELDS.includes(key)) {
      out += 'Expression';
    }

    return out;
  }


  private buildSearchQuery(pills: SearchPill[], matchAny: boolean): SearchQuery {
    const baseQuery: SearchQuery = {};
    let targetQuery: SearchQuery;

    if (matchAny) {
      baseQuery.orQueries = [{}];
      targetQuery = baseQuery.orQueries[0];
      targetQuery.processVariables = [];
      targetQuery.taskVariables = [];
      targetQuery.caseInstanceVariables = [];
    } else {
      baseQuery.processVariables = [];
      baseQuery.taskVariables = [];
      baseQuery.caseInstanceVariables = [];
      targetQuery = baseQuery;
    }

    for (const pill of pills) {
      const parsedValue = this.parseValue(pill.value, pill.type === 'string');
      const sanitizedValue = this.sanitizeValue(String(parsedValue), pill.operator);

      if (pill.variableType && pill.variableName) {
        const varArray = targetQuery[pill.variableType] as VariableFilter[];
        if (varArray) {
          varArray.push({
            name: pill.variableName,
            operator: pill.operator as VariableFilter['operator'],
            value: sanitizedValue
          });
        }
      } else {
        const propertyKey = this.sanitizeProperty(pill.key, pill.operator, String(parsedValue));
        targetQuery[propertyKey] = sanitizedValue;
      }
    }

    if (!matchAny) {
      if ((baseQuery.processVariables as any[])?.length === 0) delete baseQuery.processVariables;
      if ((baseQuery.taskVariables as any[])?.length === 0) delete baseQuery.taskVariables;
      if ((baseQuery.caseInstanceVariables as any[])?.length === 0) delete baseQuery.caseInstanceVariables;
    }

    return baseQuery;
  }

  //  TASKS EFFECTS 

  loadTasks$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.loadTasks, TasksActions.refreshTasks),
      withLatestFrom(
        this.store.select(selectTasksQueryParams),
        this.store.select(selectSelectedFilterId),
        this.store.select(selectSearchPills),
        this.store.select(selectMatchAny)
      ),
      switchMap(([_, queryParams, filterId, searchPills, matchAny]) => {
        const searchQuery = searchPills.length > 0
          ? this.buildSearchQuery(searchPills, matchAny)
          : {};

        const combinedParams: TaskQueryParams = {
          ...queryParams,
          ...searchQuery
        };

        if (filterId) {
          return forkJoin({
            tasks: this.tasklistService.executeFilter(filterId, {
              firstResult: queryParams.firstResult,
              maxResults: queryParams.maxResults,
              ...searchQuery 
            }),
            count: this.tasklistService.executeFilterCount(filterId, searchQuery)
          }).pipe(
            map(({ tasks, count }) =>
              TasksActions.loadTasksSuccess({ tasks, total: count })
            ),
            catchError(error =>
              of(TasksActions.loadTasksFailure({ error: error.message }))
            )
          );
        } else {
          return forkJoin({
            result: this.tasklistService.getTasks(combinedParams),
            count: this.tasklistService.getTasksCount(combinedParams)
          }).pipe(
            map(({ result, count }) =>
              TasksActions.loadTasksSuccess({
                tasks: result._embedded?.task || [],
                total: count
              })
            ),
            catchError(error =>
              of(TasksActions.loadTasksFailure({ error: error.message }))
            )
          );
        }
      })
    )
  );

  // Reload tasks when query params or filter changes
  reloadOnParamsChange$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        TasksActions.setQueryParams,
        TasksActions.setPage,
        TasksActions.setPageSize,
        TasksActions.setSorting,
        FiltersActions.selectFilter
      ),
      map(() => TasksActions.loadTasks())
    )
  );

  // Reload tasks when search is applied
  applySearch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasklistUIActions.applySearch),
      map(() => TasksActions.loadTasks())
    )
  );

  // Task actions
  claimTask$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.claimTask),
      concatMap(({ taskId, userId }) =>
        this.tasklistService.claimTask(taskId, userId).pipe(
          switchMap(() => this.tasklistService.getTask(taskId)),
          map(task => task
            ? TasksActions.claimTaskSuccess({ task })
            : TasksActions.claimTaskFailure({ error: 'Task not found' })
          ),
          catchError(error =>
            of(TasksActions.claimTaskFailure({ error: error.message }))
          )
        )
      )
    )
  );

  unclaimTask$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.unclaimTask),
      concatMap(({ taskId }) =>
        this.tasklistService.unclaimTask(taskId).pipe(
          switchMap(() => this.tasklistService.getTask(taskId)),
          map(task => task
            ? TasksActions.unclaimTaskSuccess({ task })
            : TasksActions.unclaimTaskFailure({ error: 'Task not found' })
          ),
          catchError(error =>
            of(TasksActions.unclaimTaskFailure({ error: error.message }))
          )
        )
      )
    )
  );

  completeTask$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.completeTask),
      concatMap(({ taskId, variables }) =>
        this.tasklistService.completeTask(taskId, variables).pipe(
          map(() => TasksActions.completeTaskSuccess({ taskId })),
          catchError(error => {
            const errorMessage = error.error?.message || error.error?.errorMessage || error.message || 'Failed to complete task';
            return of(TasksActions.completeTaskFailure({ taskId, error: errorMessage }));
          })
        )
      )
    )
  );

  refreshAfterComplete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.completeTaskSuccess, TasksActions.completeTaskFailure),
      map(() => TasksActions.refreshTasks())
    )
  );

  clearSelectionAfterComplete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.completeTaskSuccess),
      switchMap(() => [
        TasksActions.clearSelection(),
        TaskDetailActions.clearTaskDetail()
      ])
    )
  );

  updateUrlAfterComplete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.completeTaskSuccess),
      tap(() => {
        // Get current URL and remove task-related params
        const urlTree = this.router.parseUrl(this.router.url);
        delete urlTree.queryParams['task'];
        delete urlTree.queryParams['detailsTab'];
        this.router.navigateByUrl(urlTree, { replaceUrl: true });
      })
    ),
    { dispatch: false }
  );

  setAssignee$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.setAssignee),
      concatMap(({ taskId, userId }) =>
        this.tasklistService.setAssignee(taskId, userId).pipe(
          switchMap(() => this.tasklistService.getTask(taskId)),
          map(task => task
            ? TasksActions.setAssigneeSuccess({ task })
            : TasksActions.setAssigneeFailure({ error: 'Task not found' })
          ),
          catchError(error =>
            of(TasksActions.setAssigneeFailure({ error: error.message }))
          )
        )
      )
    )
  );

  updateTask$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.updateTask),
      concatMap(({ taskId, updates }) =>
        this.tasklistService.updateTask(taskId, updates).pipe(
          switchMap(() => this.tasklistService.getTask(taskId)),
          map(task => task
            ? TasksActions.updateTaskSuccess({ task })
            : TasksActions.updateTaskFailure({ error: 'Task not found' })
          ),
          catchError(error =>
            of(TasksActions.updateTaskFailure({ error: error.message }))
          )
        )
      )
    )
  );

  // Delegate task effect
  delegateTask$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.delegateTask),
      concatMap(({ taskId, userId }) =>
        this.tasklistService.delegateTask(taskId, userId).pipe(
          switchMap(() => this.tasklistService.getTask(taskId)),
          map(task => task
            ? TasksActions.delegateTaskSuccess({ task })
            : TasksActions.delegateTaskFailure({ error: 'Task not found' })
          ),
          catchError(error =>
            of(TasksActions.delegateTaskFailure({ error: error.message }))
          )
        )
      )
    )
  );

  //  FILTERS EFFECTS 

  loadFilters$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FiltersActions.loadFilters),
      switchMap(() =>
        forkJoin({
          filters: this.tasklistService.getFilters({ itemCount: true, maxResults: 100 }),
          auth: this.tasklistService.getFilterAuthorizations()
        }).pipe(
          map(({ filters, auth }) => {
            const canCreate = auth.links?.some(l => l.rel === 'create') ?? false;
            return FiltersActions.loadFiltersSuccess({ filters, canCreate });
          }),
          catchError(error =>
            of(FiltersActions.loadFiltersFailure({ error: error.message }))
          )
        )
      )
    )
  );

  // Load filter count when filter is selected
  loadFilterCount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FiltersActions.selectFilter),
      switchMap(({ filterId }) => {
        if (!filterId) {
          return of(FiltersActions.updateFilterCount({ count: 0 }));
        }
        return this.tasklistService.executeFilterCount(filterId).pipe(
          map(count => FiltersActions.updateFilterCount({ count })),
          catchError(() => of(FiltersActions.updateFilterCount({ count: 0 })))
        );
      })
    )
  );

  createFilter$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FiltersActions.createFilter),
      concatMap(({ filter }) =>
        this.tasklistService.createFilter(filter).pipe(
          map(createdFilter => FiltersActions.createFilterSuccess({ filter: createdFilter })),
          catchError(error =>
            of(FiltersActions.createFilterFailure({ error: error.message }))
          )
        )
      )
    )
  );

  updateFilter$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FiltersActions.updateFilter),
      concatMap(({ filterId, filter }) =>
        this.tasklistService.updateFilter(filterId, filter).pipe(
          switchMap(() => this.tasklistService.getFilter(filterId)),
          map(updatedFilter => updatedFilter
            ? FiltersActions.updateFilterSuccess({ filter: updatedFilter })
            : FiltersActions.updateFilterFailure({ error: 'Filter not found' })
          ),
          catchError(error =>
            of(FiltersActions.updateFilterFailure({ error: error.message }))
          )
        )
      )
    )
  );

  deleteFilter$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FiltersActions.deleteFilter),
      concatMap(({ filterId }) =>
        this.tasklistService.deleteFilter(filterId).pipe(
          map(() => FiltersActions.deleteFilterSuccess({ filterId })),
          catchError(error =>
            of(FiltersActions.deleteFilterFailure({ error: error.message }))
          )
        )
      )
    )
  );

  //  TASK DETAIL EFFECTS 

  loadTaskDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TaskDetailActions.loadTaskDetail),
      switchMap(({ taskId }) =>
        this.tasklistService.getTask(taskId).pipe(
          map(task => task
            ? TaskDetailActions.loadTaskDetailSuccess({ task })
            : TaskDetailActions.loadTaskDetailFailure({ error: 'Task not found' })
          ),
          catchError(error =>
            of(TaskDetailActions.loadTaskDetailFailure({ error: error.message }))
          )
        )
      )
    )
  );

  loadTaskForm$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TaskDetailActions.loadTaskForm),
      switchMap(({ taskId }) =>
        this.tasklistService.getTaskForm(taskId).pipe(
          map(form => TaskDetailActions.loadTaskFormSuccess({ form })),
          catchError(error =>
            of(TaskDetailActions.loadTaskFormFailure({ error: error.message }))
          )
        )
      )
    )
  );

  loadComments$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TaskDetailActions.loadComments),
      switchMap(({ taskId }) =>
        this.tasklistService.getComments(taskId).pipe(
          map(comments => TaskDetailActions.loadCommentsSuccess({ comments })),
          catchError(error =>
            of(TaskDetailActions.loadCommentsFailure({ error: error.message }))
          )
        )
      )
    )
  );

  addComment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TaskDetailActions.addComment),
      concatMap(({ taskId, message }) =>
        this.tasklistService.addComment(taskId, message).pipe(
          map(comment => TaskDetailActions.addCommentSuccess({ comment })),
          catchError(error =>
            of(TaskDetailActions.addCommentFailure({ error: error.message }))
          )
        )
      )
    )
  );

  loadHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TaskDetailActions.loadHistory),
      switchMap(({ taskId, params }) =>
        this.tasklistService.getUserOperations(taskId, params).pipe(
          map(history => TaskDetailActions.loadHistorySuccess({ history })),
          catchError(error =>
            of(TaskDetailActions.loadHistoryFailure({ error: error.message }))
          )
        )
      )
    )
  );

  loadIdentityLinks$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TaskDetailActions.loadIdentityLinks),
      switchMap(({ taskId }) =>
        this.tasklistService.getIdentityLinks(taskId).pipe(
          map(identityLinks => TaskDetailActions.loadIdentityLinksSuccess({ identityLinks })),
          catchError(error =>
            of(TaskDetailActions.loadIdentityLinksFailure({ error: error.message }))
          )
        )
      )
    )
  );

  addIdentityLink$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TaskDetailActions.addIdentityLink),
      concatMap(({ taskId, link }) =>
        this.tasklistService.addIdentityLink(taskId, link).pipe(
          map(() => TaskDetailActions.addIdentityLinkSuccess({ link })),
          catchError(error =>
            of(TaskDetailActions.addIdentityLinkFailure({ error: error.message }))
          )
        )
      )
    )
  );

  removeIdentityLink$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TaskDetailActions.removeIdentityLink),
      concatMap(({ taskId, link }) =>
        this.tasklistService.deleteIdentityLink(taskId, link).pipe(
          map(() => TaskDetailActions.removeIdentityLinkSuccess({ link })),
          catchError(error =>
            of(TaskDetailActions.removeIdentityLinkFailure({ error: error.message }))
          )
        )
      )
    )
  );

  // Load additional data when task detail is loaded
  loadTaskDetailData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TaskDetailActions.loadTaskDetailSuccess),
      switchMap(({ task }) => [
        TaskDetailActions.loadTaskForm({ taskId: task.id }),
        TaskDetailActions.loadComments({ taskId: task.id }),
        TaskDetailActions.loadHistory({ taskId: task.id, params: { maxResults: 50 } }),
        TaskDetailActions.loadIdentityLinks({ taskId: task.id })
      ])
    )
  );
}
