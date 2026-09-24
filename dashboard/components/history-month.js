import { createFavicon } from "./favicon.js";
import { dayKey, groupDailyRecords, recordDetails, visitTime, weekdayName } from "./history-records.js";

const template = document.createElement("template");
template.innerHTML = `
  <p id="status" class="status" role="status">正在加载历史记录…</p>
  <div id="layout" class="month-layout" hidden>
    <div class="month-calendar">
      <div id="weekdays" class="month-weekdays" aria-hidden="true"></div>
      <div id="days" class="month-days"></div>
    </div>
    <aside class="month-details" aria-label="当月浏览记录">
      <div class="details-toolbar">条目</div>
      <div id="details-list" class="details-list"></div>
    </aside>
  </div>
`;

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function siteName(pageUrl) {
  try {
    const url = new URL(pageUrl);
    if (url.protocol === "chrome-extension:") return "扩展页面";
    return url.hostname.replace(/^www\./, "") || url.protocol.replace(":", "");
  } catch {
    return pageUrl;
  }
}

class HistoryMonth extends HTMLElement {
  constructor() {
    super();
    const today = new Date();
    this._monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    this._selectedDate = null;
    this._firstDayOfWeek = 1;
    this._records = null;
    this._dayButtons = new Map();
    this._detailSections = new Map();

    const shadow = this.attachShadow({ mode: "open" });
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("./history-month.css", import.meta.url).href;
    shadow.append(stylesheet, template.content.cloneNode(true));

    this._status = shadow.querySelector("#status");
    this._layout = shadow.querySelector("#layout");
    this._weekdays = shadow.querySelector("#weekdays");
    this._days = shadow.querySelector("#days");
    this._details = shadow.querySelector("#details-list");
    this._renderWeekdays();
  }

  set firstDayOfWeek(day) {
    this._firstDayOfWeek = day;
    this._renderWeekdays();
    if (this._records !== null) this._render();
  }

  set monthStart(date) {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    if (!sameDay(this._monthStart, monthStart)) this.selectedDate = null;
    this._monthStart = monthStart;
    if (this._records !== null) this._render();
  }

