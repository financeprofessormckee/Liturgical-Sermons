/* The 1962 listing: the vendored engine supplies Easter; the project's overlay supplies titles and classes. */
(function (root) {
  "use strict";
  const DAY = 86400000;
  const ORDINALS = ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
    "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth",
    "Nineteenth", "Twentieth", "Twenty-first", "Twenty-second", "Twenty-third", "Twenty-fourth", "Twenty-fifth",
    "Twenty-sixth", "Twenty-seventh", "Twenty-eighth"];
  const utc = (y, m, d) => Date.UTC(y, m - 1, d);
  const iso = time => new Date(time).toISOString().slice(0, 10);
  const parse = date => { const [y, m, d] = date.split("-").map(Number); return utc(y, m, d); };
  const weekday = time => new Date(time).getUTCDay();
  const nextSunday = time => time + (7 - weekday(time)) * DAY;
  const lastSundayOn = time => time - weekday(time) * DAY;

  function engineEaster(resolve, year) {
    for (let time = utc(year, 3, 22); time <= utc(year, 4, 25); time += DAY) {
      if (weekday(time) === 0 && resolve(iso(time)).dayKey === "resurrexi") return time;
    }
    throw new Error("The calendar engine gave no Easter for " + year);
  }

  function ruledDate(rule, year) {
    if (rule === "holy-name") {
      for (let day = 2; day <= 5; day++) if (weekday(utc(year, 1, day)) === 0) return utc(year, 1, day);
      return utc(year, 1, 2);
    }
    if (rule === "holy-family") return nextSunday(utc(year, 1, 6));
    if (rule === "christ-king") return lastSundayOn(utc(year, 10, 31));
    if (rule === "sunday-octave-nativity") {
      return weekday(utc(year, 12, 25)) === 0 ? utc(year, 12, 30) : lastSundayOn(utc(year, 12, 31));
    }
    throw new Error("Unknown calendar rule: " + rule);
  }

  function temporalCycle(data, year, easter, advent) {
    const days = new Map();
    const anchors = {easter, advent};
    for (const entry of data.movable) days.set(anchors[entry.anchor] + entry.offset * DAY, entry);
    const holyFamily = ruledDate("holy-family", year), septuagesima = easter - 63 * DAY;
    for (let time = holyFamily + 7 * DAY, n = 2; time < septuagesima; time += 7 * DAY, n++) {
      days.set(time, {key: n === 2 ? "epiph-2" : "epiph-3", title: ORDINALS[n] + " Sunday after Epiphany",
        class: 2, colour: "green", ref: `Tempora/Epi${n}-0`});
    }
    const lastSunday = advent - 7 * DAY;
    for (let time = easter + 63 * DAY, n = 2; time < advent; time += 7 * DAY, n++) {
      const last = time === lastSunday;
      days.set(time, {key: last ? "pent-23" : n <= 23 ? "pent-" + n : "epiph-3",
        title: last ? "Last Sunday after Pentecost" : ORDINALS[n] + " Sunday after Pentecost", class: 2, colour: "green",
        ref: last ? "Tempora/Pent24-0" : n <= 23 ? `Tempora/Pent${String(n).padStart(2, "0")}-0` : null});
    }
    for (const entry of data.ruled) days.set(ruledDate(entry.rule, year), entry);
    return days;
  }

  function fixedDate(entry, year) {
    const leap = new Date(utc(year, 2, 29)).getUTCMonth() === 1;
    const [month, day] = (leap && entry.leap_date || entry.date).split("-").map(Number);
    const time = utc(year, month, day);
    return entry.if_sunday_add_days && weekday(time) === 0 ? time + entry.if_sunday_add_days * DAY : time;
  }

  // Occurrence under the 1960 rubrics, limited to the Sundays and class I-II days this listing carries.
  function feastPrevails(feast, temporal, sunday) {
    if (feast.privileged) return true;
    if (temporal.class === 1) return sunday && Boolean(feast.outranks_class_one_sunday);
    return feast.class === 1 || Boolean(feast.lord);
  }

  const observance = (entry, time) => ({date: iso(time), key: entry.key, title: entry.title, class: entry.class,
    colour: entry.colour, ref: entry.ref || null, sunday: weekday(time) === 0, also: []});

  function buildYear(resolve, data, year) {
    const easter = engineEaster(resolve, year);
    const advent = lastSundayOn(utc(year, 12, 3));
    const temporal = temporalCycle(data, year, easter, advent);
    const winners = new Map([...temporal].map(([time, entry]) => [time, observance(entry, time)]));
    const displaced = [];
    for (const feast of data.fixed) {
      const time = fixedDate(feast, year), current = temporal.get(time), sunday = weekday(time) === 0;
      if (!current) { winners.set(time, observance(feast, time)); continue; }
      if (feastPrevails(feast, current, sunday)) {
        const won = observance(feast, time);
        won.also.push({key: current.key, title: current.title});
        winners.set(time, won);
      } else if (feast.class === 1 && !feast.vigil) displaced.push({feast, time});
      else if (!(feast.vigil && sunday)) winners.get(time).also.push({key: feast.key, title: feast.title});
    }
    displaced.sort((a, b) => (b.feast.transfer_priority || 0) - (a.feast.transfer_priority || 0) || a.time - b.time);
    for (const {feast, time} of displaced) {
      let target = time + DAY;
      while (winners.has(target)) target += DAY;
      const moved = observance(feast, target);
      moved.transferred_from = iso(time);
      winners.set(target, moved);
    }
    const observances = [...winners.keys()].sort((a, b) => a - b).filter(time => new Date(time).getUTCFullYear() === year)
      .map(time => winners.get(time));
    return {year, easter: iso(easter), advent: iso(advent), observances,
      byDate: new Map(observances.map(item => [item.date, item]))};
  }

  // The engine labels fixed feasts inconsistently, so the season name comes from the year's anchors.
  function seasonLabel(listing, date) {
    const time = parse(date), year = listing.year, easter = parse(listing.easter), advent = parse(listing.advent);
    const fromEaster = Math.round((time - easter) / DAY);
    if (time >= utc(year, 12, 25) || time <= utc(year, 1, 13)) return "Christmastide";
    if (time >= advent) return "Advent";
    if (fromEaster < -63) return "Time after Epiphany";
    if (fromEaster < -46) return "Septuagesima";
    if (fromEaster < -14) return "Lent";
    if (fromEaster < 0) return "Passiontide";
    return fromEaster <= 55 ? "Eastertide" : "Time after Pentecost";
  }

  function dayInfo(resolve, data, listing, date) {
    const item = listing.byDate.get(date) || null, engine = resolve(date);
    const keys = item ? [item.key, ...item.also.map(other => other.key)] : [];
    const seen = new Set(), exact = [];
    for (const key of keys) for (const sermon of data.sermons["dayKey:" + key] || []) {
      if (!seen.has(sermon.id)) { seen.add(sermon.id); exact.push(sermon); }
    }
    return {date, observance: item, season: seasonLabel(listing, date), exact,
      seasonal: data.sermons["seasonKey:" + engine.seasonKey] || [],
      chant: `${data.chant_url}?date=${date}&cal=1962`};
  }

  const weekOf = date => { const start = lastSundayOn(parse(date));
    return Array.from({length: 7}, (_, i) => iso(start + i * DAY)); };

  // The first date on or after fromDate whose listing carries the key, as the day's observance or under "also".
  function nextOccurrence(resolve, data, key, fromDate) {
    const start = Number(fromDate.slice(0, 4));
    for (let year = start; year < start + 12; year++) {
      for (const item of buildYear(resolve, data, year).observances) {
        if (item.date < fromDate) continue;
        const entry = item.key === key ? item : item.also.find(other => other.key === key);
        if (entry) return {date: item.date, title: entry.title, observance: item};
      }
    }
    return null;
  }

  const api = {buildYear, dayInfo, nextOccurrence, weekOf, iso, parse};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LibraryCalendar = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
