import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import {
  ProcessInstance,
  ProcessInstanceDetail,
  ProcessDefinition,
  ProcessQueryParams
} from '../../../services/cockpit.service';

export interface ProcessesState extends EntityState<ProcessInstance> {
  selectedProcess: ProcessInstanceDetail | null;
  processDefinitions: ProcessDefinition[];
  queryParams: ProcessQueryParams;
  total: number;
  loading: boolean;
  loadingDefinitions: boolean;
  loadingDetail: boolean;
  error: any;
}

export const processesAdapter: EntityAdapter<ProcessInstance> = createEntityAdapter<ProcessInstance>({
  selectId: (process: ProcessInstance) => process.id
});

export const initialProcessesState: ProcessesState = processesAdapter.getInitialState({
  selectedProcess: null,
  processDefinitions: [],
  queryParams: {
    firstResult: 0,
    maxResults: 10,
    sortBy: 'startTime',
    sortOrder: 'desc' as const
  },
  total: 0,
  loading: false,
  loadingDefinitions: false,
  loadingDetail: false,
  error: null
});
