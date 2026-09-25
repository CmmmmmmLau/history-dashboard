import { LitElement, css, html, nothing } from "../../vendor/lit/lit-all-3.3.3.min.js";

export class ToolbarButton extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      flex: none;
      color: #4b5663;
      font: inherit;
    }

    :host([pressed]),
    :host([expanded]) {
      color: var(--color-accent);
    }

    :host([disabled]) {
      color: var(--color-disabled);
    }

    * {
      box-sizing: border-box;
    }

    button {
      height: 30px;
      padding: 0 11px;
      border: 1px solid var(--color-control-border);
      border-radius: 5px;
      background: var(--color-surface);
      color: #4b5663;
      font: inherit;
      font-size: 12px;
      cursor: pointer;
    }

    button:hover {
      background: var(--color-hover-subtle);
    }

    button:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: -2px;
    }

    :host([icon-only]) button {
      display: grid;
      place-items: center;
      width: 30px;
      padding: 0;
    }

    :host([group-position]) button {
      border-radius: 0;
    }

    :host([group-position="first"]) button {
      border-radius: 5px 0 0 5px;
    }

    :host([group-position="last"]) button {
      border-radius: 0 5px 5px 0;
    }

    button[aria-pressed="true"],
    button[aria-expanded="true"] {
      position: relative;
      border-color: var(--color-active-border);
      background: var(--color-accent-soft);
      color: var(--color-accent);
    }

    button:disabled,
    button:disabled:hover {
      background: var(--color-surface);
      color: var(--color-disabled);
      cursor: default;
    }
  `;

  static properties = {
    action: { type: String },
    label: { type: String },
    groupPosition: { type: String, attribute: "group-position" },
    disabled: { type: Boolean, reflect: true },
    pressed: { type: Boolean, reflect: true },
    expanded: { type: Boolean, reflect: true },
    controls: { type: String }
  };

  constructor() {
    super();
    this.action = "";
    this.label = "";
    this.groupPosition = "";
    this.disabled = false;
    this.pressed = false;
    this.expanded = false;
    this.controls = "";
  }

  _handleClick() {
    this.dispatchEvent(new CustomEvent("toolbar-button-click", {
      bubbles: true,
      composed: true,
      detail: { action: this.action }
    }));
  }

  render() {
    const isView = this.action.startsWith("view-");
    const isCalendar = this.action === "toggle-calendar";
    return html`
      <button type="button" ?disabled=${this.disabled}
        aria-label=${this.label}
        title=${this.label}
        aria-pressed=${isView ? String(this.pressed) : nothing}
        aria-expanded=${isCalendar ? String(this.expanded) : nothing}
        aria-controls=${this.controls || nothing}
        @click=${this._handleClick}><slot></slot></button>
    `;
  }
}
