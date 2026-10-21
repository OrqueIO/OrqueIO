import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Service to track navigation history.
 * Tracks previousUrl and currentUrl by subscribing to Router NavigationEnd events.
 */
@Injectable({
  providedIn: 'root'
})
export class NavigationHistoryService {
  private _previousUrl: string | null = null;
  private _currentUrl: string | null = null;

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this._previousUrl = this._currentUrl;
        this._currentUrl = event.urlAfterRedirects || event.url;
      });
  }

  get previousUrl(): string | null {
    return this._previousUrl;
  }

  get currentUrl(): string | null {
    return this._currentUrl;
  }
}
