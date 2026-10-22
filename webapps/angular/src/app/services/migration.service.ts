import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  MigrationPlanDto,
  MigrationPlanGenerationDto,
  MigrationPlanReportDto
} from './migration.model';
import { CsrfTokenService } from './csrf-token.service';

@Injectable({
  providedIn: 'root'
})
export class MigrationService {
  private readonly baseUrl = environment.engineUrl + '/default';
  private http = inject(HttpClient);
  private csrfService = inject(CsrfTokenService);

  generateMigrationPlan(request: MigrationPlanGenerationDto): Observable<MigrationPlanDto | null> {
    return this.http.post<MigrationPlanDto>(
      `${this.baseUrl}/migration/generate`,
      request,
      { headers: this.csrfService.buildHeaders() }
    ).pipe(catchError((err: unknown) => of(null)));
  }

  validateMigrationPlan(plan: MigrationPlanDto): Observable<MigrationPlanReportDto | null> {
    return this.http.post<MigrationPlanReportDto>(
      `${this.baseUrl}/migration/validate`,
      plan,
      { headers: this.csrfService.buildHeaders() }
    ).pipe(catchError((err: unknown) => of(null)));
  }
}