import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeAll } from 'vitest';

import { initTestEnvironment } from '../../testing/test-utils';
import { BetaBadgeComponent } from './beta-badge';

describe('BetaBadgeComponent', () => {
  beforeAll(() => { initTestEnvironment(); });

  it('shows the Beta pill with its tooltip through translation keys', () => {
    TestBed.configureTestingModule({ imports: [BetaBadgeComponent] });
    const fixture = TestBed.createComponent(BetaBadgeComponent);
    fixture.detectChanges();

    const pill: HTMLElement = fixture.nativeElement.querySelector('.beta-badge');
    expect(pill).not.toBeNull();
    expect(pill.textContent).toContain('common.beta');
    expect(pill.title).toBe('common.betaHint');
  });
});
