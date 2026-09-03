import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { BpmnElement } from '../../../../shared/bpmn-viewer/bpmn-viewer';

@Component({
  selector: 'app-confirm-modification-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, TranslatePipe],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="modal-container modal-lg" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title">{{ 'cockpit.modify.confirmDialog.title' | translate }}</h3>
        </div>
        <div class="modal-body">
          <h4 class="section-title">{{ 'cockpit.modify.confirmDialog.options' | translate }}</h4>
          <div class="options-grid">
            <label class="option-item">
              <input type="checkbox" [(ngModel)]="asynchronous" disabled />
              <div>
                <strong>{{ 'cockpit.modify.confirmDialog.asynchronous' | translate }}</strong>
                <p class="option-hint">{{ 'cockpit.modify.confirmDialog.asynchronousHint' | translate }}</p>
              </div>
            </label>
            <label class="option-item">
              <input type="checkbox" [(ngModel)]="cancelCurrentActive" />
              <div>
                <strong>{{ 'cockpit.modify.confirmDialog.cancelActive' | translate }}</strong>
                <p class="option-hint">{{ 'cockpit.modify.confirmDialog.cancelActiveHint' | translate }}</p>
              </div>
            </label>
            <label class="option-item">
              <input type="checkbox" [(ngModel)]="skipCustomListeners" />
              <div>
                <strong>{{ 'cockpit.modify.confirmDialog.skipListeners' | translate }}</strong>
                <p class="option-hint">{{ 'cockpit.modify.confirmDialog.skipListenersHint' | translate }}</p>
              </div>
            </label>
            <label class="option-item">
              <input type="checkbox" [(ngModel)]="skipIoMappings" />
              <div>
                <strong>{{ 'cockpit.modify.confirmDialog.skipIoMappings' | translate }}</strong>
                <p class="option-hint">{{ 'cockpit.modify.confirmDialog.skipIoMappingsHint' | translate }}</p>
              </div>
            </label>
          </div>

          <div class="annotation-group">
            <label>{{ 'cockpit.modify.confirmDialog.annotation' | translate }}</label>
            <div class="annotation-wrapper">
              <textarea
                [(ngModel)]="annotation"
                [placeholder]="'cockpit.modify.confirmDialog.annotationPlaceholder' | translate"
                maxlength="4000"
                rows="3"
              ></textarea>
              <span class="annotation-counter">{{ annotation.length }}/4000</span>
            </div>
          </div>

          <div class="confirm-warning" *ngIf="hasMultiInstanceWarning">
            <fa-icon [icon]="faExclamationTriangle" class="confirm-warning__icon"></fa-icon>
            <span class="confirm-warning__text">{{ 'cockpit.modify.confirmDialog.multiInstanceWarning' | translate }}</span>
          </div>

          <div class="confirm-warning" *ngIf="hasCallActivityWarning">
            <fa-icon [icon]="faExclamationTriangle" class="confirm-warning__icon"></fa-icon>
            <span class="confirm-warning__text">{{ 'cockpit.modify.confirmDialog.callActivityWarning' | translate }}</span>
          </div>

          <h4 class="section-title">{{ 'cockpit.modify.confirmDialog.summary' | translate }}</h4>
          <p class="summary-text" *ngIf="!isQueryMode">{{ 'cockpit.modify.confirmDialog.summaryText' | translate: { count: '' + instanceCount } }}</p>
          <p class="summary-text" *ngIf="isQueryMode">{{ 'cockpit.modify.confirmDialog.summaryTextQuery' | translate: { count: '' + instanceCount } }}</p>
          <div class="summary-instructions">
            <div class="summary-row summary-row--target" *ngIf="targetActivity">
              <span class="summary-badge summary-badge--target"></span>
              <span class="summary-type">{{ 'cockpit.modify.confirmDialog.startBefore' | translate }}</span>
              <span class="summary-name">{{ targetActivity.name || targetActivity.id }}</span>
            </div>
            <div class="summary-row summary-row--source" *ngIf="sourceActivity">
              <span class="summary-badge summary-badge--source"></span>
              <span class="summary-type">{{ 'cockpit.modify.confirmDialog.cancel' | translate }}</span>
              <span class="summary-name">{{ sourceActivity.name || sourceActivity.id }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer confirm-footer">
          <button type="button" class="modal-btn modal-btn-danger" (click)="onBack()">
            {{ 'cockpit.modify.confirmDialog.back' | translate }}
          </button>
          <div class="footer-right">
            <button type="button" class="modal-btn modal-btn-secondary" (click)="onCancel()">
              {{ 'cockpit.modify.confirmDialog.cancelBtn' | translate }}
            </button>
            <button type="button" class="modal-btn modal-btn-primary" (click)="onProceed()">
              {{ 'cockpit.modify.confirmDialog.proceed' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .section-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 0.75rem 0;
    }
    .options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .option-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      cursor: pointer;
    }
    .option-item input[type="checkbox"] {
      margin-top: 0.2rem;
      flex-shrink: 0;
    }
    .option-item strong {
      font-size: 0.85rem;
      display: block;
    }
    .option-hint {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin: 0.15rem 0 0;
      line-height: 1.3;
    }
    .annotation-group {
      margin-bottom: 1.25rem;
    }
    .annotation-group label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 0.35rem;
    }
    .annotation-wrapper {
      position: relative;
    }
    .annotation-wrapper textarea {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 0.85rem;
      font-family: inherit;
      resize: vertical;
      background: var(--bg-input, var(--bg-base));
      color: var(--text-primary);
      box-sizing: border-box;
    }
    .annotation-counter {
      position: absolute;
      bottom: 0.4rem;
      right: 0.6rem;
      font-size: 0.7rem;
      color: var(--text-muted);
      background: var(--bg-input, var(--bg-base));
      padding: 0 0.25rem;
    }
    .summary-text {
      font-size: 0.85rem;
      margin: 0 0 0.75rem;
    }
    .summary-instructions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .summary-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font-size: 0.85rem;
    }
    .summary-badge {
      width: 8px;
      height: 24px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .summary-badge--target {
      background: #5dade2;
    }
    .summary-badge--source {
      background: #eb8a90;
    }
    .summary-row--target {
      background: rgba(93, 173, 226, 0.08);
    }
    .summary-row--source {
      background: rgba(235, 138, 144, 0.08);
    }
    .summary-type {
      font-weight: 600;
      min-width: 90px;
    }
    .summary-name {
      font-size: 0.85rem;
    }
    .confirm-warning {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.6rem 0.75rem;
      margin-bottom: 1.25rem;
      border-radius: 6px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid #fbbf24;
      color: #d97706;
      font-size: 0.8rem;
      line-height: 1.4;
    }
    .confirm-warning__icon {
      flex-shrink: 0;
      margin-top: 0.1rem;
    }
    .confirm-warning__text {
      flex: 1;
    }
    .confirm-footer {
      justify-content: space-between !important;
    }
    .footer-right {
      display: flex;
      gap: 0.5rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmModificationDialogComponent {
  @Input() instanceCount = 0;
  @Input() isQueryMode = false;
  @Input() sourceActivity: BpmnElement | null = null;
  @Input() targetActivity: BpmnElement | null = null;
  @Input() hasMultiInstanceWarning = false;
  @Input() hasCallActivityWarning = false;

  @Output() back = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<{
    skipCustomListeners: boolean;
    skipIoMappings: boolean;
    cancelCurrentActive: boolean;
    annotation: string;
  }>();

  faEye = faEye;
  faExclamationTriangle = faExclamationTriangle;

  asynchronous = true;
  cancelCurrentActive = true;
  skipCustomListeners = true;
  skipIoMappings = true;
  annotation = '';

  onBack(): void {
    this.back.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onProceed(): void {
    this.confirmed.emit({
      skipCustomListeners: this.skipCustomListeners,
      skipIoMappings: this.skipIoMappings,
      cancelCurrentActive: this.cancelCurrentActive,
      annotation: this.annotation
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.cancelled.emit();
    }
  }
}
