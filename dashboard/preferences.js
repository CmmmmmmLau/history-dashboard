export const FIRST_DAY_OF_WEEK_KEY = "history-dashboard:first-day-of-week";

export function getLocaleFirstDayOfWeek() {
  try {
    const locale = new Intl.Locale(chrome.i18n.getUILanguage());
    const firstDay = (locale.getWeekInfo?.() ?? locale.weekInfo)?.firstDay;
    if (Number.isInteger(firstDay) && firstDay >= 1 && firstDay <= 7) return firstDay % 7;
  } catch (error) {
    console.warn("Unable to determine the locale's first day of week:", error);
  }
  return 1;
}

export function getFirstDayOfWeek() {
  const saved = localStorage.getItem(FIRST_DAY_OF_WEEK_KEY);
  return /^[0-6]$/.test(saved ?? "") ? Number(saved) : getLocaleFirstDayOfWeek();
}
