import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavMenuService } from '../../services/nav-menu.service';
import { ADMIN_MENU_ITEMS } from '../admin-menu';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.css']
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  private navMenuService = inject(NavMenuService);

  ngOnInit(): void {
    this.navMenuService.setMenuItems(ADMIN_MENU_ITEMS);
  }

  ngOnDestroy(): void {
    this.navMenuService.clearMenuItems();
  }
}
