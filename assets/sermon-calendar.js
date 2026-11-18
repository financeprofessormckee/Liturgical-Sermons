/* Fills a sermon page's next-date line from the overlay data, the pinned engine and calendar-core.js. */
(function () {
  "use strict";
  const core = window.LibraryCalendar, data = window.LibraryCalendarData, resolve = window.RESOLVE_DAY_1962;
  const line = document.getElementById("next-feast");
  if (!core || !data || !resolve || !line) return;
  const now = new Date();
  const today = core.iso(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const next = core.nextOccurrence(resolve, data, line.dataset.calendarKey, today);
  if (!next) return;
  const link = (href, text) => {
    const node = document.createElement("a");
    node.href = href;
    node.textContent = text;
    return node;
  };
  const date = new Date(core.parse(next.date)).toLocaleDateString("en-US",
    {timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric"});
  const shared = next.observance.title === next.title ? "" : `, with ${next.observance.title}`;
  line.replaceChildren(`${next.date === today ? "Today" : "Next"} in the 1962 calendar: `,
    link(`../calendar.html?date=${next.date}`, date), ` · ${next.title}${shared} · `,
    link(`${data.chant_url}?date=${next.date}&cal=1962`, "Chant for this day"));
  line.hidden = false;
})();
