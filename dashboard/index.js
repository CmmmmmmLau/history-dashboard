import "./components/history-calendar.js";
import "./components/history-list.js";
import "./components/history-week.js";
import "./components/history-month.js";
import { FIRST_DAY_OF_WEEK_KEY } from "./preferences.js";

const calendar = document.querySelector("history-calendar");
const dashboard = document.querySelector(".dashboard");
const content = document.querySelector(".content");
const toggleCalendarButton = document.querySelector("#toggle-calendar");
const listViewButton = document.querySelector("#list-view");
const weekViewButton = document.querySelector("#week-view");
const monthViewButton = document.querySelector("#month-view");
const previousRangeButton = document.querySelector("#previous-range");
const nextRangeButton = document.querySelector("#next-range");
const selectedDateLabel = document.querySelector("#selected-date");
const searchInput = document.querySelector("#search");
const refreshButton = document.querySelector("#refresh");
const settingsButton = document.querySelector("#settings");
const count = document.querySelector("#count");
const historyList = document.querySelector("history-list");
const historyWeek = document.querySelector("history-week");
const historyMonth = document.querySelector("history-month");

const VIEW_STORAGE_KEY = "history-dashboard:view";
const CALENDAR_HIDDEN_STORAGE_KEY = "history-dashboard:calendar-hidden";
const weekdayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
let requestId = 0;
let searchTimer;
let currentView = "list";
let activeMonthKey = null;

function dateLabel(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdayNames[date.getDay()]}`;
}

function rangeLabel(startDate, endDate) {
  if (startDate.getTime() === endDate.getTime()) return dateLabel(startDate);
  const shortDate = date => `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  return `${shortDate(startDate)} — ${shortDate(endDate)}`;
}

function updateRangeNavigation() {
  const unit = currentView === "week" ? "周" : currentView === "month" ? "月" : "日";
  previousRangeButton.setAttribute("aria-label", `上一${unit}`);
  previousRangeButton.title = `上一${unit}`;
  nextRangeButton.setAttribute("aria-label", `下一${unit}`);
  nextRangeButton.title = `下一${unit}`;
  nextRangeButton.disabled = !calendar.canMoveNext;
}

async function loadHistory() {
  const currentRequest = ++requestId;
  const view = currentView === "week" ? historyWeek : currentView === "month" ? historyMonth : historyList;
  view.showStatus("正在加载历史记录…");
  count.textContent = "";

  const { startDate, endDate } = calendar.selectedRange;
  if (currentView === "week") historyWeek.weekStart = startDate;
  if (currentView === "month") {
    historyMonth.monthStart = startDate;
  }
  const startTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const endTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1).getTime();
  const query = searchInput.value.trim();
  try {
    const items = await chrome.history.search({
      text: query,
      startTime,
      endTime,
      maxResults: 1000
    });
    if (currentRequest !== requestId) return;

    const visits = [];
    const repeatedItems = [];
    for (const item of items) {
      if (!item.url) continue;
      if (item.visitCount === 1 && item.lastVisitTime >= startTime && item.lastVisitTime < endTime) {
        visits.push({ url: item.url, title: item.title, visitTime: item.lastVisitTime });
      } else {
        repeatedItems.push(item);
      }
    }

    for (let index = 0; index < repeatedItems.length; index += 25) {
      const batch = repeatedItems.slice(index, index + 25);
      const visitLists = await Promise.all(batch.map(item => chrome.history.getVisits({ url: item.url })));
      if (currentRequest !== requestId) return;
      visitLists.forEach((list, itemIndex) => {
        const item = batch[itemIndex];
        for (const visit of list) {
          if (visit.visitTime >= startTime && visit.visitTime < endTime) {
            visits.push({ url: item.url, title: item.title, visitTime: visit.visitTime });
          }
        }
      });
    }

    if (currentView === "week") {
      historyWeek.records = visits;
    } else if (currentView === "month") {
      historyMonth.records = visits;
    } else {
      historyList.emptyMessage = query
        ? "所选范围内没有匹配的历史记录。"
        : "所选范围内没有历史记录。";
      historyList.records = visits;
    }
    count.textContent = `${visits.length} 条记录${items.length === 1000 ? " · 结果可能不完整" : ""}`;
  } catch (error) {
    if (currentRequest !== requestId) return;
    view.showStatus("无法读取历史记录，请检查插件权限后重试。");
    console.error("Failed to load history:", error);
  }
}

calendar.addEventListener("range-change", event => {
  updateRangeNavigation();
  if (currentView === "month") {
    const date = event.detail.startDate;
    selectedDateLabel.textContent = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    if (activeMonthKey === monthKey) {
      historyMonth.selectedDate = calendar.selectedDate;
      return;
    }
    historyMonth.selectedDate = null;
    activeMonthKey = monthKey;
  } else {
    selectedDateLabel.textContent = rangeLabel(event.detail.startDate, event.detail.endDate);
  }
  clearTimeout(searchTimer);
  loadHistory();
});
historyMonth.firstDayOfWeek = calendar.firstDayOfWeek;
historyMonth.addEventListener("date-select", event => calendar.selectDate(event.detail.date));
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadHistory, 250);
});
refreshButton.addEventListener("click", loadHistory);
settingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
previousRangeButton.addEventListener("click", () => calendar.shiftSelection(-1));
nextRangeButton.addEventListener("click", () => calendar.shiftSelection(1));
function selectView(view) {
  if (view === currentView) return;
  currentView = view;
  localStorage.setItem(VIEW_STORAGE_KEY, view);
  activeMonthKey = null;
  content.classList.toggle("is-week-view", view === "week");
  content.classList.toggle("is-month-view", view === "month");
  listViewButton.setAttribute("aria-pressed", String(view === "list"));
  weekViewButton.setAttribute("aria-pressed", String(view === "week"));
  monthViewButton.setAttribute("aria-pressed", String(view === "month"));
  calendar.selectionMode = view === "week" ? "week" : view === "month" ? "month" : "range";
}

listViewButton.addEventListener("click", () => selectView("list"));
weekViewButton.addEventListener("click", () => selectView("week"));
monthViewButton.addEventListener("click", () => selectView("month"));
function setCalendarHidden(hidden) {
  dashboard.classList.toggle("is-calendar-hidden", hidden);
  toggleCalendarButton.setAttribute("aria-expanded", String(!hidden));
  toggleCalendarButton.setAttribute("aria-label", hidden ? "显示日历" : "隐藏日历");
  toggleCalendarButton.title = hidden ? "显示日历" : "隐藏日历";
}

toggleCalendarButton.addEventListener("click", () => {
  const hidden = !dashboard.classList.contains("is-calendar-hidden");
  setCalendarHidden(hidden);
  if (!hidden) calendar.ensureSelectionVisible();
  localStorage.setItem(CALENDAR_HIDDEN_STORAGE_KEY, String(hidden));
});

window.addEventListener("storage", event => {
  if (event.key !== FIRST_DAY_OF_WEEK_KEY) return;
  calendar.refreshFirstDayOfWeek();
  historyMonth.firstDayOfWeek = calendar.firstDayOfWeek;
});

setCalendarHidden(localStorage.getItem(CALENDAR_HIDDEN_STORAGE_KEY) === "true");
const savedView = localStorage.getItem(VIEW_STORAGE_KEY);
if (savedView === "week" || savedView === "month") {
  selectView(savedView);
} else {
  selectedDateLabel.textContent = rangeLabel(calendar.selectedRange.startDate, calendar.selectedRange.endDate);
  updateRangeNavigation();
  loadHistory();
}
