import { LitElement, html, nothing, repeat } from "../../vendor/lit/lit-all-3.3.3.min.js";
import { getFirstDayOfWeek } from "../preferences.js";

export class Calendar extends LitElement {
  static properties = {
    _rangeStart: { state: true },
    _rangeEnd: { state: true },
    _anchorDate: { state: true },
    _visibleYear: { state: true },
    _firstDayOfWeek: { state: true },
    _selectionMode: { state: true }
  };

  constructor() {
    super();
    const today = new Date();
    this._rangeStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    this._anchorDate = new Date(this._rangeStart);
    this._rangeEnd = null;
    this._visibleYear = today.getFullYear();
    this._firstDayOfWeek = getFirstDayOfWeek();
    this._selectionMode = "range";
  }

  get selectedRange() {
    return {
      startDate: new Date(this._rangeStart),
      endDate: new Date(this._rangeEnd ?? this._rangeStart)
    };
  }

  get selectedDate() {
    return new Date(this._anchorDate);
  }

  get canMoveNext() {
    const today = new Date();
    return (this._rangeEnd ?? this._rangeStart) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  get firstDayOfWeek() {
    return this._firstDayOfWeek;
  }

  get selectionMode() {
    return this._selectionMode;
  }

  set selectionMode(mode) {
    if (mode !== "range" && mode !== "week" && mode !== "month") throw new TypeError(`Unsupported calendar selection mode: ${mode}`);
    if (mode === this._selectionMode) return;
    this._selectionMode = mode;
    this._selectDate(this._anchorDate);
  }

  connectedCallback() {
    super.connectedCallback();
    this.updateComplete.then(() => requestAnimationFrame(() => this.ensureSelectionVisible()));
  }

  refreshFirstDayOfWeek() {
    const firstDay = getFirstDayOfWeek();
    if (firstDay === this._firstDayOfWeek) return;
    this._firstDayOfWeek = firstDay;
    if (this._selectionMode === "week") this._selectDate(this._anchorDate);
    this.ensureSelectionVisible();
  }

  selectDate(date) {
    this._selectDate(date);
  }

  async ensureSelectionVisible() {
    await this.updateComplete;
    if (!this.isConnected || !this.clientHeight) return;
    const selected = this._dateCell(this._anchorDate);
    const weekdays = this.renderRoot.querySelector(".weekdays");
    if (!selected || !weekdays) return;
    const viewportTop = weekdays.getBoundingClientRect().bottom;
    const viewportBottom = this.getBoundingClientRect().bottom;
    const cell = selected.getBoundingClientRect();
    if (cell.top < viewportTop || cell.bottom > viewportBottom) {
      this.scrollTop += (cell.top + cell.bottom - viewportTop - viewportBottom) / 2;
    }
  }

  shiftSelection(direction) {
    if (direction !== -1 && direction !== 1) throw new TypeError("Direction must be -1 or 1");
    if (direction === 1 && !this.canMoveNext) return;

    if (this._selectionMode === "month") {
      this._selectDate(new Date(this._rangeStart.getFullYear(), this._rangeStart.getMonth() + direction, 1));
    } else if (this._selectionMode === "week") {
      this._selectDate(new Date(this._rangeStart.getFullYear(), this._rangeStart.getMonth(), this._rangeStart.getDate() + direction * 7));
    } else {
      const shiftDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate() + direction);
      this._rangeStart = shiftDay(this._rangeStart);
      if (this._rangeEnd) this._rangeEnd = shiftDay(this._rangeEnd);
      this._anchorDate = shiftDay(this._anchorDate);
      this._visibleYear = this._anchorDate.getFullYear();
      this._emitRangeChange();
    }
    this.ensureSelectionVisible();
  }

