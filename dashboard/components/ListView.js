import { LitElement, html, keyed, nothing, repeat } from "../../vendor/lit/lit-all-3.3.3.min.js";

export class ListView extends LitElement {
  static properties = {
    _records: { state: true },
    _emptyMessage: { state: true },
    _sortAscending: { state: true },
    _collapsedDays: { state: true },
    _statusMessage: { state: true }
  };

  constructor() {
    super();
    this._records = null;
    this._emptyMessage = "所选范围内没有历史记录。";
    this._sortAscending = false;
    this._collapsedDays = new Set();
    this._statusMessage = "正在加载历史记录…";
    this._timeFormatter = new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    });
  }

  set emptyMessage(message) {
    this._emptyMessage = message;
  }

  set records(records) {
    this._records = [...records];
    this._collapsedDays = new Set();
  }

  showStatus(message) {
    this._records = null;
    this._statusMessage = message;
  }

  _dayKey(date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  _dayHeading(date) {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 星期${"日一二三四五六"[date.getDay()]}`;
  }

  _toggleDay(key) {
    const collapsed = new Set(this._collapsedDays);
    if (collapsed.has(key)) collapsed.delete(key);
    else collapsed.add(key);
    this._collapsedDays = collapsed;
  }

  _renderRow(record, index) {
    const date = new Date(record.visitTime);
    const content = html`
      <span class="history-time">${this._timeFormatter.format(date)}</span>
      <span class="history-title" title=${record.title || record.url}>
        <hd-favicon .url=${record.url}></hd-favicon>
        <span class="history-title-text">${record.title || record.url}</span>
      </span>
      <span class="history-url" title=${record.url}>${record.url}</span>
    `;
    const className = `history-row${index % 2 ? " is-alt-row" : ""}`;
    return /^https?:\/\//i.test(record.url)
      ? html`<a class=${className} href=${record.url} target="_blank" rel="noopener noreferrer">${content}</a>`
      : html`<div class=${className}>${content}</div>`;
  }

  _renderDay({ key, date, records }) {
    const collapsed = this._collapsedDays.has(key);
    return html`
      <section class=${`history-day${collapsed ? " is-collapsed" : ""}`}>
        <h2 class="day-heading"><button class="day-toggle" type="button"
          aria-expanded=${String(!collapsed)} @click=${() => this._toggleDay(key)}>${this._dayHeading(date)}</button></h2>
        ${repeat(records, record => record, (record, index) => this._renderRow(record, index))}
      </section>
    `;
  }

  render() {
    const days = [];
    if (this._records) {
      const sorted = [...this._records].sort((a, b) => this._sortAscending
        ? a.visitTime - b.visitTime : b.visitTime - a.visitTime);
      for (const record of sorted) {
        const date = new Date(record.visitTime);
        const key = this._dayKey(date);
        if (days.at(-1)?.key !== key) days.push({ key, date, records: [] });
        days.at(-1).records.push(record);
      }
    }
    const status = this._records === null ? this._statusMessage : this._records.length === 0 ? this._emptyMessage : null;
    return html`
      <link rel="stylesheet" href=${new URL("./ListView.css", import.meta.url).href}>
      <div class="list-header">
        <span class="sort-column"><button id="sort-time" type="button"
          data-order=${this._sortAscending ? "asc" : "desc"}
          aria-label=${this._sortAscending ? "时间升序，点击切换为降序" : "时间降序，点击切换为升序"}
          @click=${() => { this._sortAscending = !this._sortAscending; }}>时间</button></span>
        <span>标题</span><span>网址</span>
      </div>
      <p id="status" class="status" role="status" ?hidden=${status === null}>${status ?? nothing}</p>
      ${keyed(this._sortAscending, html`
        <div id="results" class="results">${repeat(days, day => day.key, day => this._renderDay(day))}</div>
      `)}
    `;
  }
}
