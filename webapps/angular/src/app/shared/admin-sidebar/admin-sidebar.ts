import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTachometerAlt,
  faUsers,
  faUsersCog,
  faBuilding,
  faShieldAlt,
  faChevronLeft,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../i18n/translate.pipe';

interface MenuItem {
  icon: any;
  label: string;
  route: string;
  exact: boolean;
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, TranslatePipe],
  templateUrl: './admin-sidebar.html',
  styleUrls: ['./admin-sidebar.css']
})
export class AdminSidebarComponent {
  isCollapsed = false;

  // Icons
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;

  menuItems: MenuItem[] = [
    {
      icon: faTachometerAlt,
      label: 'admin.menu.dashboard',
      route: '/admin',
      exact: true
    },
    {
      icon: faUsers,
      label: 'admin.menu.users',
      route: '/admin/users',
      exact: false
    },
    {
      icon: faUsersCog,
      label: 'admin.menu.groups',
      route: '/admin/groups',
      exact: false
    },
    {
      icon: faBuilding,
      label: 'admin.menu.tenants',
      route: '/admin/tenants',
      exact: false
    },
    {
      icon: faShieldAlt,
      label: 'admin.menu.authorizations',
      route: '/admin/authorizations',
      exact: false
    }
  ];

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}
