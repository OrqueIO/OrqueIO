import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlus, faSync } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, TranslatePipe],
  templateUrl: './admin-header.html',
  styleUrls: ['./admin-header.css']
})
export class AdminHeaderComponent {
  @Input() titleKey: string = '';
  @Input() showCreateButton: boolean = true;
  @Input() createButtonLabelKey: string = 'CREATE';
  @Input() showRefreshButton: boolean = false;

  @Output() create = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();

  faPlus = faPlus;
  faSync = faSync;

  onCreate(): void {
    this.create.emit();
  }

  onRefresh(): void {
    this.refresh.emit();
  }
}
