const weekdayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});

export function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function weekdayName(date) {
  return weekdayNames[date.getDay()];
}

export function visitTime(date) {
  return timeFormatter.format(date);
}

export function groupDailyRecords(records) {
  const grouped = new Map();
  for (const record of [...records].sort((a, b) => b.visitTime - a.visitTime)) {
    const existing = grouped.get(record.url);
    if (existing) existing.count += 1;
    else grouped.set(record.url, { record, count: 1 });
  }
  return [...grouped.values()];
}

export function recordDetails(record, count) {
  const date = new Date(record.visitTime);
  const details = [
    visitTime(date),
    `• ${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdayName(date)}`,
    `• 标题：${record.title || record.url}`,
    `• 地址：${record.url}`
  ];
  if (count > 1) details.push(`• 当天访问次数: ${count}`);
  return details.join("\n");
}
