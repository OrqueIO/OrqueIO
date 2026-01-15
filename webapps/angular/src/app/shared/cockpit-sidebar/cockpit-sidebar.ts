import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTachometerAlt,
  faProjectDiagram,
  faTable,
  faTasks,
  faLayerGroup,
  faChevronLeft,
  faChevronRight,
  faChevronDown,
  faChevronUp,
  faEllipsisH
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
  moreExpanded = false;

  // Icons
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faEllipsisH = faEllipsisH;

  // Main menu items
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

  // More menu items (dropdown)
  moreMenuItems: MenuItem[] = [
    {
      icon: faLayerGroup,
      label: 'cockpit.menu.batches',
      route: '/cockpit/batch',
      exact: false
    }
  ];

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      this.moreExpanded = false;
    }
  }

  toggleMore(): void {
    this.moreExpanded = !this.moreExpanded;
  }
}
