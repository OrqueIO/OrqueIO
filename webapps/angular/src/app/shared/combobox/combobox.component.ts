import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  HostListener,
  ChangeDetectorRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Combobox component with ARIA support
 * Allows selection from a list or free text input
 */
@Component({
  selector: 'app-combobox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './combobox.component.html',
  styleUrls: ['./combobox.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComboboxComponent implements OnInit, OnDestroy {
  @Input() value = '';
  @Input() options: string[] = [];
  @Input() placeholder = '';
  @Input() inputId = 'combobox';
  @Input() invalid = false;
  @Input() describedBy = '';

  @Output() valueChange = new EventEmitter<string>();
  @Output() blurred = new EventEmitter<void>();

  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

  isOpen = false;
  activeIndex = -1;
  private isArrowClick = false;

  constructor(
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateActiveIndex();
  }

  ngOnDestroy(): void {}

  private updateActiveIndex(): void {
    if (this.value && this.options.includes(this.value)) {
      this.activeIndex = this.options.indexOf(this.value);
    } else {
      this.activeIndex = -1;
    }
  }

  onInputFocus(): void {
    if (!this.isArrowClick) {
      this.isOpen = true;
      this.updateActiveIndex();
    }
    this.cdr.markForCheck();
  }

  onInputBlur(): void {
    setTimeout(() => {
      this.isOpen = false;
      this.blurred.emit();
      this.cdr.markForCheck();
    }, 200);
  }

  onInputChange(newValue: string): void {
    this.value = newValue;
    this.valueChange.emit(this.value);
    this.cdr.markForCheck();
  }

  onArrowMouseDown(event: Event): void {
    this.isArrowClick = true;
  }

  onArrowClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.isOpen) {
      this.isOpen = false;
    } else {
      this.isOpen = true;
      this.updateActiveIndex();
      this.inputEl?.nativeElement?.focus();
    }
    this.isArrowClick = false;
    this.cdr.markForCheck();
  }

  onListMouseDown(event: Event): void {
    event.preventDefault();
  }

  onOptionClick(option: string): void {
    this.value = option;
    this.valueChange.emit(this.value);
    this.isOpen = false;
    this.inputEl?.nativeElement?.focus();
    this.cdr.markForCheck();
  }

  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen) {
          this.isOpen = true;
          this.updateActiveIndex();
          if (this.activeIndex === -1 && this.options.length > 0) {
            this.activeIndex = 0;
          }
        } else {
          this.activeIndex = Math.min(this.activeIndex + 1, this.options.length - 1);
        }
        this.cdr.markForCheck();
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (!this.isOpen) {
          this.isOpen = true;
          this.updateActiveIndex();
          if (this.activeIndex === -1 && this.options.length > 0) {
            this.activeIndex = this.options.length - 1;
          }
        } else {
          this.activeIndex = Math.max(this.activeIndex - 1, 0);
        }
        this.cdr.markForCheck();
        break;

      case 'Enter':
        if (this.isOpen && this.activeIndex >= 0) {
          event.preventDefault();
          const selectedOption = this.options[this.activeIndex];
          this.onOptionClick(selectedOption);
        }
        break;

      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        if (this.isOpen) {
          this.isOpen = false;
          this.cdr.markForCheck();
        }
        break;

      case 'Tab':
        if (this.isOpen) {
          this.isOpen = false;
          this.cdr.markForCheck();
        }
        break;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      if (this.isOpen) {
        this.isOpen = false;
        this.cdr.markForCheck();
      }
    }
  }

  get listboxId(): string {
    return `${this.inputId}-listbox`;
  }

  get activeDescendant(): string {
    return this.activeIndex >= 0 ? `${this.inputId}-option-${this.activeIndex}` : '';
  }

  isSelected(option: string): boolean {
    return this.value === option;
  }

  isActive(index: number): boolean {
    return this.activeIndex === index;
  }
}
