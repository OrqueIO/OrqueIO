import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message;
      } else {
        // Server-side error - try to extract actual message from response body
        const serverMessage = error.error?.message || error.error?.errorMessage;

        switch (error.status) {
          case 401:
            errorMessage = serverMessage || 'Unauthorized access';
            break;
          case 403:
            errorMessage = serverMessage || 'Access forbidden';
            break;
          case 404:
            errorMessage = serverMessage || 'Resource not found';
            break;
          case 500:
            // For 500 errors, show the actual backend error message if available
            errorMessage = serverMessage || 'Internal server error';
            break;
          default:
            errorMessage = serverMessage || error.message;
        }
      }

      // Log error to console (components can handle specific cases)
      console.error('HTTP Error:', errorMessage, error);

      return throwError(() => error);
    })
  );
};
