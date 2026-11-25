import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../i18n/translate.pipe';

export interface PageChangeEvent {
  current: number;
  size: number;
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './pagination.html',
  styleUrls: ['./pagination.css']
})
export class PaginationComponent {
  @Input() current: number = 1;
  @Input() size: number = 50;
  @Input() total: number = 0;
  @Input() availableSizes: number[] = [10, 25, 50, 100];
  @Input() compact: boolean = false;
  @Input() showSizeSelector: boolean = false;

  // ── Keyset mode ──────────────────────────────────────────────────────────
  // When true, the prev/next buttons use keyset navigation (cursor-based) instead of
  // offset pagination. The page indicator shows the current page number without a total.
  // The size selector and "Showing X-Y" summary remain visible and functional.
  @Input() keysetMode: boolean = false;
  @Input() keysetHasNext: boolean = false;
  @Input() keysetHasPrev: boolean = false;
  // Real 1-based position of the first item on the current keyset page.
  // Tracked cumulatively by the wizard (sum of items seen on prior pages).
  // Avoids naive (page-1)*size+1 which drifts whenever a page is partial.
  @Input() keysetStartIndex: number = 1;
  // Number of items actually rendered on the current keyset page (for the summary end index).
  @Input() keysetItemCount: number = 0;
  @Output() keysetNext = new EventEmitter<void>();
  @Output() keysetPrev = new EventEmitter<void>();

  @Output() pageChange = new EventEmitter<PageChangeEvent>();

  get totalPages(): number {
    return Math.ceil(this.total / this.size);
  }

  get hasNext(): boolean {
    return this.current < this.totalPages;
  }

  get hasPrevious(): boolean {
    return this.current > 1;
  }

  get startIndex(): number {
    return this.keysetMode ? this.keysetStartIndex : (this.current - 1) * this.size + 1;
  }

  get endIndex(): number {
    if (this.keysetMode) {
      const raw = this.keysetStartIndex + this.keysetItemCount - 1;
      if (raw > this.total) {
        console.warn(`[Pagination] keyset endIndex (${raw}) exceeds total (${this.total}) — startIndex=${this.keysetStartIndex}, itemCount=${this.keysetItemCount}`);
      }
      return Math.min(raw, this.total);
    }
    return Math.min(this.current * this.size, this.total);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.current) {
      this.pageChange.emit({ current: page, size: this.size });
    }
  }

  nextPage(): void {
    if (this.keysetMode) {
      if (this.keysetHasNext) this.keysetNext.emit();
    } else if (this.hasNext) {
      this.goToPage(this.current + 1);
    }
  }

  previousPage(): void {
    if (this.keysetMode) {
      if (this.keysetHasPrev) this.keysetPrev.emit();
    } else if (this.hasPrevious) {
      this.goToPage(this.current - 1);
    }
  }

  changePageSize(event: Event): void {
    const newSize = parseInt((event.target as HTMLSelectElement).value, 10);
    if (newSize !== this.size) {
      this.pageChange.emit({ current: 1, size: newSize });
    }
  }
}
