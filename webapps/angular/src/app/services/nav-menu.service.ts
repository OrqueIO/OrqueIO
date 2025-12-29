import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NavMenuItem } from '../shared/navbar/navbar';

@Injectable({
  providedIn: 'root'
})
export class NavMenuService {
  private menuItemsSubject = new BehaviorSubject<NavMenuItem[]>([]);
  menuItems$ = this.menuItemsSubject.asObservable();

  setMenuItems(items: NavMenuItem[]): void {
    this.menuItemsSubject.next(items);
  }

  clearMenuItems(): void {
    this.menuItemsSubject.next([]);
  }
}
