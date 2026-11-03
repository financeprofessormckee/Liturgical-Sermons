(function () {
  "use strict";
  const reader = document.querySelector(".reader");
  const controls = document.querySelector("#reading-controls");
  const params = new URLSearchParams(location.search);
  const back = new URLSearchParams(params);
  back.delete("view");
  document.querySelectorAll(".back-nav a, .brand").forEach(link => {
    if (back.size) link.href = "../index.html?" + back;
  });
  const translated = reader.dataset.translated === "true";
  const scholarText = document.querySelector("#scholar-text");
  const apparatus = [...reader.querySelectorAll("details.apparatus")];
  let activeView;
  const normalizedView = view => ["parallel", "original"].includes(view) ? view : "english";
  function revealHash() {
    try {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (!target) return;
      const omitted = target.closest?.('.reading-omission');
      if (omitted && reader.dataset.mode === 'reading') {
        change('parallel');
        return;
      }
      if (translated && target.closest?.('.english-text') && reader.dataset.view === 'original') {
        change('english');
        return;
      }
      if (translated && target.closest?.('.original-text') && reader.dataset.view === 'english') {
        change('original');
        return;
      }
      for (let parent = target; parent; parent = parent.parentElement) {
        if (parent.tagName === "DETAILS") parent.open = true;
      }
      requestAnimationFrame(() => { target.scrollIntoView(); target.focus({preventScroll: true}); });
    } catch (error) { /* Invalid fragments leave the complete text available. */ }
  }
  function apply(view) {
    const selected = normalizedView(view);
    activeView = selected;
    const scholar = selected !== "english";
    reader.dataset.mode = scholar ? "scholar" : "reading";
    reader.dataset.view = translated ? selected : "english";
    controls.querySelector(`input[value="${reader.dataset.mode}"]`).checked = true;
    if (scholarText) {
      scholarText.value = selected === "original" ? "original" : "parallel";
      document.querySelector("#scholar-text-control").hidden = !scholar;
    }
    apparatus.forEach(details => { details.open = scholar; });
    revealHash();
  }
  function change(view, readerChoice = false) {
    const next = new URL(location.href);
    if (readerChoice) {
      try {
        const target = document.getElementById(decodeURIComponent(next.hash.slice(1)));
        const omitted = target?.closest?.('.reading-omission');
        if (view === 'english' && omitted) next.hash = omitted.dataset.readingEquivalent || 'sermon-text';
        else if (target?.id && (view === 'original' && target.closest?.('.english-text') || view === 'english' && target.closest?.('.original-text'))) {
          const counterpart = target.id.replace(/-(english|original)$/, view === 'original' ? '-original' : '-english');
          if (document.getElementById(counterpart)) next.hash = counterpart;
          else next.hash = target.closest?.('.reading-block')?.id || 'sermon-text';
        }
      } catch (error) { /* A malformed fragment does not prevent a mode change. */ }
    }
    if (view === "english") next.searchParams.delete("view");
    else next.searchParams.set("view", view);
    history.replaceState(null, "", next);
    apply(view);
  }
  apply(params.get("view"));
  controls.hidden = false;
  controls.addEventListener("change", event => change(event.target.value === "reading" ? "english" : scholarText?.value || "parallel", true));
  scholarText?.addEventListener("change", () => change(scholarText.value, true));
  window.addEventListener("hashchange", revealHash);
  window.addEventListener("popstate", () => {
    const view = normalizedView(new URLSearchParams(location.search).get("view"));
    // Fragment navigation also emits popstate; retain the reader's disclosure choices.
    if (view !== activeView) apply(view);
  });
  reader.addEventListener("click", event => {
    if (event.target.closest('a[href^="#"]')) requestAnimationFrame(revealHash);
  });
})();
