import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faHome, faChevronRight, faRefresh, faPlus } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../i18n/translate.pipe';

export interface BreadcrumbItem {
  label: string;
  route?: string;
  translateKey?: string;
}

@Component({
  selector: 'app-admin-page-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, TranslatePipe],
  templateUrl: './admin-page-header.html',
  styleUrls: ['./admin-page-header.css']
})
export class AdminPageHeaderComponent {
  @Input() title = '';
  @Input() titleKey = '';
  @Input() breadcrumbs: BreadcrumbItem[] = [];
  @Input() showRefresh = false;
  @Input() showCreate = false;
  @Input() createLabel = 'CREATE';

  @Output() refresh = new EventEmitter<void>();
  @Output() create = new EventEmitter<void>();

  // Icons
  faHome = faHome;
  faChevronRight = faChevronRight;
  faRefresh = faRefresh;
  faPlus = faPlus;

  onRefresh(): void {
    this.refresh.emit();
  }

  onCreate(): void {
    this.create.emit();
  }
}
