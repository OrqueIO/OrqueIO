import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  protected readonly baseUrl = '/orqueio/api/engine/engine';
  protected readonly engine = 'default';
  protected readonly engineUrl = `${this.baseUrl}/${this.engine}`;

  constructor(protected http: HttpClient) {}

  /**
   * Get CSRF token from cookie
   */
  protected getCsrfTokenFromCookie(): string | null {
    const name = 'XSRF-TOKEN=';
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name)) {
        return cookie.substring(name.length);
      }
    }
    return null;
  }

  /**
   * Perform GET request with credentials
   */
  protected get<T>(url: string, params?: HttpParams): Observable<T> {
    return this.http.get<T>(url, { params, withCredentials: true });
  }

  /**
   * Perform POST request with CSRF token
   */
  protected post<T>(url: string, body: any): Observable<T> {
    // First GET request to ensure we have an up-to-date CSRF cookie
    return this.http.get(this.engineUrl, { withCredentials: true }).pipe(
      switchMap(() => {
        const csrfToken = this.getCsrfTokenFromCookie();
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (csrfToken) {
          headers = headers.set('X-XSRF-TOKEN', csrfToken);
        }
        return this.http.post<T>(url, body, { headers, withCredentials: true });
      })
    );
  }

  /**
   * Perform PUT request with CSRF token
   */
  protected put<T>(url: string, body: any): Observable<T> {
    return this.http.get(this.engineUrl, { withCredentials: true }).pipe(
      switchMap(() => {
        const csrfToken = this.getCsrfTokenFromCookie();
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (csrfToken) {
          headers = headers.set('X-XSRF-TOKEN', csrfToken);
        }
        return this.http.put<T>(url, body, { headers, withCredentials: true });
      })
    );
  }

  /**
   * Perform DELETE request with CSRF token
   */
  protected delete<T>(url: string): Observable<T> {
    return this.http.get(this.engineUrl, { withCredentials: true }).pipe(
      switchMap(() => {
        const csrfToken = this.getCsrfTokenFromCookie();
        let headers = new HttpHeaders();
        if (csrfToken) {
          headers = headers.set('X-XSRF-TOKEN', csrfToken);
        }
        return this.http.delete<T>(url, { headers, withCredentials: true });
      })
    );
  }

  /**
   * Build HttpParams from query object
   */
  protected buildParams(params?: any): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    return httpParams;
  }
}
