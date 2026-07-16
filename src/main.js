import Database from "@tauri-apps/plugin-sql";

let db = null;
let tabs = [];
let activeTabId = null;
let nextTabId = 1;

const tabsEl = document.getElementById("tabs");
const contentArea = document.getElementById("content-area");
const addressBar = document.getElementById("address-bar");
const sidePanel = document.getElementById("side-panel");
const panelTitle = document.getElementById("panel-title");
const panelBody = document.getElementById("panel-body");

async function initDb() {
  db = await Database.load("sqlite:wayfare.db");
}

function normalizeUrl(input) {
  const value = input.trim();
  if (value === "") return "about:blank";
  if (/^[a-zA-Z]+:\/\//.test(value)) return value;
  if (/^[\w-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) return "https://" + value;
  return "https://www.google.com/search?q=" + encodeURIComponent(value);
}

function createTab(url = "about:blank") {
  const tab = {
    id: nextTabId++,
    url,
    title: "New Tab",
    historyStack: [url],
    historyIndex: 0,
  };
  tabs.push(tab);
  renderTabs();
  switchTab(tab.id);
  return tab;
}

function closeTab(id) {
  const idx = tabs.findIndex((t) => t.id === id);
  if (idx === -1) return;

  const frame = document.getElementById("frame-" + id);
  if (frame) frame.remove();
  tabs.splice(idx, 1);

  if (tabs.length === 0) {
    createTab();
    return;
  }

  if (activeTabId === id) {
    const next = tabs[Math.max(0, idx - 1)];
    switchTab(next.id);
  }

  renderTabs();
}

function switchTab(id) {
  activeTabId = id;
  const tab = tabs.find((t) => t.id === id);
  if (!tab) return;

  document.querySelectorAll(".webview-frame").forEach((f) => f.classList.remove("active"));

  let frame = document.getElementById("frame-" + id);
  if (!frame) {
    frame = document.createElement("iframe");
    frame.id = "frame-" + id;
    frame.className = "webview-frame";
    frame.src = tab.url;
    frame.addEventListener("load", () => {
      try {
        tab.title = frame.contentDocument?.title || tab.url;
      } catch (e) {
        tab.title = tab.url;
      }
      renderTabs();
    });
    contentArea.appendChild(frame);
  }
  frame.classList.add("active");

  addressBar.value = tab.url === "about:blank" ? "" : tab.url;
  renderTabs();
}

function navigate(id, url) {
  const tab = tabs.find((t) => t.id === id);
  if (!tab) return;

  const finalUrl = normalizeUrl(url);
  tab.url = finalUrl;

  tab.historyStack = tab.historyStack.slice(0, tab.historyIndex + 1);
  tab.historyStack.push(finalUrl);
  tab.historyIndex = tab.historyStack.length - 1;

  const frame = document.getElementById("frame-" + id);
  if (frame) frame.src = finalUrl;

  addressBar.value = finalUrl;
  recordHistory(finalUrl, tab.title);
}

function goBack() {
  const tab = tabs.find((t) => t.id === activeTabId);
  if (!tab || tab.historyIndex <= 0) return;
  tab.historyIndex--;
  const url = tab.historyStack[tab.historyIndex];
  tab.url = url;
  const frame = document.getElementById("frame-" + tab.id);
  if (frame) frame.src = url;
  addressBar.value = url;
}

function goForward() {
  const tab = tabs.find((t) => t.id === activeTabId);
  if (!tab || tab.historyIndex >= tab.historyStack.length - 1) return;
  tab.historyIndex++;
  const url = tab.historyStack[tab.historyIndex];
  tab.url = url;
  const frame = document.getElementById("frame-" + tab.id);
  if (frame) frame.src = url;
  addressBar.value = url;
}

function reload() {
  const tab = tabs.find((t) => t.id === activeTabId);
  if (!tab) return;
  const frame = document.getElementById("frame-" + tab.id);
  if (frame) frame.src = frame.src;
}

function renderTabs() {
  tabsEl.innerHTML = "";
  tabs.forEach((tab) => {
    const el = document.createElement("div");
    el.className = "tab" + (tab.id === activeTabId ? " active" : "");

    const title = document.createElement("span");
    title.className = "tab-title";
    title.textContent = tab.title;
    el.appendChild(title);

    const close = document.createElement("span");
    close.className = "tab-close";
    close.textContent = "✕";
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });
    el.appendChild(close);

    el.addEventListener("click", () => switchTab(tab.id));
    tabsEl.appendChild(el);
  });
}

async function recordHistory(url, title) {
  if (!db || url === "about:blank") return;
  await db.execute(
    "INSERT INTO history (url, title, visited_at) VALUES ($1, $2, $3)",
    [url, title || url, Date.now()]
  );
}

async function addBookmark(url, title) {
  if (!db || url === "about:blank") return;
  await db.execute(
    "INSERT INTO bookmarks (url, title, created_at) VALUES ($1, $2, $3)",
    [url, title || url, Date.now()]
  );
  flashBookmarkButton();
}

function flashBookmarkButton() {
  const btn = document.getElementById("btn-bookmark");
  btn.textContent = "★";
  setTimeout(() => (btn.textContent = "☆"), 800);
}

async function openHistoryPanel() {
  if (!db) return;
  const rows = await db.select("SELECT * FROM history ORDER BY visited_at DESC LIMIT 100");
  panelTitle.textContent = "History";
  renderPanelList(rows);
  sidePanel.classList.remove("hidden");
}

async function openBookmarksPanel() {
  if (!db) return;
  const rows = await db.select("SELECT * FROM bookmarks ORDER BY created_at DESC");
  panelTitle.textContent = "Bookmarks";
  renderPanelList(rows);
  sidePanel.classList.remove("hidden");
}

function renderPanelList(rows) {
  panelBody.innerHTML = "";
  rows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "panel-item";

    const t = document.createElement("div");
    t.className = "panel-item-title";
    t.textContent = row.title || row.url;
    item.appendChild(t);

    const u = document.createElement("div");
    u.className = "panel-item-url";
    u.textContent = row.url;
    item.appendChild(u);

    item.addEventListener("click", () => {
      navigate(activeTabId, row.url);
      sidePanel.classList.add("hidden");
    });

    panelBody.appendChild(item);
  });
}

function setupEvents() {
  document.getElementById("btn-new-tab").addEventListener("click", () => createTab());
  document.getElementById("btn-back").addEventListener("click", goBack);
  document.getElementById("btn-forward").addEventListener("click", goForward);
  document.getElementById("btn-reload").addEventListener("click", reload);
  document.getElementById("btn-history").addEventListener("click", openHistoryPanel);
  document.getElementById("btn-bookmarks-panel").addEventListener("click", openBookmarksPanel);
  document.getElementById("panel-close").addEventListener("click", () => sidePanel.classList.add("hidden"));

  document.getElementById("btn-bookmark").addEventListener("click", () => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab) addBookmark(tab.url, tab.title);
  });

  addressBar.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      navigate(activeTabId, addressBar.value);
    }
  });
}

async function main() {
  await initDb();
  setupEvents();
  createTab("https://www.google.com");
}

main();
