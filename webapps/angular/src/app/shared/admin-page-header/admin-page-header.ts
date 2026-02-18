import { Component, Input, Output, EventEmitter, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faHome,
  faChevronRight,
  faRefresh,
  faTasks,
  faCogs,
  faUserShield,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { PermissionService } from '../../services/permission.service';

export interface BreadcrumbItem {
  label: string;
  route?: string;
  translateKey?: string;
}

interface AppMenuItem {
  id: string;
  labelKey: string;
  route: string;
  icon: any;
  color: string;
}

@Component({
  selector: 'app-admin-page-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, TranslatePipe],
  templateUrl: './admin-page-header.html',
  styleUrls: ['./admin-page-header.css']
})
export class AdminPageHeaderComponent {
  private router = inject(Router);
  private permissionService = inject(PermissionService);

  @Input() breadcrumbs: BreadcrumbItem[] = [];
  @Input() showRefresh = false;

  @Output() refresh = new EventEmitter<void>();

  // Icons
  faHome = faHome;
  faChevronRight = faChevronRight;
  faRefresh = faRefresh;
  faTasks = faTasks;
  faCogs = faCogs;
  faUserShield = faUserShield;
  faChevronDown = faChevronDown;

  // Dropdown state
  appMenuOpen = false;

  // All available apps
  private allApps: AppMenuItem[] = [
    {
      id: 'tasklist',
      labelKey: 'header.apps.tasklist',
      route: '/tasklist',
      icon: this.faTasks,
      color: '#3b82f6' // blue
    },
    {
      id: 'cockpit',
      labelKey: 'header.apps.cockpit',
      route: '/cockpit',
      icon: this.faCogs,
      color: '#e67e22' // orange
    },
    {
      id: 'admin',
      labelKey: 'header.apps.admin',
      route: '/admin',
      icon: this.faUserShield,
      color: '#8b5cf6' // purple
    }
  ];

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.app-menu-container')) {
      this.appMenuOpen = false;
    }
  }

  // Close dropdown on Escape key
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.appMenuOpen = false;
  }

  get visibleApps(): AppMenuItem[] {
    const currentApp = this.getCurrentApp();
    return this.allApps.filter(app => {
      // Check if user has access
      const hasAccess = this.hasAccessToApp(app.id);
      // Don't show current app
      const isCurrentApp = app.id === currentApp;
      return hasAccess && !isCurrentApp;
    });
  }

  get hasMultipleApps(): boolean {
    return this.visibleApps.length > 0;
  }

  toggleAppMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.appMenuOpen = !this.appMenuOpen;
  }

  closeAppMenu(): void {
    this.appMenuOpen = false;
  }

  navigateToApp(app: AppMenuItem): void {
    this.closeAppMenu();
    this.router.navigate([app.route]);
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  private getCurrentApp(): string {
    const url = this.router.url;
    if (url.startsWith('/tasklist')) return 'tasklist';
    if (url.startsWith('/cockpit')) return 'cockpit';
    if (url.startsWith('/admin')) return 'admin';
    return '';
  }

  private hasAccessToApp(appId: string): boolean {
    switch (appId) {
      case 'tasklist':
        return this.permissionService.canAccessTasklist();
      case 'cockpit':
        return this.permissionService.canAccessCockpit();
      case 'admin':
        return this.permissionService.canAccessAdmin();
      default:
        return false;
    }
  }
}
