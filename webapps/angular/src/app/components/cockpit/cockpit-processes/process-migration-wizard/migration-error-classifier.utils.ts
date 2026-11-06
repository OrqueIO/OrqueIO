import { HttpErrorResponse } from '@angular/common/http';
import { MigrationExecutionResult } from './migration-execution-result.model';

export function classifyMigrationError(error: HttpErrorResponse): MigrationExecutionResult {
  const status = error.status || 0;
  const body = error.error || {};
  const type = body.type || '';
  const message = body.message || error.message || 'Unknown error';

  if (status === 400 && type === 'MigrationPlanValidationException') {
    const validationReport = body.validationReport || {};
    const instructionReports = validationReport.instructionReports || [];
    const variableReports = validationReport.variableReports || {};

    const rows = instructionReports.map((report: any) => ({
      sourceActivityId: report?.instruction?.sourceActivityIds?.[0] || '',
      targetActivityIds: report?.instruction?.targetActivityIds || [],
      errors: report?.failures || []
    }));

    const variableErrors = Object.entries(variableReports).map(([name, report]: [string, any]) => ({
      name,
      errors: report?.failures || []
    }));

    return { kind: 'plan-invalid', rows, variableErrors };
  }

  if (status === 400 && type === 'MigratingProcessInstanceValidationException') {
    const validationReport = body.validationReport || {};
    const processInstanceId = validationReport.processInstanceId || null;
    const causes = validationReport.failures || [];
    const activityReports = (validationReport.activityInstanceValidationReports || []).map((report: any) => ({
      activityId: report?.activityInstanceId || null,
      scopeId: report?.sourceScopeId || null,
      errors: report?.failures || []
    }));

    const transitionReports = (validationReport.transitionInstanceValidationReports || []).map((report: any) => ({
      activityId: report?.activityInstanceId || null,
      scopeId: report?.sourceScopeId || null,
      errors: report?.failures || []
    }));

    return {
      kind: 'instance-failed',
      processInstanceId,
      causes,
      activityReports: [...activityReports, ...transitionReports]
    };
  }

  return {
    kind: 'failed',
    status,
    message,
    type: type || undefined
  };
}
