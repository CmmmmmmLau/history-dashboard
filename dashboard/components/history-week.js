import { createFavicon } from "./favicon.js";
import { dayKey, groupDailyRecords, recordDetails, weekdayName } from "./history-records.js";

const template = document.createElement("template");
template.innerHTML = `
  <p id="status" class="status" role="status">正在加载历史记录…</p>
  <div id="week-grid" class="week-grid" hidden></div>
`;

class HistoryWeek extends HTMLElement {
  constructor() {
    super();
    this._weekStart = new Date();
    this._records = null;

    const shadow = this.attachShadow({ mode: "open" });
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("./history-week.css", import.meta.url).href;
    shadow.append(stylesheet, template.content.cloneNode(true));

    this._status = shadow.querySelector("#status");
    this._grid = shadow.querySelector("#week-grid");
  }

  set weekStart(date) {
    this._weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (this._records !== null) this._render();
  }

  set records(records) {
    this._records = [...records];
    this._render();
  }

  showStatus(message) {
    this._records = null;
    this._grid.replaceChildren();
    this._grid.hidden = true;
    this._status.textContent = message;
    this._status.hidden = false;
  }

  _render() {
    const byDay = new Map();
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(this._weekStart.getFullYear(), this._weekStart.getMonth(), this._weekStart.getDate() + offset);
      byDay.set(dayKey(date), { date, records: [] });
    }

    for (const record of this._records) {
      const date = new Date(record.visitTime);
      byDay.get(dayKey(date))?.records.push(record);
    }

    const fragment = document.createDocumentFragment();
    for (const { date, records } of byDay.values()) {
      const column = document.createElement("section");
      column.className = "week-day";
      const heading = document.createElement("h2");
      heading.className = "week-day-heading";
      heading.textContent = `${date.getMonth() + 1}月${date.getDate()}日 ${weekdayName(date)}`;
      const list = document.createElement("div");
      list.className = "week-day-records";

      // A compact weekly column shows one entry per URL and badges repeated visits.
      for (const { record, count } of groupDailyRecords(records)) {
        const isWebPage = /^https?:\/\//i.test(record.url);
        const item = document.createElement(isWebPage ? "a" : "div");
        item.className = "week-item";
        item.title = recordDetails(record, count);
        if (isWebPage) {
          item.href = record.url;
          item.target = "_blank";
          item.rel = "noopener noreferrer";
        }
        const icon = createFavicon(record.url);
        const title = document.createElement("span");
        title.className = "week-item-title";
        title.textContent = record.title || record.url;
        item.append(icon, title);
        if (count > 1) {
          const badge = document.createElement("span");
          badge.className = "visit-count";
          badge.textContent = String(count);
          badge.setAttribute("aria-label", `${count} 次访问`);
          item.append(badge);
        }
        list.append(item);
      }

      column.append(heading, list);
      fragment.append(column);
    }

    this._grid.replaceChildren(fragment);
    this._grid.hidden = false;
    this._status.hidden = true;
  }
}

customElements.define("history-week", HistoryWeek);
