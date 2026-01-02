import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface NavAction {
  id: string;
  label: string;
  icon?: string;
  svgIcon?: string;
  primary?: boolean;
  callback: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class NavActionsService {
  private actionsSubject = new BehaviorSubject<NavAction[]>([]);
  actions$ = this.actionsSubject.asObservable();

  setActions(actions: NavAction[]): void {
    this.actionsSubject.next(actions);
  }

  clearActions(): void {
    this.actionsSubject.next([]);
  }

  addAction(action: NavAction): void {
    const current = this.actionsSubject.value;
    if (!current.find(a => a.id === action.id)) {
      this.actionsSubject.next([...current, action]);
    }
  }

  removeAction(id: string): void {
    const current = this.actionsSubject.value;
    this.actionsSubject.next(current.filter(a => a.id !== id));
  }
}
