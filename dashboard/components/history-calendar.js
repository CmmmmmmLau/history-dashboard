const template = document.createElement("template");
template.innerHTML = `
  <div class="calendar-toolbar">
    <div class="year-navigation">
      <button id="previous-year" type="button" aria-label="上一年">‹</button>
      <strong id="visible-year"></strong>
      <button id="next-year" type="button" aria-label="下一年">›</button>
    </div>
    <button id="today" type="button">今天</button>
  </div>
  <div class="weekdays" aria-hidden="true"></div>
  <div id="days" class="days"></div>
`;

const weekdayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function getFirstDayOfWeek() {
  try {
    const locale = new Intl.Locale(chrome.i18n.getUILanguage());
    const firstDay = (locale.getWeekInfo?.() ?? locale.weekInfo)?.firstDay;
    if (Number.isInteger(firstDay) && firstDay >= 1 && firstDay <= 7) return firstDay % 7;
  } catch (error) {
    console.warn("Unable to determine the locale's first day of week:", error);
  }
  return 1;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dateLabel(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdayNames[date.getDay()]}`;
}

class HistoryCalendar extends HTMLElement {
  constructor() {
    super();
    const today = new Date();
    this._rangeStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    this._anchorDate = new Date(this._rangeStart);
    this._rangeEnd = null;
    this._visibleYear = today.getFullYear();
    this._firstDayOfWeek = getFirstDayOfWeek();
    this._selectionMode = "range";

    const shadow = this.attachShadow({ mode: "open" });
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("./history-calendar.css", import.meta.url).href;
    stylesheet.addEventListener("load", () => this.ensureSelectionVisible());
    shadow.append(stylesheet, template.content.cloneNode(true));

    shadow.querySelector("#previous-year").addEventListener("click", () => this._shiftYear(-1));
    shadow.querySelector("#next-year").addEventListener("click", () => this._shiftYear(1));
    shadow.querySelector("#today").addEventListener("click", () => this._selectToday());
    this._yearLabel = shadow.querySelector("#visible-year");
    this._nextYearButton = shadow.querySelector("#next-year");
    this._weekdays = shadow.querySelector(".weekdays");
    this._days = shadow.querySelector("#days");
    this._renderWeekdays();
    this._render();
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

  selectDate(date) {
    this._selectDate(date);
  }

  ensureSelectionVisible() {
    if (!this.isConnected || !this.clientHeight) return;
    const selected = this._dateCell(this._anchorDate);
    if (!selected) return;

    const viewportTop = this._weekdays.getBoundingClientRect().bottom;
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
      this._render();
      this._emitRangeChange();
    }
    this.ensureSelectionVisible();
  }

  set selectionMode(mode) {
    if (mode !== "range" && mode !== "week" && mode !== "month") throw new TypeError(`Unsupported calendar selection mode: ${mode}`);
    if (mode === this._selectionMode) return;
    this._selectionMode = mode;
    this._selectDate(this._anchorDate);
  }

  get selectionMode() {
    return this._selectionMode;
  }

  connectedCallback() {
    requestAnimationFrame(() => {
      this.ensureSelectionVisible();
    });
  }

  _shiftYear(offset) {
    const targetYear = this._visibleYear + offset;
    if (targetYear > new Date().getFullYear()) return;
    this._visibleYear = targetYear;
    this._render();
    this.scrollTop = 0;
  }

  _selectDate(date, extendRange = false, preserveFocus = false) {
    const selected = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const today = new Date();
    if (selected > new Date(today.getFullYear(), today.getMonth(), today.getDate())) return;

    if (this._selectionMode === "month") {
      this._anchorDate = selected;
      this._rangeStart = new Date(selected.getFullYear(), selected.getMonth(), 1);
      this._rangeEnd = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
      this._visibleYear = selected.getFullYear();
      this._render();
      if (preserveFocus) this._focusDate(selected);
      this._emitRangeChange();
      return;
    }

    if (this._selectionMode === "week") {
      const offset = (selected.getDay() - this._firstDayOfWeek + 7) % 7;
      this._anchorDate = selected;
      this._rangeStart = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() - offset);
      this._rangeEnd = new Date(this._rangeStart.getFullYear(), this._rangeStart.getMonth(), this._rangeStart.getDate() + 6);
      this._visibleYear = selected.getFullYear();
      this._render();
      if (preserveFocus) this._focusDate(selected);
      this._emitRangeChange();
      return;
    }

    if (extendRange) {
      this._rangeStart = selected < this._anchorDate ? selected : new Date(this._anchorDate);
      this._rangeEnd = selected < this._anchorDate ? new Date(this._anchorDate) : selected;
    } else {
      this._anchorDate = selected;
      this._rangeStart = selected;
      this._rangeEnd = null;
    }
    this._visibleYear = selected.getFullYear();
    this._render();
    if (preserveFocus) this._focusDate(selected);
    this._emitRangeChange();
  }

  _selectToday() {
    const today = new Date();
    this._selectDate(today);
    this.ensureSelectionVisible();
  }

  _dateCell(date) {
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    return this._days.querySelector(`[data-date="${key}"]`);
  }

  _focusDate(date) {
    this._dateCell(date)?.focus();
  }

  _emitRangeChange() {
    this.dispatchEvent(new CustomEvent("range-change", {
      bubbles: true,
      composed: true,
      detail: this.selectedRange
    }));
  }

  _renderWeekdays() {
    const fragment = document.createDocumentFragment();
    for (let offset = 0; offset < 7; offset += 1) {
      const label = document.createElement("span");
      label.textContent = weekdayNames[(this._firstDayOfWeek + offset) % 7];
      fragment.append(label);
    }
    this._weekdays.replaceChildren(fragment);
  }

  _createDay(date, currentDay) {
    const isFuture = date > currentDay;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "day-button";
    if (date.getMonth() % 2 === 1) cell.classList.add("striped-month");
    cell.setAttribute("aria-label", dateLabel(date));

    const dayNumber = document.createElement("span");
    dayNumber.textContent = date.getDate();
    cell.append(dayNumber);

    const inRange = date >= this._rangeStart && date <= (this._rangeEnd ?? this._rangeStart);
    if (inRange) cell.classList.add("is-in-range");
    if (sameDay(date, this._rangeStart)) cell.classList.add("is-range-start");
    if (this._rangeEnd && sameDay(date, this._rangeEnd)) cell.classList.add("is-range-end");

    if (isFuture) {
      cell.disabled = true;
      cell.classList.add("future-day");
    } else {
      cell.dataset.date = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      cell.setAttribute("aria-pressed", String(inRange));
      if (sameDay(date, currentDay)) cell.classList.add("is-today");
      cell.addEventListener("click", event => this._selectDate(date, event.shiftKey, event.detail === 0));
      cell.addEventListener("keydown", event => {
        if (event.shiftKey && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          this._selectDate(date, true, true);
        }
      });
    }

    if (date.getDate() === 1) {
      const monthLabel = document.createElement("small");
      monthLabel.className = "month-label";
      monthLabel.textContent = `${date.getMonth() + 1}月`;
      cell.append(monthLabel);
    }
    return cell;
  }

  _render() {
    this._yearLabel.textContent = `${this._visibleYear}年`;
    this._nextYearButton.disabled = this._visibleYear >= new Date().getFullYear();
    const fragment = document.createDocumentFragment();
    const firstWeekday = (new Date(this._visibleYear, 0, 1).getDay() - this._firstDayOfWeek + 7) % 7;
    for (let cell = 0; cell < firstWeekday; cell += 1) {
      const empty = document.createElement("span");
      empty.className = "empty-day";
      fragment.append(empty);
    }

    const today = new Date();
    const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    for (let month = 0; month < 12; month += 1) {
      const daysInMonth = new Date(this._visibleYear, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day += 1) {
        fragment.append(this._createDay(new Date(this._visibleYear, month, day), currentDay));
      }
    }
    this._days.replaceChildren(fragment);
  }
}

customElements.define("history-calendar", HistoryCalendar);
