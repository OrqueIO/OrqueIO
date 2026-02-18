import { Pipe, PipeTransform, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { TranslateService } from './translate.service';
import { Subscription } from 'rxjs';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // Impure pipe to react to language changes
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private lastKey: string = '';
  private lastParams: { [key: string]: string } | undefined;
  private lastValue: string = '';
  private subscription: Subscription;

  constructor(
    private translateService: TranslateService,
    private cdr: ChangeDetectorRef
  ) {
    this.subscription = this.translateService.currentLang$.subscribe(() => {
      // Force re-transform when language changes
      if (this.lastKey) {
        this.lastValue = this.translateService.instant(this.lastKey, this.lastParams);
        this.cdr.markForCheck();
      }
    });
  }

  transform(key: string, params?: { [key: string]: string }): string {
    if (key !== this.lastKey || params !== this.lastParams) {
      this.lastKey = key;
      this.lastParams = params;
      this.lastValue = this.translateService.instant(key, params);
    }
    return this.lastValue;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
