import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../i18n/translate.pipe';

export interface PageChangeEvent {
  current: number;
  size: number;
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, TranslatePipe],
  templateUrl: './pagination.html',
  styleUrls: ['./pagination.css']
})
export class PaginationComponent {
  @Input() current: number = 1;
  @Input() size: number = 50;
  @Input() total: number = 0;
  @Input() availableSizes: number[] = [10, 25, 50, 100];

  @Output() pageChange = new EventEmitter<PageChangeEvent>();

  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;

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
    return (this.current - 1) * this.size + 1;
  }

  get endIndex(): number {
    return Math.min(this.current * this.size, this.total);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.current = page;
      this.emitPageChange();
    }
  }

  nextPage(): void {
    if (this.hasNext) {
      this.goToPage(this.current + 1);
    }
  }

  previousPage(): void {
    if (this.hasPrevious) {
      this.goToPage(this.current - 1);
    }
  }

  changePageSize(event: Event): void {
    const size = parseInt((event.target as HTMLSelectElement).value, 10);
    this.size = size;
    this.current = 1;
    this.emitPageChange();
  }

  private emitPageChange(): void {
    this.pageChange.emit({ current: this.current, size: this.size });
  }
}
