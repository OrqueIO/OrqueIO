export type MigrationExecutionResult =
  | { kind: 'running' }
  | { kind: 'async-started'; batchId: string }
  | { kind: 'sync-done'; count: number | null }
  | {
      kind: 'plan-invalid';
      rows: {
        sourceActivityId: string;
        targetActivityIds: string[];
        errors: string[];
      }[];
      variableErrors: {
        name: string;
        errors: string[];
      }[];
    }
  | {
      kind: 'instance-failed';
      processInstanceId: string | null;
      causes: string[];
      activityReports: {
        activityId: string | null;
        scopeId: string | null;
        errors: string[];
      }[];
    }
  | {
      kind: 'failed';
      status: number;
      message: string;
      type?: string;
    };
