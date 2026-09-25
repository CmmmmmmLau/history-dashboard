import { LitElement, html, nothing, repeat } from "../../vendor/lit/lit-all-3.3.3.min.js";

export class WeekView extends LitElement {
  static properties = {
    _weekStart: { state: true },
    _records: { state: true },
    _statusMessage: { state: true }
  };

  constructor() {
    super();
    this._weekStart = new Date();
    this._records = null;
    this._statusMessage = "正在加载历史记录…";
    this._timeFormatter = new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    });
  }

  set weekStart(date) {
    this._weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  set records(records) {
    this._records = [...records];
  }

  showStatus(message) {
    this._records = null;
    this._statusMessage = message;
  }

  _dayKey(date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  _weekdayName(date) {
    return ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][date.getDay()];
  }

  _groupDailyRecords(records) {
    const grouped = new Map();
    for (const record of [...records].sort((a, b) => b.visitTime - a.visitTime)) {
      const existing = grouped.get(record.url);
      if (existing) existing.count += 1;
      else grouped.set(record.url, { record, count: 1 });
    }
    return [...grouped.values()];
  }

  _recordDetails(record, count) {
    const date = new Date(record.visitTime);
    const details = [
      this._timeFormatter.format(date),
      `• ${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${this._weekdayName(date)}`,
      `• 标题：${record.title || record.url}`,
      `• 地址：${record.url}`
    ];
    if (count > 1) details.push(`• 当天访问次数: ${count}`);
    return details.join("\n");
  }

  _renderItem({ record, count }) {
    const content = html`
      <hd-favicon .url=${record.url}></hd-favicon>
      <span class="week-item-title">${record.title || record.url}</span>
      ${count > 1 ? html`<span class="visit-count" aria-label=${`${count} 次访问`}>${count}</span>` : nothing}
    `;
    const title = this._recordDetails(record, count);
    return /^https?:\/\//i.test(record.url)
      ? html`<a class="week-item" title=${title} href=${record.url} target="_blank" rel="noopener noreferrer">${content}</a>`
      : html`<div class="week-item" title=${title}>${content}</div>`;
  }

  _renderDay({ date, records }) {
    return html`
      <section class="week-day">
        <h2 class="week-day-heading">${date.getMonth() + 1}月${date.getDate()}日 ${this._weekdayName(date)}</h2>
        <div class="week-day-records">${repeat(this._groupDailyRecords(records), item => item.record.url, item => this._renderItem(item))}</div>
      </section>
    `;
  }

  render() {
    const days = new Map();
    if (this._records !== null) {
      for (let offset = 0; offset < 7; offset += 1) {
        const date = new Date(this._weekStart.getFullYear(), this._weekStart.getMonth(), this._weekStart.getDate() + offset);
        days.set(this._dayKey(date), { date, records: [] });
      }
      for (const record of this._records) {
        const date = new Date(record.visitTime);
        days.get(this._dayKey(date))?.records.push(record);
      }
    }
    return html`
      <link rel="stylesheet" href=${new URL("./WeekView.css", import.meta.url).href}>
      <p id="status" class="status" role="status" ?hidden=${this._records !== null}>${this._statusMessage}</p>
      <div id="week-grid" class="week-grid" ?hidden=${this._records === null}>
        ${repeat([...days.values()], day => this._dayKey(day.date), day => this._renderDay(day))}
      </div>
    `;
  }
}
