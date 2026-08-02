import {
  Directive,
  Input,
  HostBinding,
  ElementRef,
  OnDestroy,
  inject,
  Renderer2,
  OnChanges,
  SimpleChanges
} from '@angular/core';

/**
 * Tooltip directive - equivalent to uib-tooltip in AngularJS
 * Usage: <span appTooltip="Tooltip text" tooltipPlacement="top">Hover me</span>
 */
@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective implements OnDestroy, OnChanges {
  private readonly el = inject(ElementRef);
  private readonly renderer = inject(Renderer2);

  @Input('appTooltip') tooltipText: string = '';
  @Input() tooltipPlacement: 'top' | 'bottom' | 'left' | 'right' = 'top';
  @Input() tooltipDelay: number = 200;
  @Input() tooltipVariant: 'default' | 'danger' | 'success' | 'warning' | 'primary' = 'default';

  @HostBinding('attr.aria-label')
  get ariaLabelAttr(): string | null {
    return this.tooltipText || null;
  }

  private tooltipElement: HTMLElement | null = null;
  private showTimeout: ReturnType<typeof setTimeout> | null = null;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  private mouseEnterListener: (() => void) | null = null;
  private mouseLeaveListener: (() => void) | null = null;
  private focusListener: (() => void) | null = null;
  private blurListener: (() => void) | null = null;

  constructor() {
    this.setupListeners();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tooltipText'] && this.tooltipElement) {
      const textSpan = this.tooltipElement.querySelector('.tooltip-text');
      if (textSpan) {
        textSpan.textContent = this.tooltipText;
      }
    }
  }

  ngOnDestroy(): void {
    this.removeListeners();
    this.hideTooltip();
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }

  private setupListeners(): void {
    const element = this.el.nativeElement;

    this.mouseEnterListener = this.renderer.listen(element, 'mouseenter', () => {
      this.scheduleShow();
    });

    this.mouseLeaveListener = this.renderer.listen(element, 'mouseleave', () => {
      this.scheduleHide();
    });

    this.focusListener = this.renderer.listen(element, 'focus', () => {
      this.scheduleShow();
    });

    this.blurListener = this.renderer.listen(element, 'blur', () => {
      this.scheduleHide();
    });
  }

  private removeListeners(): void {
    if (this.mouseEnterListener) this.mouseEnterListener();
    if (this.mouseLeaveListener) this.mouseLeaveListener();
    if (this.focusListener) this.focusListener();
    if (this.blurListener) this.blurListener();
  }

  private scheduleShow(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    if (!this.tooltipText) return;

    this.showTimeout = setTimeout(() => {
      this.showTooltip();
    }, this.tooltipDelay);
  }

  private scheduleHide(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }

    this.hideTimeout = setTimeout(() => {
      this.hideTooltip();
    }, 100);
  }

  private showTooltip(): void {
    if (this.tooltipElement || !this.tooltipText) return;

    // Create tooltip element
    this.tooltipElement = this.renderer.createElement('div');
    this.renderer.addClass(this.tooltipElement, 'app-tooltip');
    this.renderer.addClass(this.tooltipElement, `tooltip-${this.tooltipPlacement}`);
    this.renderer.addClass(this.tooltipElement, `tooltip-${this.tooltipVariant}`);

    // Create arrow
    const arrow = this.renderer.createElement('div');
    this.renderer.addClass(arrow, 'tooltip-arrow');
    this.renderer.appendChild(this.tooltipElement, arrow);

    // Create text container
    const textSpan = this.renderer.createElement('span');
    this.renderer.addClass(textSpan, 'tooltip-text');
    const text = this.renderer.createText(this.tooltipText);
    this.renderer.appendChild(textSpan, text);
    this.renderer.appendChild(this.tooltipElement, textSpan);

    // Add to body
    this.renderer.appendChild(document.body, this.tooltipElement);

    // Position and reveal in the same rAF: dimensions are now known, no position flash
    requestAnimationFrame(() => {
      if (!this.tooltipElement) return;
      this.positionTooltip();
      this.renderer.addClass(this.tooltipElement, 'visible');
    });
  }

  private hideTooltip(): void {
    if (!this.tooltipElement) return;

    this.renderer.removeClass(this.tooltipElement, 'visible');

    // Remove after animation
    setTimeout(() => {
      if (this.tooltipElement && this.tooltipElement.parentNode) {
        this.renderer.removeChild(document.body, this.tooltipElement);
        this.tooltipElement = null;
      }
    }, 150);
  }

  private positionTooltip(): void {
    if (!this.tooltipElement) return;

    // position: fixed → coordinates are viewport-relative; no scroll offset needed
    const hostRect    = this.el.nativeElement.getBoundingClientRect();
    const tooltipRect = this.tooltipElement.getBoundingClientRect();

    let top: number;
    let left: number;

    switch (this.tooltipPlacement) {
      case 'top': {
        const rawTop = hostRect.top - tooltipRect.height - 8;
        const { containerTop, floor } = this.getStickyHeaderInfo();
        if (rawTop < floor || rawTop < 5) {
          // Not enough room above button: anchor just above the scroll container
          // (i.e. above the sticky column header row)
          top = Math.max(5, containerTop - tooltipRect.height - 8);
        } else {
          top = rawTop;
        }
        left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
        break;
      }
      case 'bottom':
        top  = hostRect.bottom + 8;
        left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top  = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
        left = hostRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top  = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
        left = hostRect.right + 8;
        break;
    }

    // Clamp within viewport (all coords already viewport-relative for position: fixed)
    if (left < 5) left = 5;
    if (left + tooltipRect.width > window.innerWidth - 5) {
      left = window.innerWidth - tooltipRect.width - 5;
    }
    if (top < 5) top = 5;
    if (top + tooltipRect.height > window.innerHeight - 5) {
      top = window.innerHeight - tooltipRect.height - 5;
    }

    this.renderer.setStyle(this.tooltipElement, 'top',  `${top}px`);
    this.renderer.setStyle(this.tooltipElement, 'left', `${left}px`);
  }

  /**
   * Walks up to the nearest overflow-scrolling ancestor and returns:
   * - containerTop: viewport Y of its top edge
   * - floor: viewport Y of the bottom edge of any sticky <th>/<thead> inside it
   *   (falls back to containerTop when no sticky header is found)
   */
  private getStickyHeaderInfo(): { containerTop: number; floor: number } {
    let el: HTMLElement | null = this.el.nativeElement.parentElement;
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      if (style.overflowY === 'auto'   || style.overflowY === 'scroll' ||
          style.overflow  === 'auto'   || style.overflow  === 'scroll') {
        const containerTop = el.getBoundingClientRect().top;
        let floor = containerTop;
        el.querySelectorAll<HTMLElement>('th, thead').forEach(child => {
          if (window.getComputedStyle(child).position === 'sticky') {
            floor = Math.max(floor, child.getBoundingClientRect().bottom);
          }
        });
        return { containerTop, floor };
      }
      el = el.parentElement;
    }
    return { containerTop: 0, floor: 0 };
  }
}
