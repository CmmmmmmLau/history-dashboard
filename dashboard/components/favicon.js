export function createFavicon(pageUrl) {
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", pageUrl);
  url.searchParams.set("size", "16");

  const icon = document.createElement("img");
  icon.className = "site-icon";
  icon.src = url.toString();
  icon.alt = "";
  icon.width = 16;
  icon.height = 16;
  icon.loading = "lazy";
  icon.addEventListener("error", () => icon.remove(), { once: true });
  return icon;
}
