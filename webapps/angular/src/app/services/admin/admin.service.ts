import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

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
   * Build headers with CSRF token
   */
  protected buildHeaders(contentType = true): HttpHeaders {
    let headers = new HttpHeaders();
    if (contentType) {
      headers = headers.set('Content-Type', 'application/json');
    }
    const csrfToken = this.getCsrfTokenFromCookie();
    if (csrfToken) {
      headers = headers.set('X-XSRF-TOKEN', csrfToken);
    }
    return headers;
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
    return this.http.post<T>(url, body, {
      headers: this.buildHeaders(),
      withCredentials: true
    });
  }

  /**
   * Perform PUT request with CSRF token
   */
  protected put<T>(url: string, body: any): Observable<T> {
    return this.http.put<T>(url, body, {
      headers: this.buildHeaders(),
      withCredentials: true
    });
  }

  /**
   * Perform DELETE request with CSRF token
   */
  protected delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(url, {
      headers: this.buildHeaders(false),
      withCredentials: true
    });
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
