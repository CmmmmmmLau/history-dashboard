import { LitElement, html, nothing } from "../../vendor/lit/lit-all-3.3.3.min.js";

export class Favicon extends LitElement {
  static properties = {
    pageUrl: { type: String },
    _failed: { state: true }
  };

  constructor() {
    super();
    this.pageUrl = "";
    this._failed = false;
  }

  // Keep the image in the parent view's shadow tree so its existing icon CSS applies.
  createRenderRoot() {
    return this;
  }

  willUpdate(changed) {
    if (changed.has("pageUrl")) {
      this._failed = false;
      this.style.display = "";
    }
  }

  _faviconUrl() {
    const url = new URL(chrome.runtime.getURL("/_favicon/"));
    url.searchParams.set("pageUrl", this.pageUrl);
    url.searchParams.set("size", "16");
    return url.toString();
  }

  _hideFailedIcon() {
    this._failed = true;
    this.style.display = "none";
  }

  render() {
    return this.pageUrl && !this._failed ? html`
      <img src=${this._faviconUrl()} alt="" width="16" height="16" loading="lazy"
        style="display:block;width:100%;height:100%;object-fit:contain"
        @error=${this._hideFailedIcon}>
    ` : nothing;
  }
}
