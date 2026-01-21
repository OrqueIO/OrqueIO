import {
  Directive,
  Input,
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

    // Position tooltip
    this.positionTooltip();

    // Add visible class after a frame for animation
    requestAnimationFrame(() => {
      if (this.tooltipElement) {
        this.renderer.addClass(this.tooltipElement, 'visible');
      }
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

    const hostRect = this.el.nativeElement.getBoundingClientRect();
    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    let top: number;
    let left: number;

    switch (this.tooltipPlacement) {
      case 'top':
        top = hostRect.top + scrollTop - tooltipRect.height - 8;
        left = hostRect.left + scrollLeft + (hostRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = hostRect.bottom + scrollTop + 8;
        left = hostRect.left + scrollLeft + (hostRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = hostRect.top + scrollTop + (hostRect.height - tooltipRect.height) / 2;
        left = hostRect.left + scrollLeft - tooltipRect.width - 8;
        break;
      case 'right':
        top = hostRect.top + scrollTop + (hostRect.height - tooltipRect.height) / 2;
        left = hostRect.right + scrollLeft + 8;
        break;
    }

    // Keep tooltip within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 5) left = 5;
    if (left + tooltipRect.width > viewportWidth - 5) {
      left = viewportWidth - tooltipRect.width - 5;
    }
    if (top < scrollTop + 5) top = scrollTop + 5;
    if (top + tooltipRect.height > scrollTop + viewportHeight - 5) {
      top = scrollTop + viewportHeight - tooltipRect.height - 5;
    }

    this.renderer.setStyle(this.tooltipElement, 'top', `${top}px`);
    this.renderer.setStyle(this.tooltipElement, 'left', `${left}px`);
  }
}
