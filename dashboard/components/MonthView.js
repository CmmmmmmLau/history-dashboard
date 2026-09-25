import { LitElement, html, nothing, repeat } from "../../vendor/lit/lit-all-3.3.3.min.js";

export class MonthView extends LitElement {
  static properties = {
    _monthStart: { state: true },
    _selectedDate: { state: true },
    _firstDayOfWeek: { state: true },
    _records: { state: true },
    _statusMessage: { state: true }
  };

  constructor() {
    super();
    const today = new Date();
    this._monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    this._selectedDate = null;
    this._firstDayOfWeek = 1;
    this._records = null;
    this._statusMessage = "正在加载历史记录…";
    this._scrollSmooth = false;
    this._timeFormatter = new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    });
  }

  set firstDayOfWeek(day) {
    this._firstDayOfWeek = day;
  }

  set monthStart(date) {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    if (!this._sameDay(this._monthStart, monthStart)) this.selectedDate = null;
    this._monthStart = monthStart;
  }

  set selectedDate(date) {
    this._selectedDate = date === null ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate());
    this._scrollSmooth = date !== null;
  }

  set records(records) {
    this._records = [...records];
  }

  showStatus(message) {
    this._records = null;
    this._statusMessage = message;
  }

  updated(changed) {
    if (!changed.has("_records") && !changed.has("_selectedDate") && !changed.has("_monthStart")) return;
    const selectedKey = this._selectedDate ? this._dayKey(this._selectedDate) : null;
    const smooth = this._scrollSmooth;
    this._scrollSmooth = false;
    requestAnimationFrame(() => {
      if (!this.isConnected || this._records === null) return;
      if (selectedKey !== (this._selectedDate ? this._dayKey(this._selectedDate) : null)) return;
      const details = this.renderRoot.querySelector("#details-list");
      if (!details) return;
      if (!selectedKey) details.scrollTop = 0;
      else this._scrollToSelected(details, selectedKey, smooth);
    });
  }

  _sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  _dayKey(date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  _weekdayName(date) {
    return ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][date.getDay()];
  }

  _siteName(pageUrl) {
    try {
      const url = new URL(pageUrl);
      if (url.protocol === "chrome-extension:") return "扩展页面";
      return url.hostname.replace(/^www\./, "") || url.protocol.replace(":", "");
    } catch {
      return pageUrl;
    }
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

  _selectDay(date) {
    this.selectedDate = date;
    this.dispatchEvent(new CustomEvent("date-select", {
      bubbles: true,
      composed: true,
      detail: { date: new Date(date) }
    }));
  }

  _scrollToSelected(details, selectedKey, smooth) {
    const section = [...details.querySelectorAll(".details-day")]
      .find(element => element.dataset.date === selectedKey);
    if (!section) return;
    const top = section.getBoundingClientRect().top - details.getBoundingClientRect().top + details.scrollTop;
    details.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
  }

  _renderDay(date, records, currentDay) {
    const selected = this._selectedDate && this._sameDay(date, this._selectedDate);
    const future = date > currentDay;
    const siteCounts = new Map();
    for (const record of records) {
      const site = this._siteName(record.url);
      siteCounts.set(site, (siteCounts.get(site) ?? 0) + 1);
    }
    const rankedSites = [...siteCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"));
    const activity = records.length >= 100 ? " activity-high" : records.length >= 20 ? " activity-medium" : "";
    return html`
      <button type="button" class=${`month-day${selected ? " is-selected" : ""}${future ? " is-future" : ""}`}
        ?disabled=${future} aria-pressed=${String(Boolean(selected))}
        aria-label=${`${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${this._weekdayName(date)}，${records.length} 次浏览`}
        @click=${() => this._selectDay(date)}>
        <span class="day-number">${date.getDate()}</span>
        ${records.length ? html`
          <span class=${`day-summary${activity}`}>
            <span>${records.length} 次浏览</span>
            <span>${new Set(records.map(record => record.url)).size} 个网页</span>
          </span>
          <span class="site-ranking">
            ${rankedSites.slice(0, 7).map(([site, count]) => html`
              <span class="site-name" title=${`${site}: ${count} 次浏览`}>${site}</span>
            `)}
            ${rankedSites.length > 7 ? html`<span class="more-sites">还有 ${rankedSites.length - 7} 个网站</span>` : nothing}
          </span>
        ` : nothing}
      </button>
    `;
  }

  _renderDetailItem({ record, count }) {
    const content = html`
      <hd-favicon .url=${record.url} size="14"></hd-favicon>
      <span class="details-time">${this._timeFormatter.format(new Date(record.visitTime)).slice(0, 5)}</span>
      <span class="details-title">${record.title || record.url}</span>
      ${count > 1 ? html`<span class="visit-count" aria-label=${`${count} 次访问`}>${count}</span>` : nothing}
    `;
    const title = this._recordDetails(record, count);
    return /^https?:\/\//i.test(record.url)
      ? html`<a class="details-item" title=${title} href=${record.url} target="_blank" rel="noopener noreferrer">${content}</a>`
      : html`<div class="details-item" title=${title}>${content}</div>`;
  }

  _renderDetailsDay({ date, records }) {
    const key = this._dayKey(date);
    const selected = this._selectedDate && key === this._dayKey(this._selectedDate);
    return html`
      <section class=${`details-day${selected ? " is-selected" : ""}`} data-date=${key}>
        <h3 class="details-day-heading">
          <span>${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${this._weekdayName(date)}</span>
          <span class="details-day-count">${records.length}</span>
        </h3>
        ${repeat(this._groupDailyRecords(records), item => item.record.url, item => this._renderDetailItem(item))}
      </section>
    `;
  }

  render() {
    const year = this._monthStart.getFullYear();
    const month = this._monthStart.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const byDay = new Map(Array.from({ length: daysInMonth }, (_, index) => [index + 1, []]));
    for (const record of this._records ?? []) {
      const date = new Date(record.visitTime);
      if (date.getFullYear() === year && date.getMonth() === month) byDay.get(date.getDate()).push(record);
    }
    const leading = (new Date(year, month, 1).getDay() - this._firstDayOfWeek + 7) % 7;
    const trailing = (7 - (leading + daysInMonth) % 7) % 7;
    const dates = Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1));
    const today = new Date();
    const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const detailDays = [...dates].reverse().filter(date => date <= currentDay && byDay.get(date.getDate()).length > 0)
      .map(date => ({ date, records: byDay.get(date.getDate()) }));
    return html`
      <link rel="stylesheet" href=${new URL("./MonthView.css", import.meta.url).href}>
      <p id="status" class="status" role="status" ?hidden=${this._records !== null}>${this._statusMessage}</p>
      <div id="layout" class="month-layout" ?hidden=${this._records === null}>
        <div class="month-calendar">
          <div id="weekdays" class="month-weekdays" aria-hidden="true">
            ${Array.from({ length: 7 }, (_, offset) => html`
              <span>${this._weekdayName(new Date(2026, 0, 4 + (this._firstDayOfWeek + offset) % 7))}</span>
            `)}
          </div>
          <div id="days" class="month-days">
            ${Array.from({ length: leading }, () => html`<span class="empty-cell"></span>`)}
            ${repeat(dates, date => this._dayKey(date), date => this._renderDay(date, byDay.get(date.getDate()), currentDay))}
            ${Array.from({ length: trailing }, () => html`<span class="empty-cell"></span>`)}
          </div>
        </div>
        <aside class="month-details" aria-label="当月浏览记录">
          <div class="details-toolbar">条目</div>
          <div id="details-list" class="details-list">
            ${repeat(detailDays, day => this._dayKey(day.date), day => this._renderDetailsDay(day))}
          </div>
        </aside>
      </div>
    `;
  }
}
