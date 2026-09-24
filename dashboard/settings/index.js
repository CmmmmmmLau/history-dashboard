import { FIRST_DAY_OF_WEEK_KEY, getLocaleFirstDayOfWeek } from "../preferences.js";

const weekdayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const select = document.querySelector("#first-day-of-week");
const status = document.querySelector("#save-status");
const saved = localStorage.getItem(FIRST_DAY_OF_WEEK_KEY);

select.querySelector('[value="auto"]').textContent = `自动（跟随界面语言：${weekdayNames[getLocaleFirstDayOfWeek()]}）`;
select.value = /^[0-6]$/.test(saved ?? "") ? saved : "auto";

select.addEventListener("change", () => {
  if (select.value === "auto") localStorage.removeItem(FIRST_DAY_OF_WEEK_KEY);
  else localStorage.setItem(FIRST_DAY_OF_WEEK_KEY, select.value);
  status.textContent = "已保存";
});
