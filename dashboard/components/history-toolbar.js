import { LitElement, html } from "../../vendor/lit/lit-all-3.3.3.min.js";

class HistoryToolbar extends LitElement {
  static properties = {
    selectedDateLabel: { attribute: false },
    countText: { attribute: false },
    view: { attribute: false },
    canMoveNext: { attribute: false },
    calendarHidden: { attribute: false }
  };

  constructor() {
    super();
    this.selectedDateLabel = "";
    this.countText = "";
    this.view = "list";
    this.canMoveNext = false;
    this.calendarHidden = false;
  }

  // The calendar button's aria-controls refers to an element in the page.
  createRenderRoot() {
    return this;
  }

  get searchText() {
    return this.querySelector("#search")?.value.trim() ?? "";
  }

  _emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
  }

  render() {
    const unit = this.view === "week" ? "周" : this.view === "month" ? "月" : "日";
    const calendarLabel = this.calendarHidden ? "显示日历" : "隐藏日历";
    return html`
      <header class="content-toolbar">
        <div class="search-area">
          <button id="toggle-calendar" type="button" aria-controls="calendar"
            aria-expanded=${String(!this.calendarHidden)} aria-label=${calendarLabel} title=${calendarLabel}
            @click=${() => this._emit("toggle-calendar")}></button>
          <label class="sr-only" for="search">搜索所选范围的记录</label>
          <input id="search" type="search" placeholder="搜索所选范围的标题或网址" autocomplete="off"
            @input=${event => this._emit("search-input", { value: event.currentTarget.value })}>
        </div>
        <div class="heading">
          <h1 id="selected-date">${this.selectedDateLabel}</h1>
          <span id="count" aria-live="polite">${this.countText}</span>
        </div>
        <div class="actions">
          <div class="range-navigation">
            <button id="previous-range" type="button" aria-label=${`上一${unit}`} title=${`上一${unit}`}
              @click=${() => this._emit("previous-range")}></button>
            <button id="next-range" type="button" aria-label=${`下一${unit}`} title=${`下一${unit}`}
              ?disabled=${!this.canMoveNext} @click=${() => this._emit("next-range")}></button>
            <div class="view-switcher" role="group" aria-label="历史记录视图">
              <button id="list-view" type="button" aria-pressed=${String(this.view === "list")}
                aria-label="日视图" title="日视图" @click=${() => this._emit("view-change", { view: "list" })}>日</button>
              <button id="week-view" type="button" aria-pressed=${String(this.view === "week")}
                aria-label="周视图" title="周视图" @click=${() => this._emit("view-change", { view: "week" })}>周</button>
              <button id="month-view" type="button" aria-pressed=${String(this.view === "month")}
                aria-label="月视图" title="月视图" @click=${() => this._emit("view-change", { view: "month" })}>月</button>
            </div>
          </div>
          <button id="refresh" type="button" aria-label="刷新" title="刷新"
            @click=${() => this._emit("refresh-history")}></button>
          <button id="settings" type="button" @click=${() => this._emit("open-settings")}>设置</button>
        </div>
      </header>
    `;
  }
}

customElements.define("history-toolbar", HistoryToolbar);
