import { LitElement, css, html, styleMap, unsafeCSS } from "../../vendor/lit/lit-all-3.3.3.min.js";

const calendarIcon = unsafeCSS(new URL("../assets/system-uicons--calendar-days.svg", import.meta.url).href);
const chevronIcon = unsafeCSS(new URL("../assets/system-uicons--chevron-left.svg", import.meta.url).href);
const refreshIcon = unsafeCSS(new URL("../assets/system-uicons--refresh.svg", import.meta.url).href);

class HistoryIcon extends LitElement {
  static properties = {
    name: { type: String, reflect: true },
    size: { type: String },
    color: { type: String }
  };

  static styles = css`
    :host {
      display: inline-grid;
      place-items: center;
    }

    :host([name="calendar"]) span {
      -webkit-mask: url("${calendarIcon}") center / contain no-repeat;
      mask: url("${calendarIcon}") center / contain no-repeat;
    }

    :host([name="previous"]) span,
    :host([name="next"]) span {
      -webkit-mask: url("${chevronIcon}") center / contain no-repeat;
      mask: url("${chevronIcon}") center / contain no-repeat;
    }

    :host([name="next"]) span {
      transform: rotate(180deg);
    }

    :host([name="refresh"]) span {
      -webkit-mask: url("${refreshIcon}") center / contain no-repeat;
      mask: url("${refreshIcon}") center / contain no-repeat;
    }
  `;

  constructor() {
    super();
    this.name = "";
    this.size = "";
    this.color = "";
  }

  render() {
    const size = this.size.trim();
    const length = /^\d+(?:\.\d+)?$/.test(size) ? `${size}px` : size;
    return html`<span style=${styleMap({
      width: length || "18px",
      height: length || "18px",
      color: this.color || "currentColor",
      background: "currentColor"
    })}></span>`;
  }
}

customElements.define("history-icon", HistoryIcon);
