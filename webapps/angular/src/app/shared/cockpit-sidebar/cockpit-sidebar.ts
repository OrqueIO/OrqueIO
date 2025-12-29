import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTachometerAlt,
  faProjectDiagram,
  faTable,
  faTasks,
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
  selector: 'app-cockpit-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, TranslatePipe],
  templateUrl: './cockpit-sidebar.html',
  styleUrls: ['./cockpit-sidebar.css']
})
export class CockpitSidebarComponent {
  isCollapsed = false;

  // Icons
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;

  menuItems: MenuItem[] = [
    {
      icon: faTachometerAlt,
      label: 'cockpit.menu.dashboard',
      route: '/cockpit',
      exact: true
    },
    {
      icon: faProjectDiagram,
      label: 'cockpit.menu.processes',
      route: '/cockpit/processes',
      exact: false
    },
    {
      icon: faTable,
      label: 'cockpit.menu.decisions',
      route: '/cockpit/decisions',
      exact: false
    },
    {
      icon: faTasks,
      label: 'cockpit.menu.tasks',
      route: '/cockpit/tasks',
      exact: false
    }
  ];

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}
