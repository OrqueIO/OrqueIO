import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faLock, faHome, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslateService } from '../../i18n/translate.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, TranslatePipe],
  templateUrl: './access-denied.component.html',
  styleUrls: ['./access-denied.component.css']
})
export class AccessDeniedComponent implements OnInit {
  faLock = faLock;
  faHome = faHome;
  faArrowLeft = faArrowLeft;

  // Query parameters from guard redirect
  returnUrl: string | null = null;
  requiredApp: string | null = null;
  requiredPermission: string | null = null;
  requiredResource: string | null = null;

  // User info
  userName: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    public translateService: TranslateService
  ) {}

  ngOnInit(): void {
    // Get query parameters
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || null;
      this.requiredApp = params['requiredApp'] || null;
      this.requiredPermission = params['requiredPermission'] || null;
      this.requiredResource = params['requiredResource'] || null;
    });

    // Get current user name
    const auth = this.authService.currentAuthentication;
    this.userName = auth?.name || '';
  }

  /**
   * Get translated message explaining why access was denied
   */
  get deniedReason(): string {
    if (this.requiredApp) {
      return this.translateService.instant('ACCESS_DENIED_APP_REASON', {
        app: this.requiredApp
      });
    }

    if (this.requiredPermission && this.requiredResource) {
      return this.translateService.instant('ACCESS_DENIED_PERMISSION_REASON', {
        permission: this.requiredPermission,
        resource: this.requiredResource
      });
    }

    return this.translateService.instant('ACCESS_DENIED_GENERIC_REASON');
  }

  /**
   * Navigate to home page
   */
  goHome(): void {
    this.router.navigate(['/']);
  }

  /**
   * Go back to previous page (if different from denied page)
   */
  goBack(): void {
    // Use browser history if available
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.goHome();
    }
  }

  /**
   * Logout and return to login page
   */
  logout(): void {
    this.authService.smartLogout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}
