(function () {
  "use strict";
  const form = document.querySelector("#library-controls");
  const status = document.querySelector("#search-status");
  const core = window.LibrarySearch;
  try {
    if (!core) throw new Error("Search unavailable");
    // The landing page carries no sermon list. Passage-free metadata loads on the first search or filter,
    // and an author's full text loads only when a query needs it.
    let docs = null;
    const pending = new Map(), ready = new Set();
    function loadScript(file) {
      if (!pending.has(file)) pending.set(file, new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "assets/" + file;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Unavailable: " + file));
        document.head.appendChild(script);
      }));
      return pending.get(file);
    }
    async function loadMeta() {
      if (!docs) {
        await loadScript("search-meta.js");
        const index = window.LibraryMeta;
        if (!index || index.schema_version !== 1) throw new Error("Search index unavailable");
        docs = index.sermons.map(core.prepare);
      }
    }
    async function loadShard(file) {
      await loadScript(file);
      const full = new Map(((window.LibraryShards || {})[file] || []).map(doc => [doc.id, core.prepare(doc)]));
      docs = docs.map(doc => full.get(doc.id) ? {...full.get(doc.id), shard: doc.shard} : doc);
      ready.add(file);
    }
    function neededShards(state) {
      const scope = {...state, q: ""};
      return [...new Set(docs.filter(doc => core.matches(doc, scope)).map(doc => doc.shard))].filter(file => !ready.has(file));
    }
    function restore() {
      const state = core.readState(new URLSearchParams(location.search));
      for (const key of ["q", ...core.facets]) {
        const control = form.elements.namedItem(key);
        control.value = state[key];
        // Unknown or obsolete filter values fall back to All, rather than hiding the collection.
        if (control.tagName === "SELECT" && control.selectedIndex < 0) control.value = "";
      }
    }
    const catalog = document.querySelector("#catalog");
    const prompt = document.querySelector("#browse-prompt");
    function element(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }
    function makeCard(doc, params, state) {
      const card = element("article", "catalog-entry");
      card.dataset.sermon = doc.id;
      const eyebrow = element("p", "eyebrow", doc.author + " ");
      eyebrow.append(element("span", "", "· " + doc.language_label));
      const base = doc.url + (params.size ? "?" + params : "");
      const heading = element("h2");
      const title = element("a", "", doc.title);
      title.href = base;
      heading.append(title);
      const occasion = element("p", "", doc.occasion_label + " ");
      occasion.append(element("span", "tag", doc.status));
      card.append(eyebrow, heading, element("p", "muted", doc.composition), occasion);
      const target = element("p", "search-excerpt");
      const snippet = core.excerpt(doc, state.q);
      target.hidden = !snippet;
      if (snippet) {
        target.append(document.createTextNode(snippet.text + " "));
        const link = element("a", "", "Read passage · " + snippet.label);
        link.href = base + "#" + encodeURIComponent(snippet.anchor);
        if (snippet.translation_id) {
          const url = new URL(link.href);
          url.searchParams.set("translation", snippet.translation_id);
          link.href = url.href;
        }
        // Search hits in the original open in that language; editorial notes remain visible in all views.
        if (doc.text_kind === "translated" && snippet.label.endsWith(" original")) {
          const url = new URL(link.href);
          url.searchParams.set("view", "original");
          link.href = url.href;
        }
        target.append(link);
      }
      card.append(target);
      return card;
    }
    let latest = 0;
    async function update(push) {
      const ticket = ++latest;
      const state = Object.fromEntries(new FormData(form));
      const active = core.writeState(state).size > 0;
      if (active) {
        try {
          if (!docs) { status.hidden = false; status.textContent = "Loading the library…"; await loadMeta(); }
          if (core.terms(state.q || "").length) {
            const need = neededShards(state);
            if (need.length) {
              status.hidden = false;
              status.textContent = "Loading search text…";
              await Promise.all(need.map(loadShard));
            }
          }
          status.hidden = true;
        } catch (error) {
          pending.clear();
          status.hidden = false;
          status.textContent = "Search text could not load. Check your connection, then try again.";
          return;
        }
      }
      if (ticket === latest) render(push, state, active);
    }
    function render(push, state, active) {
      const params = core.writeState(state);
      if (push) {
        const next = new URL(location.href);
        next.search = params.toString();
        next.hash = '';
        history.pushState(null, "", next.href);
      }
      const hits = active ? docs.filter(doc => core.matches(doc, state)) : [];
      catalog.replaceChildren(...hits.map(doc => makeCard(doc, params, state)));
      prompt.hidden = active;
      document.querySelector("#result-count").textContent = active ? hits.length + (hits.length === 1 ? " sermon" : " sermons") : "";
      document.querySelector("#empty-results").hidden = !active || hits.length !== 0;
    }
    restore();
    form.hidden = false;
    update(false);
    form.addEventListener("submit", event => { event.preventDefault(); return update(true); });
    form.addEventListener("input", () => update(true));
    document.querySelector("#clear-filters").addEventListener("click", () => { form.reset(); return update(true); });
    window.addEventListener("popstate", () => { restore(); return update(false); });
  } catch (error) {
    status.hidden = false;
    status.textContent = "Search could not load. Every sermon remains available from the author and calendar pages. Check that the assets folder is beside index.html, then reload the page.";
  }
})();
