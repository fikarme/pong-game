export interface ComponentOptions {
  className?: string;
  id?: string;
  tag?: string;
}

export class Component {
  protected element: HTMLElement;
  private children: Component[] = [];

  constructor(options: ComponentOptions = {}) {
    this.element = this.createElement(options);
    this.init();
  }

  protected createElement(options: ComponentOptions): HTMLElement {
    const element = document.createElement(options.tag || 'div');
    if (options.className) element.className = options.className;
    if (options.id) element.id = options.id;
    return element;
  }

  protected init(): void {
    // Override in child components
  }

  getElement(): HTMLElement {
    return this.element;
  }

  setHTML(html: string): Component {
    this.element.innerHTML = html;
    return this;
  }

  setText(text: string): Component {
    this.element.textContent = text;
    return this;
  }

  addClass(className: string): Component {
    const classes = className.split(' ').filter(cls => cls.trim() !== '');
    classes.forEach(cls => this.element.classList.add(cls));
    return this;
  }

  removeClass(className: string): Component {
    const classes = className.split(' ').filter(cls => cls.trim() !== '');
    classes.forEach(cls => this.element.classList.remove(cls));
    return this;
  }

  on(event: string, handler: EventListener): Component {
    this.element.addEventListener(event, handler);
    return this;
  }

  append(child: Component | HTMLElement): Component {
    if (child instanceof Component) {
      this.children.push(child);
      this.element.appendChild(child.getElement());
    } else {
      this.element.appendChild(child);
    }
    return this;
  }

  remove(): void {
    this.element.remove();
  }

  destroy(): void {
    this.children.forEach(child => child.destroy());
    this.children = [];
    this.remove();
  }
}

// Lightweight UI Button built on top of Component
export interface ButtonOptions extends ComponentOptions {
  label?: string;
  onClick?: (ev: MouseEvent) => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export class Button extends Component {
  private variant: 'primary' | 'secondary';

  constructor(options: ButtonOptions = {}) {
    const baseClasses = [
      'w-48',
      'rounded-md',
      'py-3',
      'text-lg',
      'sm:text-xl',
      'font-bold',
      'neon-btn'
    ].join(' ');

    super({
      tag: 'button',
      id: options.id,
      className: [baseClasses, options.className || ''].join(' ').trim()
    });

    this.variant = options.variant || 'primary';
    if (options.label) this.setText(options.label);
    if (options.onClick) this.onClick(options.onClick);
    if (options.disabled) this.setDisabled(true);
  }

  onClick(handler: (ev: MouseEvent) => void): Button {
    this.on('click', handler as EventListener);
    this.getElement().setAttribute('data-event-listener', 'click');
    return this;
  }

  setLabel(text: string): Button {
    this.setText(text);
    return this;
  }

  setDisabled(disabled: boolean): Button {
    (this.getElement() as HTMLButtonElement).disabled = disabled;
    if (disabled) {
      this.addClass('opacity-50 cursor-not-allowed');
    } else {
      this.removeClass('opacity-50 cursor-not-allowed');
    }
    return this;
  }
}
