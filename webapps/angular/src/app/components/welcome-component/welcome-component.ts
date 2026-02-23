import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthService } from '../../services/auth';
import { PermissionService } from '../../services/permission.service';
import { SystemService } from '../../services/admin/system.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslateService, Language } from '../../i18n/translate.service';

import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBook,
  faVideo,
  faCode,
  faCogs,
  faCheckCircle,
  faExclamationTriangle,
  faLayerGroup,
  faLock,
  faEnvelope
} from '@fortawesome/free-solid-svg-icons';

interface App {
  appId: string;  // App identifier for permission check
  icon: string;
  titleKey: string;
  subtitleKey: string;
  descriptionKey: string;
  route: string;
  accentColor: string;
}

interface Resource {
  icon: IconDefinition;
  titleKey: string;
  descriptionKey: string;
  link: string;
}

interface EngineStatus {
  isActive: boolean;
  version: string;
  environment: string;
}

interface QuickStat {
  icon: IconDefinition;
  value: string;
  labelKey: string;
  bgColor: string;
}

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, TranslatePipe],
  templateUrl: './welcome-component.html',
  styleUrls: ['./welcome-component.css']
})
export class WelcomeComponent implements OnInit {

  // Font Awesome icons
  faBook = faBook;
  faVideo = faVideo;
  faCode = faCode;
  faCogs = faCogs;
  faCheckCircle = faCheckCircle;
  faExclamationTriangle = faExclamationTriangle;
  faLayerGroup = faLayerGroup;
  faLock = faLock;
  faEnvelope = faEnvelope;

  userName = '';
  currentLang: Language = 'fr';

  // Limited Access mode flag - true when user is authenticated but has no app permissions
  isLimitedAccess = false;

  private destroyRef = inject(DestroyRef);

  private permissionService = inject(PermissionService);

  constructor(
    private authService: AuthService,
    private systemService: SystemService,
    public translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.authService.authentication$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(auth => {
        this.userName = auth?.name || this.translateService.instant('GUEST');
        // Re-filter apps when authentication changes
        this.filterApps();
      });

    this.translateService.currentLang$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(lang => {
        this.currentLang = lang;
      });

    // Re-filter apps when permissions change
    this.permissionService.permissionsChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.filterApps();
      });

    this.loadEngineStatus();
    this.filterApps();
  }

  
  private filterApps(): void {
    this.apps = this.allApps.filter(app =>
      this.permissionService.canAccessApp(app.appId)
    );

    // Check for Limited Access mode
    this.isLimitedAccess = this.permissionService.isLimitedAccess();
  }

  private loadEngineStatus(): void {
    // Only call health endpoint - telemetry requires admin permissions
    this.systemService.getSystemHealth()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (health) => {
          this.engineStatus = {
            isActive: health.status === 'running',
            version: health.version || 'unknown',
            environment: this.detectEnvironment()
          };
        },
        error: () => {
          this.engineStatus = {
            isActive: false,
            version: 'unknown',
            environment: this.detectEnvironment()
          };
        }
      });
  }

  private detectEnvironment(): string {
    const hostname = window.location.hostname;
    let envKey = 'ENV_PRODUCTION';
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      envKey = 'ENV_LOCAL';
    } else if (hostname.includes('dev') || hostname.includes('development')) {
      envKey = 'ENV_DEVELOPMENT';
    } else if (hostname.includes('staging') || hostname.includes('stg')) {
      envKey = 'ENV_STAGING';
    } else if (hostname.includes('test') || hostname.includes('qa')) {
      envKey = 'ENV_TESTING';
    }
    return this.translateService.instant(envKey);
  }

  toggleLanguage(): void {
    const newLang = this.currentLang === 'fr' ? 'en' : 'fr';
    this.translateService.setLanguage(newLang);
  }

  // Engine status (connected to SystemService)
  engineStatus: EngineStatus = {
    isActive: false,
    version: '...',
    environment: '...'
  };

  // Apps with modern icons and accent colors (filtered by permissions)
  private allApps: App[] = [
    {
      appId: 'cockpit',
      icon: 'images/icons/cockpit-icon.svg',
      titleKey: 'APP_COCKPIT_TITLE',
      subtitleKey: 'APP_COCKPIT_SUBTITLE',
      descriptionKey: 'APP_COCKPIT_DESC',
      route: '/cockpit',
      accentColor: '#3b82f6'
    },
    {
      appId: 'tasklist',
      icon: 'images/icons/tasklist-icon.svg',
      titleKey: 'APP_TASKLIST_TITLE',
      subtitleKey: 'APP_TASKLIST_SUBTITLE',
      descriptionKey: 'APP_TASKLIST_DESC',
      route: '/tasklist',
      accentColor: '#10b981'
    },
    {
      appId: 'admin',
      icon: 'images/icons/admin-icon.svg',
      titleKey: 'APP_ADMIN_TITLE',
      subtitleKey: 'APP_ADMIN_SUBTITLE',
      descriptionKey: 'APP_ADMIN_DESC',
      route: '/admin',
      accentColor: '#8b5cf6'
    }
  ];

  // Filtered apps based on user permissions
  apps: App[] = [];

  // Quick statistics (can be connected to real data)
  quickStats: QuickStat[] = [
    {
      icon: this.faCogs,
      value: '24',
      labelKey: 'RUNNING_PROCESSES',
      bgColor: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
    },
    {
      icon: this.faCheckCircle,
      value: '156',
      labelKey: 'TASKS_COMPLETED',
      bgColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    {
      icon: this.faExclamationTriangle,
      value: '3',
      labelKey: 'OPEN_INCIDENTS',
      bgColor: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    },
    {
      icon: this.faLayerGroup,
      value: '12',
      labelKey: 'DEPLOYMENTS',
      bgColor: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
    }
  ];

  // Resources with descriptions
  resources: Resource[] = [
    {
      icon: this.faBook,
      titleKey: 'RESOURCE_DOCS_TITLE',
      descriptionKey: 'RESOURCE_DOCS_DESC',
      link: 'https://docs.orqueio.io/'
    },
    {
      icon: this.faVideo,
      titleKey: 'RESOURCE_LEARN_TITLE',
      descriptionKey: 'RESOURCE_LEARN_DESC',
      link: 'https://www.youtube.com/watch?v=mxv_dxGk3pQ'
    },
    {
      icon: this.faCode,
      titleKey: 'RESOURCE_SOURCE_TITLE',
      descriptionKey: 'RESOURCE_SOURCE_DESC',
      link: 'https://github.com/OrqueIO/OrqueIO'
    }
  ];

  openResource(link: string): void {
    window.open(link, '_blank', 'noopener,noreferrer');
  }
}
