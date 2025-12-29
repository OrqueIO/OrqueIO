import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileComponent } from '../../shared/profile-component/profile-component';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, ProfileComponent, TranslatePipe],
  templateUrl: './profile-page.html',
  styleUrls: ['./profile-page.css']
})
export class ProfilePageComponent {}