  set selectedDate(date) {
    this._selectedDate = date === null ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate());
    this._updateSelection();
    if (this._selectedDate) this._scrollToSelected(true);
    else this._details.scrollTop = 0;
  }

  set records(records) {
    this._records = [...records];
    this._render();
  }

  showStatus(message) {
    this._records = null;
    this._layout.hidden = true;
    this._days.replaceChildren();
    this._details.replaceChildren();
    this._dayButtons.clear();
    this._detailSections.clear();
    this._status.textContent = message;
    this._status.hidden = false;
  }

  _renderWeekdays() {
    const fragment = document.createDocumentFragment();
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(2026, 0, 4 + (this._firstDayOfWeek + offset) % 7);
      const label = document.createElement("span");
      label.textContent = weekdayName(date);
      fragment.append(label);
    }
    this._weekdays.replaceChildren(fragment);
  }

  _selectDay(date) {
    this.selectedDate = date;
    this.dispatchEvent(new CustomEvent("date-select", {
      bubbles: true,
      composed: true,
      detail: { date: new Date(date) }
    }));
  }

  _updateSelection() {
    const selectedKey = this._selectedDate ? dayKey(this._selectedDate) : null;
    for (const [key, button] of this._dayButtons) {
      const selected = key === selectedKey;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    for (const [key, section] of this._detailSections) {
      section.classList.toggle("is-selected", key === selectedKey);
    }
  }

  _scrollToSelected(smooth) {
    if (!this._selectedDate) return;
    const section = this._detailSections.get(dayKey(this._selectedDate));
    if (!section || this._layout.hidden) return;
    const top = section.getBoundingClientRect().top - this._details.getBoundingClientRect().top + this._details.scrollTop;
    this._details.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
  }

  _createDay(date, records) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "month-day";
    const key = dayKey(date);
    this._dayButtons.set(key, button);
    const today = new Date();
    button.disabled = date > new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (button.disabled) button.classList.add("is-future");
    button.setAttribute("aria-label", `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdayName(date)}，${records.length} 次浏览`);
    button.addEventListener("click", () => this._selectDay(date));

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = String(date.getDate());
    button.append(number);

    if (records.length > 0) {
      const uniquePages = new Set(records.map(record => record.url));
      const siteCounts = new Map();
      for (const record of records) {
        const site = siteName(record.url);
        siteCounts.set(site, (siteCounts.get(site) ?? 0) + 1);
      }
      const rankedSites = [...siteCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"));

      const summary = document.createElement("span");
      summary.className = "day-summary";
      if (records.length >= 100) summary.classList.add("activity-high");
      else if (records.length >= 20) summary.classList.add("activity-medium");
      const visits = document.createElement("span");
      visits.textContent = `${records.length} 次浏览`;
      const pages = document.createElement("span");
      pages.textContent = `${uniquePages.size} 个网页`;
      summary.append(visits, pages);
      button.append(summary);

      const ranking = document.createElement("span");
      ranking.className = "site-ranking";
      for (const [site, count] of rankedSites.slice(0, 7)) {
        const name = document.createElement("span");
        name.className = "site-name";
        name.textContent = site;
        name.title = `${site}: ${count} 次浏览`;
        ranking.append(name);
      }
      if (rankedSites.length > 7) {
        const more = document.createElement("span");
        more.className = "more-sites";
        more.textContent = `还有 ${rankedSites.length - 7} 个网站`;
        ranking.append(more);
      }
      button.append(ranking);
    }
    return button;
  }

  _createDetailsDay(date, records) {
    const section = document.createElement("section");
    section.className = "details-day";
    this._detailSections.set(dayKey(date), section);
    const heading = document.createElement("h3");
    heading.className = "details-day-heading";
    const label = document.createElement("span");
    label.textContent = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdayName(date)}`;
    heading.append(label);
    const total = document.createElement("span");
    total.className = "details-day-count";
    total.textContent = String(records.length);
    heading.append(total);
    section.append(heading);

    for (const { record, count } of groupDailyRecords(records)) {
      const isWebPage = /^https?:\/\//i.test(record.url);
      const item = document.createElement(isWebPage ? "a" : "div");
      item.className = "details-item";
      item.title = recordDetails(record, count);
      if (isWebPage) {
        item.href = record.url;
        item.target = "_blank";
        item.rel = "noopener noreferrer";
      }
      const icon = createFavicon(record.url);
      const time = document.createElement("span");
      time.className = "details-time";
      time.textContent = visitTime(new Date(record.visitTime)).slice(0, 5);
      const title = document.createElement("span");
      title.className = "details-title";
      title.textContent = record.title || record.url;
      item.append(icon, time, title);
      if (count > 1) {
        const badge = document.createElement("span");
        badge.className = "visit-count";
        badge.textContent = String(count);
        badge.setAttribute("aria-label", `${count} 次访问`);
        item.append(badge);
      }
      section.append(item);
    }
    return section;
  }

  _render() {
    const year = this._monthStart.getFullYear();
    const month = this._monthStart.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const byDay = new Map();
    for (let day = 1; day <= daysInMonth; day += 1) byDay.set(day, []);
    for (const record of this._records) {
      const date = new Date(record.visitTime);
      if (date.getFullYear() === year && date.getMonth() === month) byDay.get(date.getDate()).push(record);
    }

    this._dayButtons.clear();
    this._detailSections.clear();
    const days = document.createDocumentFragment();
    const leading = (new Date(year, month, 1).getDay() - this._firstDayOfWeek + 7) % 7;
    for (let index = 0; index < leading; index += 1) {
      const blank = document.createElement("span");
      blank.className = "empty-cell";
      days.append(blank);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      days.append(this._createDay(new Date(year, month, day), byDay.get(day)));
    }
    const trailing = (7 - (leading + daysInMonth) % 7) % 7;
    for (let index = 0; index < trailing; index += 1) {
      const blank = document.createElement("span");
      blank.className = "empty-cell";
      days.append(blank);
    }

    const details = document.createDocumentFragment();
    const today = new Date();
    const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    for (let day = daysInMonth; day >= 1; day -= 1) {
      const date = new Date(year, month, day);
      const records = byDay.get(day);
      if (date <= currentDay && records.length > 0) details.append(this._createDetailsDay(date, records));
    }
    this._days.replaceChildren(days);
    this._details.replaceChildren(details);
    this._layout.hidden = false;
    this._status.hidden = true;
    this._updateSelection();
    requestAnimationFrame(() => {
      if (this.isConnected && this._records !== null) this._scrollToSelected(false);
    });
  }
}

customElements.define("history-month", HistoryMonth);
