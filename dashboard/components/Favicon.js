import { LitElement, css, html, nothing } from "../../vendor/lit/lit-all-3.3.3.min.js";

export class Favicon extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      flex: none;
    }

    img {
      display: block;
      object-fit: contain;
    }
  `;

  static properties = {
    url: { type: String },
    size: { type: Number },
    _failed: { state: true }
  };

  constructor() {
    super();
    this.url = "";
    this.size = 16;
    this._failed = false;
  }

  render() {
    if (!this.url || this._failed) return nothing;

    const size = Number.isFinite(this.size) && this.size > 0
      ? Math.max(1, Math.round(this.size))
      : 16;
    const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
    faviconUrl.searchParams.set("pageUrl", this.url);
    faviconUrl.searchParams.set("size", String(size));
    return html`
      <img src=${faviconUrl.toString()} alt="" width=${size} height=${size} loading="lazy"
        @error=${() => { this._failed = true; }}>
    `;
  }
}
