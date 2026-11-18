/* Renders calendar.html from the overlay data, the pinned engine and calendar-core.js. */
(function () {
  "use strict";
  const core = window.LibraryCalendar, data = window.LibraryCalendarData, resolve = window.RESOLVE_DAY_1962;
  const card = document.getElementById("day-card"), strip = document.getElementById("week-strip");
  const list = document.getElementById("year-list"), heading = document.getElementById("year-heading");
  if (!core || !data || !resolve || !card) return;
  const CLASS_NAMES = {1: "Class I", 2: "Class II"};
  const years = new Map();
  const now = new Date();
  const today = core.iso(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  let selected = today;

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs || {})) {
      if (name === "text") node.textContent = value;
      else if (value !== null && value !== undefined) node.setAttribute(name, value);
    }
    node.append(...children.filter(Boolean));
    return node;
  }
  const listing = year => {
    if (!years.has(year)) years.set(year, core.buildYear(resolve, data, year));
    return years.get(year);
  };
  const format = (date, options) => new Date(core.parse(date)).toLocaleDateString("en-US", {timeZone: "UTC", ...options});
  const longDate = date => format(date, {weekday: "long", month: "long", day: "numeric", year: "numeric"});
  const yearOf = date => Number(date.slice(0, 4));
  const validDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    const year = yearOf(value);
    return year >= 1900 && year <= 2199 && core.iso(core.parse(value)) === value;
  };
  const info = date => core.dayInfo(resolve, data, listing(yearOf(date)), date);

  function sermonList(sermons) {
    return el("ul", {class: "calendar-sermons"}, ...sermons.map(sermon => el("li", null,
      el("a", {href: sermon.url, text: sermon.title}), el("span", {class: "muted", text: " · " + sermon.author}))));
  }

  function renderCard() {
    const day = info(selected), item = day.observance;
    const body = [el("p", {class: "eyebrow", text: (selected === today ? "Today · " : "") + longDate(selected)}),
      el("h2", {text: item ? item.title : "No Sunday or class I–II feast"})];
    const facts = [item && CLASS_NAMES[item.class], day.season].filter(Boolean).join(" · ");
    if (facts) body.push(el("p", {class: "muted", text: facts}));
    if (item && item.transferred_from) body.push(el("p", {text: "Transferred from " + format(item.transferred_from, {month: "long", day: "numeric"}) + "."}));
    if (item && item.also.length) body.push(el("p", {text: "Also today: " + item.also.map(other => other.title).join("; ") + "."}));
    if (day.exact.length) body.push(el("h3", {text: "Sermons for this day"}), sermonList(day.exact));
    else body.push(el("p", {text: day.seasonal.length ? "The library has no sermon specific to this day." : "The library has no sermon for this day."}));
    if (day.seasonal.length) body.push(el("h3", {text: "Sermons for " + day.season}), sermonList(day.seasonal));
    body.push(el("p", {class: "calendar-chant"}, el("a", {href: day.chant, text: "Chant for this day"})));
    card.dataset.colour = item ? item.colour : "none";
    card.replaceChildren(...body);
  }

  function renderWeek() {
    strip.replaceChildren(...core.weekOf(selected).map(date => {
      const item = info(date).observance;
      const button = el("button", {type: "button", "data-date": date, "data-colour": item ? item.colour : "none",
        "aria-pressed": String(date === selected), "aria-current": date === today ? "date" : null,
        "aria-label": longDate(date) + (item ? ": " + item.title : "")},
      el("span", {class: "week-name", text: format(date, {weekday: "short"})}), el("span", {class: "week-day", text: format(date, {day: "numeric"})}));
      button.addEventListener("click", () => select(date));
      return button;
    }));
  }

  function renderYear() {
    const year = yearOf(selected);
    heading.textContent = "The year " + year;
    const groups = [];
    for (const item of listing(year).observances) {
      const season = info(item.date).season || "The year";
      if (!groups.length || groups[groups.length - 1].season !== season) groups.push({season, items: []});
      groups[groups.length - 1].items.push(item);
    }
    list.replaceChildren(...groups.map(group => el("section", {class: "index-group"}, el("h3", {text: group.season}),
      el("ul", {class: "calendar-year"}, ...group.items.map(item => {
        const count = info(item.date).exact.length;
        const button = el("button", {type: "button", "data-colour": item.colour, "aria-current": item.date === selected ? "true" : null},
          el("span", {class: "year-date", text: format(item.date, {month: "short", day: "numeric"})}),
          el("span", {class: "year-title", text: item.title}),
          el("span", {class: "muted", text: CLASS_NAMES[item.class] + (count ? ` · ${count} sermon${count === 1 ? "" : "s"}` : "")}));
        button.addEventListener("click", () => { select(item.date); card.focus(); card.scrollIntoView({block: "start"}); });
        return el("li", null, button);
      })))));
  }

  function render() { renderCard(); renderWeek(); renderYear(); }
  function select(date) {
    selected = date;
    const params = new URLSearchParams(location.search);
    if (date === today) params.delete("date"); else params.set("date", date);
    const query = params.toString();
    history.replaceState(null, "", location.pathname + (query ? "?" + query : ""));
    render();
  }
  const shiftYear = delta => {
    const year = yearOf(selected) + delta;
    if (year >= 1900 && year <= 2199) select(listing(year).observances[0].date);
  };
  document.getElementById("previous-year").addEventListener("click", () => shiftYear(-1));
  document.getElementById("next-year").addEventListener("click", () => shiftYear(1));
  document.getElementById("go-today").addEventListener("click", () => select(today));
  const requested = new URLSearchParams(location.search).get("date");
  if (validDate(requested)) selected = requested;
  document.getElementById("calendar-app").hidden = false;
  render();
})();
