/* Shared, dependency-free search functions; also exercised by Node regression tests. */
(function (root) {
  "use strict";
  const facets = ["author", "century", "language", "occasion", "topic", "calendar"];
  function normalize(text) {
    return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }
  function terms(query) { return normalize(query).trim().split(/\s+/).filter(Boolean); }
  function prepare(doc) {
    const metadata = [doc.title, doc.author, doc.composition, doc.language_label, doc.status,
      doc.occasion, doc.calendar_label, ...doc.topics, ...doc.metadata].join(" ");
    return {...doc, searchable: normalize(metadata + " " + doc.passages.map(p => p.text).join(" "))};
  }
  function matches(doc, state) {
    for (const facet of facets) {
      const value = state[facet];
      if (!value) continue;
      if (facet === "century" ? !doc.centuries.map(String).includes(value) :
          facet === "topic" ? !doc.topics.includes(value) : doc[facet] !== value) return false;
    }
    return terms(state.q || "").every(term => doc.searchable.includes(term));
  }
  function excerpt(doc, query) {
    const tokens = terms(query);
    if (!tokens.length) return null;
    let best = null, bestScore = 0;
    for (const passage of doc.passages) {
      const text = normalize(passage.text);
      const score = tokens.filter(t => text.includes(t)).length;
      if (score > bestScore) { best = passage; bestScore = score; }
    }
    if (!best) return null;
    const normalized = normalize(best.text);
    const first = Math.min(...tokens.map(t => normalized.indexOf(t)).filter(i => i >= 0));
    // Normalization can change character counts; this is an approximate excerpt, never a rewritten source.
    const start = Math.max(0, first - 65), end = Math.min(best.text.length, start + 260);
    return {...best, text: (start ? "…" : "") + best.text.slice(start, end) + (end < best.text.length ? "…" : "")};
  }
  function readState(params) {
    return Object.fromEntries(["q", ...facets].map(key => [key, params.get(key) || ""]));
  }
  function writeState(state) {
    const params = new URLSearchParams();
    for (const key of ["q", ...facets]) if (state[key]) params.set(key, state[key]);
    return params;
  }
  const api = {facets, normalize, terms, prepare, matches, excerpt, readState, writeState};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LibrarySearch = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
