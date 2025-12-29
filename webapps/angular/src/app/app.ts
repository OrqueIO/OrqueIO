import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FooterComponent } from './shared/footer/footer';
import { NavbarComponent } from './shared/navbar/navbar';
import { NotificationsPanelComponent } from './components/notifications-panel/notifications-panel';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FooterComponent, NavbarComponent, NotificationsPanelComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  isAuthenticated = false;

  private destroyRef = inject(DestroyRef);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.authentication$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(auth => {
        this.isAuthenticated = !!auth;
      });
  }

  onLogout(): void {
    this.authService.logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.router.navigate(['/login']);
      });
  }
}
