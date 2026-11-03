(function () {
  "use strict";
  const root = document.documentElement;
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  function saved(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }
  function remember(key, value) {
    try { localStorage.setItem(key, value); } catch (error) { /* Preferences are optional. */ }
  }
  let explicitTheme = saved("sermons-theme");
  if (!["light", "dark"].includes(explicitTheme)) explicitTheme = null;
  function applyTheme() {
    root.dataset.theme = explicitTheme || (system.matches ? "dark" : "light");
    const button = document.querySelector("#theme-toggle");
    if (button) button.setAttribute("aria-pressed", String(root.dataset.theme === "dark"));
  }
  applyTheme();
  system.addEventListener("change", applyTheme);
  document.addEventListener("DOMContentLoaded", () => {
    const theme = document.querySelector("#theme-toggle");
    theme.hidden = false;
    applyTheme();
    theme.addEventListener("click", () => {
      explicitTheme = root.dataset.theme === "dark" ? "light" : "dark";
      remember("sermons-theme", explicitTheme);
      applyTheme();
    });
    const tip = document.querySelector("#reader-tip");
    if (tip) {
      tip.hidden = saved("sermons-reader-tip-v1") === "dismissed";
      document.querySelector("#dismiss-tip").addEventListener("click", () => {
        tip.hidden = true;
        remember("sermons-reader-tip-v1", "dismissed");
        document.querySelector('#reading-controls input:checked')?.focus();
      });
    }
    const route = document.querySelector("#feedback-route");
    if (route) {
      const select = document.querySelector("#feedback-sermon");
      const requested = new URLSearchParams(location.search).get("sermon");
      if ([...select.options].some(option => option.value === requested)) select.value = requested;
      function updateIssues() {
        const option = select.selectedOptions[0];
        const title = select.value ? option.textContent : "Liturgical Sermons";
        const context = select.value ? "Sermon: " + title + "\nLink: " + new URL(option.dataset.path, location.href).href : "Library: " + new URL("index.html", location.href).href;
        route.querySelectorAll("[data-feedback-kind]").forEach(link => {
          const kind = link.dataset.feedbackKind;
          const issue = new URL("https://github.com/" + route.dataset.repository + "/issues/new");
          issue.searchParams.set("title", (kind === "correction" ? "Correction: " : "Feature: ") + title);
          issue.searchParams.set("body", context + "\n\n" + (kind === "correction" ? "Passage / locator:\n\nIssue and suggested correction:\n\nSupporting source:\n" : "Requested feature and how it would help:\n"));
          link.href = issue.href;
        });
      }
      updateIssues();
      select.addEventListener("change", updateIssues);
    }
  });
})();
