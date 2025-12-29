import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of, forkJoin } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom, tap, concatMap } from 'rxjs/operators';
import { TasklistService } from '../../services/tasklist/tasklist.service';
import { TasksActions, FiltersActions, TaskDetailActions } from './tasklist.actions';
import { selectTasksQueryParams, selectSelectedFilterId } from './tasklist.selectors';

@Injectable()
export class TasklistEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly tasklistService = inject(TasklistService);

  // ==================== TASKS EFFECTS ====================

  loadTasks$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.loadTasks, TasksActions.refreshTasks),
      withLatestFrom(
        this.store.select(selectTasksQueryParams),
        this.store.select(selectSelectedFilterId)
      ),
      switchMap(([_, queryParams, filterId]) => {
        if (filterId) {
          // Load tasks from filter
          return forkJoin({
            tasks: this.tasklistService.executeFilter(filterId, {
              firstResult: queryParams.firstResult,
              maxResults: queryParams.maxResults
            }),
            count: this.tasklistService.executeFilterCount(filterId)
          }).pipe(
            map(({ tasks, count }) =>
              TasksActions.loadTasksSuccess({ tasks, total: count })
            ),
            catchError(error =>
              of(TasksActions.loadTasksFailure({ error: error.message }))
            )
          );
        } else {
          // Load tasks with query params
          return forkJoin({
            result: this.tasklistService.getTasks(queryParams),
            count: this.tasklistService.getTasksCount(queryParams)
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
          catchError(error =>
            of(TasksActions.completeTaskFailure({ error: error.message }))
          )
        )
      )
    )
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

  // ==================== FILTERS EFFECTS ====================

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

  // ==================== TASK DETAIL EFFECTS ====================

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
