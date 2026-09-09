// js/theme.js
const THEME_KEY = "dm_theme";

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const preferred = saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  applyTheme(preferred);
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

export function currentTheme() {
  return document.documentElement.getAttribute("data-theme") || "dark";
}
