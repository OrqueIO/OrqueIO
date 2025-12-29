import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './card-component.html',
  styleUrls: ['./card-component.css']
})
export class CardComponent {
  @Input() icon: string = '';
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() description: string = '';
  @Input() daysLeft?: number;
  @Input() isResource: boolean = false;
  @Input() route: string = '';
}