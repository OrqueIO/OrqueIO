import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSort, faSortUp, faSortDown, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../i18n/translate.pipe';

export interface ColumnDef {
  key: string;
  labelKey: string;
  sortable?: boolean;
  template?: TemplateRef<any>;
}

export interface SortEvent {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, TranslatePipe],
  templateUrl: './data-table.html',
  styleUrls: ['./data-table.css']
})
export class DataTableComponent {
  @Input() columns: ColumnDef[] = [];
  @Input() data: any[] = [];
  @Input() loading: boolean = false;
  @Input() emptyMessageKey: string = 'NO_DATA';
  @Input() sortBy: string = 'id';
  @Input() sortOrder: 'asc' | 'desc' = 'asc';

  @Output() sortChange = new EventEmitter<SortEvent>();
  @Output() rowClick = new EventEmitter<any>();

  faSort = faSort;
  faSortUp = faSortUp;
  faSortDown = faSortDown;
  faSpinner = faSpinner;

  onSort(column: ColumnDef): void {
    if (!column.sortable) return;

    let newSortOrder: 'asc' | 'desc';
    if (this.sortBy === column.key) {
      newSortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      newSortOrder = 'asc';
    }

    this.sortBy = column.key;
    this.sortOrder = newSortOrder;
    this.sortChange.emit({ sortBy: this.sortBy, sortOrder: this.sortOrder });
  }

  getSortIcon(column: ColumnDef): any {
    if (!column.sortable) return null;
    if (this.sortBy !== column.key) return faSort;
    return this.sortOrder === 'asc' ? faSortUp : faSortDown;
  }

  onRowClick(row: any): void {
    this.rowClick.emit(row);
  }
}
