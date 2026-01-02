import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { TasklistService } from '../../../services/tasklist/tasklist.service';

export interface VariableDetail {
  name: string;
  type: string;
  value: any;
  valueInfo?: {
    objectTypeName?: string;
    serializationDataFormat?: string;
  };
  taskId?: string;
}

type TabId = 'serialized' | 'deserialized';

@Component({
  selector: 'app-variable-detail-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './variable-detail-modal.html',
  styleUrl: './variable-detail-modal.css'
})
export class VariableDetailModalComponent implements OnChanges {
  private readonly tasklistService = inject(TasklistService);

  @Input() isOpen = false;
  @Input() variable: VariableDetail | null = null;
  @Output() close = new EventEmitter<void>();

  selectedTab: TabId = 'serialized';
  serializedValue: string = '';
  deserializedValue: string | null = null;
  deserializationError: string | null = null;
  loading = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['variable'] || changes['isOpen']) {
      if (this.isOpen && this.variable) {
        this.initializeVariable();
      }
    }
  }

  private initializeVariable(): void {
    if (!this.variable) return;

    this.selectedTab = 'serialized';
    this.deserializedValue = null;
    this.deserializationError = null;

    // Format the serialized value
    if (this.variable.type === 'Object' && typeof this.variable.value === 'string') {
      this.serializedValue = this.variable.value;
    } else if (typeof this.variable.value === 'object') {
      try {
        this.serializedValue = JSON.stringify(this.variable.value, null, 2);
      } catch {
        this.serializedValue = String(this.variable.value);
      }
    } else {
      this.serializedValue = String(this.variable.value ?? '');
    }

    // For Object types, attempt to fetch the deserialized value
    if (this.variable.type === 'Object' && this.variable.taskId) {
      this.loadDeserializedValue();
    }
  }

  private loadDeserializedValue(): void {
    if (!this.variable?.taskId || !this.variable?.name) return;

    this.loading = true;

    // Fetch the variable with deserialization enabled
    this.tasklistService.getTaskVariableDeserialized(
      this.variable.taskId,
      this.variable.name
    ).subscribe({
      next: (data) => {
        if (data?.value !== undefined) {
          try {
            this.deserializedValue = typeof data.value === 'object'
              ? JSON.stringify(data.value, null, 2)
              : String(data.value);
          } catch {
            this.deserializedValue = String(data.value);
          }
        }
        this.loading = false;
      },
      error: (err) => {
        this.deserializationError = err?.message || 'Failed to deserialize value';
        this.loading = false;
      }
    });
  }

  selectTab(tab: TabId): void {
    this.selectedTab = tab;
  }

  closeModal(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  get objectTypeName(): string {
    return this.variable?.valueInfo?.objectTypeName || this.variable?.type || 'Unknown';
  }

  get serializationFormat(): string {
    return this.variable?.valueInfo?.serializationDataFormat || 'application/json';
  }

  get isObjectType(): boolean {
    return this.variable?.type === 'Object';
  }

  get displayValue(): string {
    if (this.selectedTab === 'deserialized' && this.deserializedValue) {
      return this.deserializedValue;
    }
    return this.serializedValue;
  }
}
