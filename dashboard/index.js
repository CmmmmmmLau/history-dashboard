import "./components/history-calendar.js";
import "./components/history-list.js";

const calendar = document.querySelector("history-calendar");
const dashboard = document.querySelector(".dashboard");
const toggleCalendarButton = document.querySelector("#toggle-calendar");
const selectedDateLabel = document.querySelector("#selected-date");
const searchInput = document.querySelector("#search");
const refreshButton = document.querySelector("#refresh");
const count = document.querySelector("#count");
const historyList = document.querySelector("history-list");

const weekdayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
let requestId = 0;
let searchTimer;

function dateLabel(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdayNames[date.getDay()]}`;
}

function rangeLabel(startDate, endDate) {
  if (startDate.getTime() === endDate.getTime()) return dateLabel(startDate);
  const shortDate = date => `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  return `${shortDate(startDate)} — ${shortDate(endDate)}`;
}

async function loadHistory() {
  const currentRequest = ++requestId;
  historyList.showStatus("正在加载历史记录…");
  count.textContent = "";

  const { startDate, endDate } = calendar.selectedRange;
  const startTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const endTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1).getTime();
  try {
    const items = await chrome.history.search({
      text: searchInput.value.trim(),
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

    historyList.emptyMessage = searchInput.value.trim()
      ? "所选范围内没有匹配的历史记录。"
      : "所选范围内没有历史记录。";
    historyList.records = visits;
    count.textContent = `${visits.length} 条记录${items.length === 1000 ? " · 结果可能不完整" : ""}`;
  } catch (error) {
    if (currentRequest !== requestId) return;
    historyList.showStatus("无法读取历史记录，请检查插件权限后重试。");
    console.error("Failed to load history:", error);
  }
}

calendar.addEventListener("range-change", event => {
  clearTimeout(searchTimer);
  selectedDateLabel.textContent = rangeLabel(event.detail.startDate, event.detail.endDate);
  loadHistory();
});
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadHistory, 250);
});
refreshButton.addEventListener("click", loadHistory);
toggleCalendarButton.addEventListener("click", () => {
  const hidden = dashboard.classList.toggle("is-calendar-hidden");
  toggleCalendarButton.setAttribute("aria-expanded", String(!hidden));
  toggleCalendarButton.setAttribute("aria-label", hidden ? "显示日历" : "隐藏日历");
  toggleCalendarButton.title = hidden ? "显示日历" : "隐藏日历";
});

selectedDateLabel.textContent = rangeLabel(calendar.selectedRange.startDate, calendar.selectedRange.endDate);
loadHistory();
