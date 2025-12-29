import { Directive, ElementRef, HostListener, Input, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appClipboard]',
  standalone: true
})
export class ClipboardDirective implements OnDestroy {
  @Input('appClipboard') textToCopy: string = '';

  private tooltip: HTMLElement | null = null;
  private timeoutId: any;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {
    // Add copy cursor style
    this.renderer.setStyle(this.el.nativeElement, 'cursor', 'copy');
  }

  @HostListener('click', ['$event'])
  async onClick(event: MouseEvent): Promise<void> {
    event.stopPropagation();

    const text = this.textToCopy || this.el.nativeElement.textContent?.trim() || '';

    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      this.showTooltip('Copied!');
    } catch (err) {
      // Fallback for older browsers
      this.fallbackCopy(text);
    }
  }

  private fallbackCopy(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      this.showTooltip('Copied!');
    } catch (err) {
      this.showTooltip('Failed to copy');
    }

    document.body.removeChild(textArea);
  }

  private showTooltip(message: string): void {
    this.removeTooltip();

    this.tooltip = this.renderer.createElement('div');
    const text = this.renderer.createText(message);
    this.renderer.appendChild(this.tooltip, text);

    // Style the tooltip
    this.renderer.setStyle(this.tooltip, 'position', 'absolute');
    this.renderer.setStyle(this.tooltip, 'background', '#333');
    this.renderer.setStyle(this.tooltip, 'color', '#fff');
    this.renderer.setStyle(this.tooltip, 'padding', '4px 8px');
    this.renderer.setStyle(this.tooltip, 'border-radius', '4px');
    this.renderer.setStyle(this.tooltip, 'font-size', '12px');
    this.renderer.setStyle(this.tooltip, 'z-index', '10000');
    this.renderer.setStyle(this.tooltip, 'white-space', 'nowrap');
    this.renderer.setStyle(this.tooltip, 'pointer-events', 'none');
    this.renderer.setStyle(this.tooltip, 'animation', 'fadeIn 0.2s ease');

    // Get element position
    const rect = this.el.nativeElement.getBoundingClientRect();
    this.renderer.setStyle(this.tooltip, 'top', `${rect.top - 30 + window.scrollY}px`);
    this.renderer.setStyle(this.tooltip, 'left', `${rect.left + rect.width / 2}px`);
    this.renderer.setStyle(this.tooltip, 'transform', 'translateX(-50%)');

    this.renderer.appendChild(document.body, this.tooltip);

    // Remove tooltip after delay
    this.timeoutId = setTimeout(() => {
      this.removeTooltip();
    }, 1500);
  }

  private removeTooltip(): void {
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
      this.tooltip = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  ngOnDestroy(): void {
    this.removeTooltip();
  }
}
