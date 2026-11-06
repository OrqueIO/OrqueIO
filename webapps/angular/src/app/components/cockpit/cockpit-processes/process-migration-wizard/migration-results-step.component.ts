import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSpinner, faCheckCircle, faExclamationTriangle, faPencilAlt } from '@fortawesome/free-solid-svg-icons';

import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { MigrationExecutionResult } from './migration-execution-result.model';

@Component({
  selector: 'app-migration-results-step',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    TranslatePipe
  ],
  templateUrl: './migration-results-step.component.html',
  styleUrl: './migration-results-step.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MigrationResultsStepComponent {
  readonly result = input.required<MigrationExecutionResult>();
  readonly sourceXml = input<string | null>(null);
  readonly targetXml = input<string | null>(null);
  readonly targetKey = input<string | null>(null);
  readonly targetVersion = input<number | null>(null);
  readonly sourceVersion = input<number | null>(null);
  readonly isRetrying = input<boolean>(false);
  readonly startNewMigration = output<void>();
  readonly backToMapping = output<void>();
  readonly backToInstances = output<void>();
  readonly backToConfirm = output<void>();
  readonly retryExecution = output<void>();

  readonly faSpinner = faSpinner;
  readonly faCheckCircle = faCheckCircle;
  readonly faExclamationTriangle = faExclamationTriangle;
  readonly faPencilAlt = faPencilAlt;

  showTechnicalDetails = signal(false);

  private activityNamesCache = new Map<string, Map<string, string>>();

  onStartNewMigration(): void {
    this.startNewMigration.emit();
  }

  onBackToMapping(): void {
    this.backToMapping.emit();
  }

  onBackToInstances(): void {
    this.backToInstances.emit();
  }

  onBackToConfirm(): void {
    this.backToConfirm.emit();
  }

  onRetry(): void {
    this.retryExecution.emit();
  }

  toggleTechnicalDetails(): void {
    this.showTechnicalDetails.set(!this.showTechnicalDetails());
  }

  getBatchId(): string {
    const r = this.result();
    return r.kind === 'async-started' ? r.batchId : '';
  }

  getPlanInvalidRows(): Array<{ sourceActivityId: string; targetActivityIds: string[]; errors: string[] }> {
    const r = this.result();
    return r.kind === 'plan-invalid' ? r.rows : [];
  }

  getPlanInvalidVariableErrors(): Array<{ name: string; errors: string[] }> {
    const r = this.result();
    return r.kind === 'plan-invalid' ? r.variableErrors : [];
  }

  getSyncDoneCount(): number | null {
    const r = this.result();
    return r.kind === 'sync-done' ? r.count : null;
  }

  getTargetInstancesLink(): string {
    const key = this.targetKey();
    return key ? `/cockpit/processes/${key}/instances` : '/cockpit/processes';
  }

  getInstanceFailedProcessInstanceId(): string | null {
    const r = this.result();
    return r.kind === 'instance-failed' ? r.processInstanceId : null;
  }

  getInstanceFailedCauses(): string[] {
    const r = this.result();
    return r.kind === 'instance-failed' ? r.causes : [];
  }

  getInstanceFailedActivityReports(): Array<{ activityId: string | null; scopeId: string | null; errors: string[] }> {
    const r = this.result();
    return r.kind === 'instance-failed' ? r.activityReports : [];
  }

  getInstanceLink(): string | null {
    const id = this.getInstanceFailedProcessInstanceId();
    return id ? `/cockpit/processes/instance/${id}` : null;
  }

  getFailedMessage(): string {
    const r = this.result();
    if (r.kind !== 'failed') return '';

    if (r.status === 0) {
      return 'Cannot reach the server. Check your connection and try again.';
    }
    if (r.status === 401 || r.status === 403) {
      return 'You are not allowed to migrate process instances.';
    }
    if (r.message && r.message.trim()) {
      return r.message;
    }
    return 'An unexpected error occurred. No migration was reported as completed.';
  }

  getFailedStatus(): number {
    const r = this.result();
    return r.kind === 'failed' ? r.status : 0;
  }

  getFailedType(): string | null {
    const r = this.result();
    return r.kind === 'failed' ? (r.type || null) : null;
  }

  getFailedRawMessage(): string {
    const r = this.result();
    return r.kind === 'failed' ? r.message : '';
  }

  getActivityName(activityId: string, isSource: boolean): string {
    const xml = isSource ? this.sourceXml() : this.targetXml();
    if (!xml) return activityId;

    const cacheKey = isSource ? 'source' : 'target';
    if (!this.activityNamesCache.has(cacheKey)) {
      this.activityNamesCache.set(cacheKey, this.parseActivityNames(xml));
    }

    const namesMap = this.activityNamesCache.get(cacheKey)!;
    return namesMap.get(activityId) || activityId;
  }

  private parseActivityNames(xml: string): Map<string, string> {
    const namesMap = new Map<string, string>();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    // Parse all elements with id and name attributes
    const elements = doc.querySelectorAll('[id][name]');
    elements.forEach(el => {
      const id = el.getAttribute('id');
      const name = el.getAttribute('name');
      if (id && name) {
        namesMap.set(id, name);
      }
    });

    return namesMap;
  }
}