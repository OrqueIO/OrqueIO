import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CardComponent } from '../../shared/card-component/card-component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthService } from '../../services/auth';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslateService, Language } from '../../i18n/translate.service';

import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faBook, faVideo, faCode } from '@fortawesome/free-solid-svg-icons';

interface App {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  daysLeft?: number;
  route?: string;
}

interface Resource {
  icon: IconDefinition;
  title: string;
  description: string;
  link: string;
}

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, CardComponent, FontAwesomeModule, TranslatePipe],
  templateUrl: './welcome-component.html',
  styleUrls: ['./welcome-component.css']
})
export class WelcomeComponent implements OnInit {

  // Icônes Font Awesome
  faBook = faBook;
  faVideo = faVideo;
  faCode = faCode;

  userName = '';
  currentLang: Language = 'fr';

  private destroyRef = inject(DestroyRef);

  constructor(
    private authService: AuthService,
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
  }

  toggleLanguage(): void {
    const newLang = this.currentLang === 'fr' ? 'en' : 'fr';
    this.translateService.setLanguage(newLang);
  }

  apps: App[] = [
    {
      icon: 'images/cockpit.svg',
      title: 'Cockpit',
      subtitle: ' edition',
      description: 'Monitor and analyze your BPMN processes.',
      daysLeft: 0,
      route: '/cockpit'
    },
    {
      icon: 'images/tasklist.svg',
      title: 'Tasklist',
      subtitle: ' edition',
      description: 'Manage and complete your workflow tasks.',
      daysLeft: 23,
      route: '/tasklist'
    },
    {
      icon: 'images/admin.svg',
      title: 'Admin',
      subtitle: 'self-managed app',
      description: 'Configure and administer your platform.',
      daysLeft: 0,
      route: '/admin'
    }
  ];


  resources: Resource[] = [
    {
      icon: this.faBook,
      title: 'Documentation',
      description: 'Find guides and references for the platform.',
      link: 'https://docs.example.com'
    },
    {
      icon: this.faVideo,
      title: 'Learn',
      description: 'Watch tutorials to build and automate workflows.',
      link: 'https://videos.example.com'
    },
    {
      icon: this.faCode,
      title: 'Source code',
      description: 'Browse the repositories on GitHub.',
      link: 'https://github.com/example'
    }
  ];


  openResource(link: string): void {
    window.open(link, '_blank');
  }
}
