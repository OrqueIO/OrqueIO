import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '../i18n/translate.service';

@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly appName = 'OrqueIO';

  constructor(
    private readonly title: Title,
    private readonly translateService: TranslateService
  ) {
    super();
  }

  override updateTitle(routerState: RouterStateSnapshot): void {
    const titleKey = this.buildTitle(routerState);

    if (titleKey) {
      const translatedTitle = this.translateService.instant(titleKey);
      this.title.setTitle(`${translatedTitle} | ${this.appName}`);
    } else {
      this.title.setTitle(this.appName);
    }
  }
}
