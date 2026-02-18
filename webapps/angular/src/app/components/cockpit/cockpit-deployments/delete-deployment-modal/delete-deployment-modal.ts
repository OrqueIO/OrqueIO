import { Component, Input, Output, EventEmitter, OnInit, DestroyRef, inject, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSpinner,
  faTimes,
  faTrash,
  faExclamationTriangle,
  faQuestionCircle
} from '@fortawesome/free-solid-svg-icons';
import { forkJoin } from 'rxjs';

import { CockpitService, Deployment } from '../../../../services/cockpit.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';

interface DeleteOptions {
  cascade: boolean;
  skipCustomListeners: boolean;
  skipIoMappings: boolean;
}

@Component({
  selector: 'app-delete-deployment-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    TranslatePipe
  ],
  templateUrl: './delete-deployment-modal.html',
  styleUrls: ['./delete-deployment-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteDeploymentModalComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cockpitService = inject(CockpitService);
  private cdr = inject(ChangeDetectorRef);

  @Input() deployment!: Deployment;
  @Output() close = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  // Icons
  faSpinner = faSpinner;
  faTimes = faTimes;
  faTrash = faTrash;
  faExclamationTriangle = faExclamationTriangle;
  faQuestionCircle = faQuestionCircle;

  // State
  loadingCounts = true;
  processInstanceCount = 0;
  caseInstanceCount = 0;
  deleting = false;
  error: string | null = null;

  // Delete options
  options: DeleteOptions = {
    cascade: false,
    skipCustomListeners: false,
    skipIoMappings: false
  };

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (!this.deleting) {
      this.onClose();
    }
  }

  ngOnInit(): void {
    this.loadInstanceCounts();
  }

  loadInstanceCounts(): void {
    this.loadingCounts = true;
    this.cdr.markForCheck();

    forkJoin({
      processCount: this.cockpitService.getProcessInstanceCountByDeployment(this.deployment.id),
      caseCount: this.cockpitService.getCaseInstanceCountByDeployment(this.deployment.id)
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ processCount, caseCount }) => {
          this.processInstanceCount = processCount;
          this.caseInstanceCount = caseCount;
          this.loadingCounts = false;
          this.cdr.markForCheck();
        },
        error: () => {
          // If we can't load counts (e.g., case engine disabled), continue anyway
          this.loadingCounts = false;
          this.cdr.markForCheck();
        }
      });
  }

  get hasInstances(): boolean {
    return this.processInstanceCount > 0 || this.caseInstanceCount > 0;
  }

  get canDelete(): boolean {
    // Can delete if no instances, or if cascade is enabled
    return !this.hasInstances || this.options.cascade;
  }

  get instancesInfo(): string {
    const parts: string[] = [];

    if (this.processInstanceCount > 0) {
      parts.push(`${this.processInstanceCount} process instance${this.processInstanceCount > 1 ? 's' : ''}`);
    }

    if (this.caseInstanceCount > 0) {
      parts.push(`${this.caseInstanceCount} case instance${this.caseInstanceCount > 1 ? 's' : ''}`);
    }

    return parts.join(' and ');
  }

  get deploymentDisplayName(): string {
    return this.deployment.name || this.deployment.id;
  }

  onDelete(): void {
    if (!this.canDelete || this.deleting) return;

    this.deleting = true;
    this.error = null;
    this.cdr.markForCheck();

    this.cockpitService.deleteDeployment(this.deployment.id, this.options)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting = false;
          this.deleted.emit();
        },
        error: (err) => {
          this.deleting = false;
          this.error = err?.error?.message || err?.message || 'An error occurred while deleting the deployment';
          this.cdr.markForCheck();
        }
      });
  }

  onClose(): void {
    if (!this.deleting) {
      this.close.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onClose();
    }
  }
}
