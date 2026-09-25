import { LitElement, css, html } from "../../vendor/lit/lit-all-3.3.3.min.js";

export class Toolbar extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 1;
      flex: none;
      font: inherit;
    }

    * {
      box-sizing: border-box;
    }

    .content-toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, auto) minmax(0, 1fr);
      align-items: center;
      gap: 8px 16px;
      min-height: 48px;
      padding: 6px 16px;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    .search-area {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .heading {
      display: flex;
      align-items: baseline;
      justify-self: center;
      gap: 12px;
      min-width: 0;
    }

    h1 {
      overflow: hidden;
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #count {
      color: var(--color-status);
      white-space: nowrap;
      font-size: 12px;
    }

    .search-area input {
      min-width: 0;
      width: min(280px, 100%);
      height: 30px;
      padding: 0 10px;
      border: 1px solid var(--color-control-border);
      border-radius: 5px;
      background: var(--color-surface);
      font: inherit;
      font-size: 12px;
    }

    .search-area input:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: -2px;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
    }

    .actions {
      display: flex;
      align-items: center;
      justify-self: end;
      gap: 8px;
    }

    .range-navigation {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .view-switcher {
      display: flex;
      align-items: center;
    }

    .view-switcher hd-toolbar-button + hd-toolbar-button {
      margin-left: -1px;
    }

    @media (max-width: 900px) {
      .content-toolbar {
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .heading {
        grid-column: 1 / -1;
        grid-row: 2;
      }
    }

    @media (max-width: 560px) {
      .search-area {
        grid-column: 1 / -1;
      }

      .search-area input {
        width: 100%;
      }

      .heading {
        grid-row: 2;
      }

      .actions {
        grid-column: 1 / -1;
        grid-row: 3;
        justify-self: center;
      }
    }
  `;

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

  get searchText() {
    return this.renderRoot.querySelector("#search")?.value.trim() ?? "";
  }

  _emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
  }

  _handleButtonClick(event) {
    const { action } = event.detail;
    if (action.startsWith("view-")) {
      this._emit("view-change", { view: action.slice(5) });
    } else {
      this._emit(action);
    }
  }

  render() {
    const unit = this.view === "week" ? "周" : this.view === "month" ? "月" : "日";
    const calendarLabel = this.calendarHidden ? "显示日历" : "隐藏日历";
    return html`
      <header class="content-toolbar" @toolbar-button-click=${this._handleButtonClick}>
        <div class="search-area">
          <hd-toolbar-button action="toggle-calendar" icon-only controls="calendar"
            .label=${calendarLabel} .expanded=${!this.calendarHidden}>
            <hd-icon name="calendar" size="18" aria-hidden="true"></hd-icon>
          </hd-toolbar-button>
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
            <hd-toolbar-button action="previous-range" icon-only .label=${`上一${unit}`}>
              <hd-icon name="previous" size="20" aria-hidden="true"></hd-icon>
            </hd-toolbar-button>
            <hd-toolbar-button action="next-range" icon-only .label=${`下一${unit}`}
              .disabled=${!this.canMoveNext}>
              <hd-icon name="next" size="20" aria-hidden="true"></hd-icon>
            </hd-toolbar-button>
            <div class="view-switcher" role="group" aria-label="历史记录视图">
              <hd-toolbar-button action="view-list" label="日视图" group-position="first"
                .pressed=${this.view === "list"}>日</hd-toolbar-button>
              <hd-toolbar-button action="view-week" label="周视图" group-position="middle"
                .pressed=${this.view === "week"}>周</hd-toolbar-button>
              <hd-toolbar-button action="view-month" label="月视图" group-position="last"
                .pressed=${this.view === "month"}>月</hd-toolbar-button>
            </div>
          </div>
          <hd-toolbar-button action="refresh-history" icon-only label="刷新">
            <hd-icon name="refresh" size="18" aria-hidden="true"></hd-icon>
          </hd-toolbar-button>
          <hd-toolbar-button action="open-settings" label="设置">设置</hd-toolbar-button>
        </div>
      </header>
    `;
  }
}
