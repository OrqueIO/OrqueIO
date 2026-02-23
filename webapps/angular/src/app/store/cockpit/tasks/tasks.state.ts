import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Task, TaskQueryParams } from '../../../services/cockpit.service';

export interface TasksState extends EntityState<Task> {
  selectedTask: Task | null;
  queryParams: TaskQueryParams;
  total: number;
  loading: boolean;
  error: any;
}

export const tasksAdapter: EntityAdapter<Task> = createEntityAdapter<Task>({
  selectId: (task: Task) => task.id
});

export const initialTasksState: TasksState = tasksAdapter.getInitialState({
  selectedTask: null,
  queryParams: {
    firstResult: 0,
    maxResults: 100,
    sortBy: 'created',
    sortOrder: 'desc' as const,
    unfinished: true
  },
  total: 0,
  loading: false,
  error: null
});
