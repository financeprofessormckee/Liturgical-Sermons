(function () {
  "use strict";
  const form = document.querySelector("#library-controls");
  const status = document.querySelector("#search-status");
  const core = window.LibrarySearch;
  try {
    const index = window.LibraryIndex;
    if (!index || index.schema_version !== 1 || !core) throw new Error("Search index unavailable");
    const docs = index.sermons.map(core.prepare);
    const cards = new Map([...document.querySelectorAll("[data-sermon]")].map(card => [card.dataset.sermon, card]));
    function restore() {
      const state = core.readState(new URLSearchParams(location.search));
      for (const key of ["q", ...core.facets]) {
        const control = form.elements.namedItem(key);
        control.value = state[key];
        // Unknown or obsolete filter values fall back to All, rather than hiding the collection.
        if (control.tagName === "SELECT" && control.selectedIndex < 0) control.value = "";
      }
    }
    function render(push) {
      const state = Object.fromEntries(new FormData(form));
      const params = core.writeState(state);
      if (push) {
        const next = new URL(location.href);
        next.search = params.toString();
        next.hash = '';
        history.pushState(null, "", next.href);
      }
      let count = 0;
      for (const doc of docs) {
        const card = cards.get(doc.id);
        const match = core.matches(doc, state);
        card.hidden = !match;
        if (match) count++;
        const base = doc.url + (params.size ? "?" + params : "");
        card.querySelector("h2 a").href = base;
        const target = card.querySelector(".search-excerpt");
        target.replaceChildren();
        const snippet = match ? core.excerpt(doc, state.q) : null;
        target.hidden = !snippet;
        if (snippet) {
          target.append(document.createTextNode(snippet.text + " "));
          const link = document.createElement("a");
          link.href = base + "#" + encodeURIComponent(snippet.anchor);
          if (snippet.translation_id) {
            const url = new URL(link.href);
            url.searchParams.set('translation', snippet.translation_id);
            link.href = url.href;
          }
          // Search hits in the original open in that language; editorial notes remain visible in all views.
          if (doc.text_kind === "translated" && snippet.label.endsWith(" original")) {
            const url = new URL(link.href);
            url.searchParams.set("view", "original");
            link.href = url.href;
          }
          link.textContent = "Read passage · " + snippet.label;
          target.append(link);
        }
      }
      document.querySelector("#result-count").textContent = count + (count === 1 ? " sermon" : " sermons");
      document.querySelector("#empty-results").hidden = count !== 0;
    }
    restore();
    render(false);
    form.hidden = false;
    form.addEventListener("submit", event => { event.preventDefault(); render(true); });
    form.addEventListener("input", () => render(true));
    document.querySelector("#clear-filters").addEventListener("click", () => { form.reset(); render(true); });
    window.addEventListener("popstate", () => { restore(); render(false); });
  } catch (error) {
    status.hidden = false;
    status.textContent = "Search could not load. All complete sermons remain available below. Check that the assets folder is beside index.html, then reload the page.";
  }
})();
