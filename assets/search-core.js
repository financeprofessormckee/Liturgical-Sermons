/* Shared, dependency-free search functions; also exercised by Node regression tests. */
(function (root) {
  "use strict";
  const facets = ["author", "century", "language", "occasion", "topic", "calendar"];
  function normalize(text) {
    return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }
  function terms(query) { return normalize(query).trim().split(/\s+/).filter(Boolean); }
  const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // A digit at either edge of a term may not run into another digit: 6:4 is not 6:45 or 16:4.
  function numberPattern(term) {
    return (/^\d/.test(term) ? "(^|\\D)" : "()") + escapeRegExp(term) + (/\d$/.test(term) ? "(?!\\d)" : "");
  }
  function clause(source) {
    const regex = new RegExp(source);
    return text => {
      const hit = regex.exec(text);
      return hit ? hit.index + hit[1].length : -1;
    };
  }
  let compiledQuery = null, compiledClauses = [];
  // Words stay substrings. A word before a chapter number is one reference; four-digit years stay separate.
  function clauses(query) {
    if (query === compiledQuery) return compiledClauses;
    const tokens = terms(query).map(term => /\d/.test(term) ? term.replace(/^[(\[]+|[)\],.;:]+$/g, "") || term : term);
    const compiled = [];
    for (let i = 0; i < tokens.length; i++) {
      const word = tokens[i].replace(/[.,]+$/, ""), next = tokens[i + 1];
      if (word && !/\d/.test(word) && next && /^\d{1,3}(?!\d)/.test(next)) {
        compiled.push(clause("()" + escapeRegExp(word) + "[\\s.,]*" + numberPattern(next).replace(/^\(\^\|\\D\)/, "")));
        i++;
      } else if (/\d/.test(tokens[i])) compiled.push(clause(numberPattern(tokens[i])));
      else {
        const term = tokens[i];
        compiled.push(text => text.indexOf(term));
      }
    }
    compiledQuery = query;
    compiledClauses = compiled;
    return compiled;
  }
  function prepare(doc) {
    // Metadata-only records (no passages) come from the landing-page index; their text loads by shard.
    doc = {...doc, metadata: doc.metadata || [], passages: doc.passages || []};
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
    const wanted = clauses(state.q || '');
    return (candidates.length ? candidates : [doc.searchable]).some(text => wanted.every(find => find(text) >= 0));
  }
  function excerpt(doc, query) {
    const wanted = clauses(query);
    if (!wanted.length) return null;
    let best = null, bestScore = 0;
    const eligible = Object.entries(doc.versionSearchable || {}).filter(([, text]) => wanted.every(find => find(text) >= 0)).map(([id]) => id);
    for (const passage of doc.passages) {
      if (passage.translation_id && !eligible.includes(passage.translation_id)) continue;
      const text = normalize(passage.text);
      const score = wanted.filter(find => find(text) >= 0).length;
      if (score > bestScore) { best = passage; bestScore = score; }
    }
    if (!best) return null;
    const normalized = normalize(best.text);
    const first = Math.min(...wanted.map(find => find(normalized)).filter(i => i >= 0));
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