  _sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  _dayKey(date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  _dateLabel(date) {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()]}`;
  }

  _shiftYear(offset) {
    const targetYear = this._visibleYear + offset;
    if (targetYear > new Date().getFullYear()) return;
    this._visibleYear = targetYear;
    this.updateComplete.then(() => { this.scrollTop = 0; });
  }

  _selectDate(date, extendRange = false, preserveFocus = false) {
    const selected = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const today = new Date();
    if (selected > new Date(today.getFullYear(), today.getMonth(), today.getDate())) return;

    if (this._selectionMode === "month") {
      this._anchorDate = selected;
      this._rangeStart = new Date(selected.getFullYear(), selected.getMonth(), 1);
      this._rangeEnd = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
    } else if (this._selectionMode === "week") {
      const offset = (selected.getDay() - this._firstDayOfWeek + 7) % 7;
      this._anchorDate = selected;
      this._rangeStart = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() - offset);
      this._rangeEnd = new Date(this._rangeStart.getFullYear(), this._rangeStart.getMonth(), this._rangeStart.getDate() + 6);
    } else if (extendRange) {
      this._rangeStart = selected < this._anchorDate ? selected : new Date(this._anchorDate);
      this._rangeEnd = selected < this._anchorDate ? new Date(this._anchorDate) : selected;
    } else {
      this._anchorDate = selected;
      this._rangeStart = selected;
      this._rangeEnd = null;
    }
    this._visibleYear = selected.getFullYear();
    if (preserveFocus) this.updateComplete.then(() => this._dateCell(selected)?.focus());
    this._emitRangeChange();
  }

  _selectToday() {
    this._selectDate(new Date());
    this.ensureSelectionVisible();
  }

  _dateCell(date) {
    return this.renderRoot.querySelector(`[data-date="${this._dayKey(date)}"]`);
  }

  _emitRangeChange() {
    this.dispatchEvent(new CustomEvent("range-change", {
      bubbles: true,
      composed: true,
      detail: this.selectedRange
    }));
  }

  _renderDay(date, currentDay) {
    const isFuture = date > currentDay;
    const inRange = date >= this._rangeStart && date <= (this._rangeEnd ?? this._rangeStart);
    const className = [
      "day-button",
      date.getMonth() % 2 ? "striped-month" : "",
      inRange ? "is-in-range" : "",
      this._sameDay(date, this._rangeStart) ? "is-range-start" : "",
      this._rangeEnd && this._sameDay(date, this._rangeEnd) ? "is-range-end" : "",
      isFuture ? "future-day" : "",
      this._sameDay(date, currentDay) ? "is-today" : ""
    ].filter(Boolean).join(" ");
    return html`
      <button type="button" class=${className} aria-label=${this._dateLabel(date)}
        ?disabled=${isFuture} data-date=${isFuture ? nothing : this._dayKey(date)}
        aria-pressed=${isFuture ? nothing : String(inRange)}
        @click=${event => this._selectDate(date, event.shiftKey, event.detail === 0)}
        @keydown=${event => {
          if (event.shiftKey && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            this._selectDate(date, true, true);
          }
        }}>
        <span>${date.getDate()}</span>
        ${date.getDate() === 1 ? html`<small class="month-label">${date.getMonth() + 1}月</small>` : nothing}
      </button>
    `;
  }

  render() {
    const firstWeekday = (new Date(this._visibleYear, 0, 1).getDay() - this._firstDayOfWeek + 7) % 7;
    const dates = [];
    for (let month = 0; month < 12; month += 1) {
      const daysInMonth = new Date(this._visibleYear, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day += 1) dates.push(new Date(this._visibleYear, month, day));
    }
    const today = new Date();
    const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return html`
      <link rel="stylesheet" href=${new URL("./Calendar.css", import.meta.url).href}
        @load=${() => this.ensureSelectionVisible()}>
      <div class="calendar-toolbar">
        <div class="year-navigation">
          <button id="previous-year" type="button" aria-label="上一年" @click=${() => this._shiftYear(-1)}>‹</button>
          <strong id="visible-year">${this._visibleYear}年</strong>
          <button id="next-year" type="button" aria-label="下一年"
            ?disabled=${this._visibleYear >= today.getFullYear()} @click=${() => this._shiftYear(1)}>›</button>
        </div>
        <button id="today" type="button" @click=${this._selectToday}>今天</button>
      </div>
      <div class="weekdays" aria-hidden="true">
        ${Array.from({ length: 7 }, (_, offset) => html`<span>${["周日", "周一", "周二", "周三", "周四", "周五", "周六"][(this._firstDayOfWeek + offset) % 7]}</span>`)}
      </div>
      <div id="days" class="days">
        ${Array.from({ length: firstWeekday }, () => html`<span class="empty-day"></span>`)}
        ${repeat(dates, date => this._dayKey(date), date => this._renderDay(date, currentDay))}
      </div>
    `;
  }
}
