const template = document.createElement("template");
template.innerHTML = `
  <div class="list-header">
    <span class="sort-column"><button id="sort-time" type="button" data-order="desc" aria-label="时间降序，点击切换为升序">时间</button></span>
    <span>标题</span>
    <span>网址</span>
  </div>
  <p id="status" class="status" role="status">正在加载历史记录…</p>
  <div id="results" class="results"></div>
`;

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});

function dayHeadingLabel(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 星期${"日一二三四五六"[date.getDay()]}`;
}

class HistoryList extends HTMLElement {
  constructor() {
    super();
    this._records = null;
    this._emptyMessage = "所选范围内没有历史记录。";
    this._sortAscending = false;

    const shadow = this.attachShadow({ mode: "open" });
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("./history-list.css", import.meta.url).href;
    shadow.append(stylesheet, template.content.cloneNode(true));

    this._sortButton = shadow.querySelector("#sort-time");
    this._status = shadow.querySelector("#status");
    this._results = shadow.querySelector("#results");
    this._sortButton.addEventListener("click", () => {
      this._sortAscending = !this._sortAscending;
      this._sortButton.dataset.order = this._sortAscending ? "asc" : "desc";
      this._sortButton.setAttribute("aria-label", this._sortAscending
        ? "时间升序，点击切换为降序"
        : "时间降序，点击切换为升序");
      if (this._records !== null) this._render();
    });
  }

  set emptyMessage(message) {
    this._emptyMessage = message;
  }

  set records(records) {
    this._records = [...records];
    this._render();
  }

  showStatus(message) {
    this._records = null;
    this._results.replaceChildren();
    this._status.textContent = message;
    this._status.hidden = false;
  }

  _render() {
    this._results.replaceChildren();
    if (this._records.length === 0) {
      this._status.textContent = this._emptyMessage;
      this._status.hidden = false;
      return;
    }

    this._status.hidden = true;
    const fragment = document.createDocumentFragment();
    const sortedRecords = [...this._records].sort((a, b) => this._sortAscending
      ? a.visitTime - b.visitTime
      : b.visitTime - a.visitTime);
    let currentDayKey = "";
    let currentSection;
    let rowIndex = 0;

    for (const record of sortedRecords) {
      const visitDate = new Date(record.visitTime);
      const dayKey = `${visitDate.getFullYear()}-${visitDate.getMonth() + 1}-${visitDate.getDate()}`;
      if (dayKey !== currentDayKey) {
        currentDayKey = dayKey;
        rowIndex = 0;
        const section = document.createElement("section");
        section.className = "history-day";
        currentSection = section;
        const heading = document.createElement("h2");
        heading.className = "day-heading";
        const toggle = document.createElement("button");
        toggle.className = "day-toggle";
        toggle.type = "button";
        toggle.setAttribute("aria-expanded", "true");
        toggle.textContent = dayHeadingLabel(visitDate);
        toggle.addEventListener("click", () => {
          const collapsed = section.classList.toggle("is-collapsed");
          toggle.setAttribute("aria-expanded", String(!collapsed));
        });
        heading.append(toggle);
        section.append(heading);
        fragment.append(section);
      }

      const isWebPage = /^https?:\/\//i.test(record.url);
      const row = document.createElement(isWebPage ? "a" : "div");
      row.className = "history-row";
      if (rowIndex % 2 === 1) row.classList.add("is-alt-row");
      rowIndex += 1;
      if (isWebPage) {
        row.href = record.url;
        row.target = "_blank";
        row.rel = "noopener noreferrer";
      }

      const time = document.createElement("span");
      time.className = "history-time";
      time.textContent = timeFormatter.format(visitDate);
      const title = document.createElement("span");
      title.className = "history-title";
      title.textContent = record.title || record.url;
      title.title = record.title || record.url;
      const url = document.createElement("span");
      url.className = "history-url";
      url.textContent = record.url;
      url.title = record.url;
      row.append(time, title, url);
      currentSection.append(row);
    }

    this._results.append(fragment);
  }
}

customElements.define("history-list", HistoryList);
