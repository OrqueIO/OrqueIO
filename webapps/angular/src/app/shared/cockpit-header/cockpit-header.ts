import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faHome, faChevronRight, faRefresh } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../i18n/translate.pipe';

export interface BreadcrumbItem {
  label?: string;
  route?: string;
  translateKey?: string;
}

@Component({
  selector: 'app-cockpit-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, TranslatePipe],
  templateUrl: './cockpit-header.html',
  styleUrls: ['./cockpit-header.css']
})
export class CockpitHeaderComponent {
  @Input() title = '';
  @Input() titleKey = '';
  @Input() breadcrumbs: BreadcrumbItem[] = [];
  @Input() showRefresh = false;
  @Output() refresh = new EventEmitter<void>();

  // Icons
  faHome = faHome;
  faChevronRight = faChevronRight;
  faRefresh = faRefresh;

  onRefresh(): void {
    if (this.refresh.observed) {
      this.refresh.emit();
    } else {
      window.location.reload();
    }
  }
}
