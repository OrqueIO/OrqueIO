import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthService } from '../../services/auth';
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
  faLayerGroup
} from '@fortawesome/free-solid-svg-icons';

interface App {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  route: string;
  accentColor: string;
}

interface Resource {
  icon: IconDefinition;
  title: string;
  description: string;
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
  label: string;
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

  userName = '';
  currentLang: Language = 'fr';

  private destroyRef = inject(DestroyRef);

  constructor(
    private authService: AuthService,
    private systemService: SystemService,
    public translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.authService.authentication$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(auth => {
        this.userName = auth?.name || 'Invité';
      });

    this.translateService.currentLang$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(lang => {
        this.currentLang = lang;
      });

    this.loadEngineStatus();
  }

  private loadEngineStatus(): void {
    forkJoin({
      health: this.systemService.getSystemHealth(),
      telemetry: this.systemService.getTelemetryData()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ health, telemetry }) => {
          this.engineStatus = {
            isActive: health.status === 'running',
            version: health.version || telemetry.product?.version || 'unknown',
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
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'Local';
    } else if (hostname.includes('dev') || hostname.includes('development')) {
      return 'Development';
    } else if (hostname.includes('staging') || hostname.includes('stg')) {
      return 'Staging';
    } else if (hostname.includes('test') || hostname.includes('qa')) {
      return 'Testing';
    }
    return 'Production';
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

  // Apps with modern icons and accent colors
  apps: App[] = [
    {
      icon: 'images/icons/cockpit-icon.svg',
      title: 'Cockpit',
      subtitle: 'Process Monitoring',
      description: 'Monitor and analyze your BPMN processes.',
      route: '/cockpit',
      accentColor: '#3b82f6'
    },
    {
      icon: 'images/icons/tasklist-icon.svg',
      title: 'Tasklist',
      subtitle: 'Task Management',
      description: 'Manage and complete workflow tasks.',
      route: '/tasklist',
      accentColor: '#10b981'
    },
    {
      icon: 'images/icons/admin-icon.svg',
      title: 'Admin',
      subtitle: 'Administration',
      description: 'Configure users, groups and settings.',
      route: '/admin',
      accentColor: '#8b5cf6'
    }
  ];

  // Quick statistics (can be connected to real data)
  quickStats: QuickStat[] = [
    {
      icon: this.faCogs,
      value: '24',
      label: 'Running Processes',
      bgColor: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
    },
    {
      icon: this.faCheckCircle,
      value: '156',
      label: 'Tasks Completed',
      bgColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    {
      icon: this.faExclamationTriangle,
      value: '3',
      label: 'Open Incidents',
      bgColor: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    },
    {
      icon: this.faLayerGroup,
      value: '12',
      label: 'Deployments',
      bgColor: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
    }
  ];

  // Resources with descriptions
  resources: Resource[] = [
    {
      icon: this.faBook,
      title: 'Documentation',
      description: 'Complete guides and API references',
      link: 'https://docs.camunda.org'
    },
    {
      icon: this.faVideo,
      title: 'Learn',
      description: 'Video tutorials and best practices',
      link: 'https://academy.camunda.com'
    },
    {
      icon: this.faCode,
      title: 'Source Code',
      description: 'Explore and contribute on GitHub',
      link: 'https://github.com/camunda'
    }
  ];

  openResource(link: string): void {
    window.open(link, '_blank', 'noopener,noreferrer');
  }
}
