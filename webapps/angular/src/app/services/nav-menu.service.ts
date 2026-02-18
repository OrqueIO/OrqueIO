import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NavMenuItem } from '../shared/navbar/navbar';

@Injectable({
  providedIn: 'root'
})
export class NavMenuService {
  private menuItemsSubject = new BehaviorSubject<NavMenuItem[]>([]);
  private moreMenuItemsSubject = new BehaviorSubject<NavMenuItem[]>([]);

  menuItems$ = this.menuItemsSubject.asObservable();
  moreMenuItems$ = this.moreMenuItemsSubject.asObservable();

  setMenuItems(items: NavMenuItem[], moreItems: NavMenuItem[] = []): void {
    this.menuItemsSubject.next(items);
    this.moreMenuItemsSubject.next(moreItems);
  }

  clearMenuItems(): void {
    this.menuItemsSubject.next([]);
    this.moreMenuItemsSubject.next([]);
  }
}
