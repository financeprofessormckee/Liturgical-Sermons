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
    const common = metadata + ' ' + doc.passages.filter(p => !p.translation_id).map(p => p.text).join(' ');
    const versionIds = [...new Set(doc.passages.map(p => p.translation_id).filter(Boolean))];
    const versionSearchable = Object.fromEntries(versionIds.map(id => [id,
      normalize(common + ' ' + doc.passages.filter(p => p.translation_id === id).map(p => p.text).join(' '))]));
    return {...doc, searchable: normalize(metadata + " " + doc.passages.map(p => p.text).join(" ")), versionSearchable};
  }
  function matches(doc, state) {
    for (const facet of facets) {
      const value = state[facet];
      if (!value) continue;
      if (facet === "century" ? !doc.centuries.map(String).includes(value) :
          facet === "topic" ? !doc.topics.includes(value) : doc[facet] !== value) return false;
    }
    const candidates = Object.values(doc.versionSearchable || {});
    return (candidates.length ? candidates : [doc.searchable]).some(text => terms(state.q || '').every(term => text.includes(term)));
  }
  function excerpt(doc, query) {
    const tokens = terms(query);
    if (!tokens.length) return null;
    let best = null, bestScore = 0;
    const eligible = Object.entries(doc.versionSearchable || {}).filter(([, text]) => tokens.every(term => text.includes(term))).map(([id]) => id);
    for (const passage of doc.passages) {
      if (passage.translation_id && !eligible.includes(passage.translation_id)) continue;
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
