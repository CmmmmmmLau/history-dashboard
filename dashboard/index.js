import "./components/history-calendar.js";
import "./components/history-list.js";
import "./components/history-week.js";
import "./components/history-month.js";
import "./components/history-toolbar.js";
import { FIRST_DAY_OF_WEEK_KEY } from "./preferences.js";

const calendar = document.querySelector("history-calendar");
const dashboard = document.querySelector(".dashboard");
const content = document.querySelector(".content");
const toolbar = document.querySelector("history-toolbar");
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
  toolbar.canMoveNext = calendar.canMoveNext;
}

async function loadHistory() {
  const currentRequest = ++requestId;
  const view = currentView === "week" ? historyWeek : currentView === "month" ? historyMonth : historyList;
  view.showStatus("正在加载历史记录…");
  toolbar.countText = "";

  const { startDate, endDate } = calendar.selectedRange;
  if (currentView === "week") historyWeek.weekStart = startDate;
  if (currentView === "month") {
    historyMonth.monthStart = startDate;
  }
  const startTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const endTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1).getTime();
  const query = toolbar.searchText;
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
    toolbar.countText = `${visits.length} 条记录${items.length === 1000 ? " · 结果可能不完整" : ""}`;
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
    toolbar.selectedDateLabel = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    if (activeMonthKey === monthKey) {
      historyMonth.selectedDate = calendar.selectedDate;
      return;
    }
    historyMonth.selectedDate = null;
    activeMonthKey = monthKey;
  } else {
    toolbar.selectedDateLabel = rangeLabel(event.detail.startDate, event.detail.endDate);
  }
  clearTimeout(searchTimer);
  loadHistory();
});
historyMonth.firstDayOfWeek = calendar.firstDayOfWeek;
historyMonth.addEventListener("date-select", event => calendar.selectDate(event.detail.date));
toolbar.addEventListener("search-input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadHistory, 250);
});
toolbar.addEventListener("refresh-history", loadHistory);
toolbar.addEventListener("open-settings", () => chrome.runtime.openOptionsPage());
toolbar.addEventListener("previous-range", () => calendar.shiftSelection(-1));
toolbar.addEventListener("next-range", () => calendar.shiftSelection(1));
function selectView(view) {
  if (view === currentView) return;
  currentView = view;
  localStorage.setItem(VIEW_STORAGE_KEY, view);
  activeMonthKey = null;
  content.classList.toggle("is-week-view", view === "week");
  content.classList.toggle("is-month-view", view === "month");
  toolbar.view = view;
  calendar.selectionMode = view === "week" ? "week" : view === "month" ? "month" : "range";
}

toolbar.addEventListener("view-change", event => selectView(event.detail.view));
function setCalendarHidden(hidden) {
  dashboard.classList.toggle("is-calendar-hidden", hidden);
  toolbar.calendarHidden = hidden;
}

toolbar.addEventListener("toggle-calendar", () => {
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
  toolbar.selectedDateLabel = rangeLabel(calendar.selectedRange.startDate, calendar.selectedRange.endDate);
  updateRangeNavigation();
  loadHistory();
}
