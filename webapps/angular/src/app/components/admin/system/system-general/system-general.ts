import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faThumbsUp } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { SystemService } from '../../../../services/admin/system.service';

/**
 * System General Settings Component
 * Displays basic process engine information - matches the original implementation
 */
@Component({
  selector: 'app-system-general',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    TranslatePipe
  ],
  templateUrl: './system-general.html',
  styleUrls: ['./system-general.css']
})
export class SystemGeneralComponent {
  private systemService = inject(SystemService);

  // Icons
  faThumbsUp = faThumbsUp;

  /**
   * Get current engine name from service
   */
  get processEngineName(): string {
    return this.systemService.getCurrentEngine();
  }
}
