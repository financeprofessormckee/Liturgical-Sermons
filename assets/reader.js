(function () {
  "use strict";
  const reader = document.querySelector(".reader");
  const controls = document.querySelector("#reading-controls");
  const params = new URLSearchParams(location.search);
  const back = new URLSearchParams(params);
  back.delete("view");
  back.delete("translation");
  document.querySelectorAll(".back-nav a, .brand").forEach(link => {
    if (back.size) link.href = "../index.html?" + back;
  });
  const translated = reader.dataset.translated === "true";
  const scholarText = document.querySelector("#scholar-text");
  const apparatus = [...reader.querySelectorAll("details.apparatus")];
  const translationSelect = document.querySelector('#english-translation');
  const versionNodes = [...reader.querySelectorAll('[data-version]')].filter(node => node.dataset?.version);
  const availableVersions = translationSelect ? [...translationSelect.options].map(option => option.value) : ['ai'];
  const preferenceKey = 'liturgical-sermons-english-preference';
  let preference;
  try { preference = localStorage.getItem(preferenceKey); } catch (error) { /* Storage is optional. */ }
  const historicalVersion = availableVersions.find(value => value !== 'ai');
  const explicitVersion = params.get('translation');
  let activeTranslation = availableVersions.includes(explicitVersion) ? explicitVersion :
    preference === 'ai' ? 'ai' : preference === 'historical' && historicalVersion ? historicalVersion :
    availableVersions.includes(reader.dataset.defaultTranslation) ? reader.dataset.defaultTranslation : 'ai';
  let activeView;
  function showTranslation() {
    reader.dataset.translation = activeTranslation;
    if (translationSelect) translationSelect.value = activeTranslation;
    const visible = reader.dataset.view === 'original' ? 'ai' : activeTranslation;
    versionNodes.forEach(node => { node.hidden = node.dataset.version !== visible; });
  }
  function changeTranslation(value, persist = false) {
    if (!availableVersions.includes(value)) return;
    activeTranslation = value;
    const next = new URL(location.href);
    next.searchParams.set('translation', value);
    history.replaceState(null, '', next);
    if (persist) {
      try { localStorage.setItem(preferenceKey, value === 'ai' ? 'ai' : 'historical'); } catch (error) { /* Optional. */ }
    }
    showTranslation();
  }
  const normalizedView = view => ["parallel", "original"].includes(view) ? view : "english";
  function revealHash() {
    try {
      let target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (!target) return;
      const version = target.closest?.('[data-version]')?.dataset.version;
      if (version && version !== activeTranslation && reader.dataset.view !== 'original') {
        const mapped = version === 'ai' && activeTranslation !== 'ai' ?
          [...reader.querySelectorAll('[data-original-ids]')].find(node => node.dataset.originalIds?.split(' ').includes(target.id)) : null;
        if (mapped) target = mapped;
        else changeTranslation(version);
      }
      if (version && version !== 'ai' && reader.dataset.view === 'original') {
        changeTranslation(version);
        change('english');
        return;
      }
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
    showTranslation();
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
        const version = target?.closest?.('[data-version]')?.dataset.version;
        if (view === 'original' && version && version !== 'ai') {
          next.hash = target.closest?.('[data-original-ids]')?.dataset.originalIds.split(' ')[0] || 'sermon-text';
        }
        else if (view === 'english' && omitted) next.hash = omitted.dataset.readingEquivalent || 'sermon-text';
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
  if (translationSelect) {
    document.querySelector('#translation-control').hidden = false;
    translationSelect.addEventListener('change', () => {
      changeTranslation(translationSelect.value, true);
      // Preserve reading position across editions using the shared original-block mapping.
      try {
        const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        const group = target?.closest?.('[data-original-ids]');
        const oldVersion = target?.closest?.('[data-version]')?.dataset.version;
        if (oldVersion && oldVersion !== activeTranslation) {
          const next = new URL(location.href);
          if (activeTranslation === 'ai') next.hash = group?.dataset.originalIds.split(' ')[0] || 'sermon-text';
          else {
            const sourceId = target?.closest?.('.reading-block')?.id || target.id;
            const mapped = [...reader.querySelectorAll('[data-original-ids]')].find(node => node.dataset.originalIds?.split(' ').includes(sourceId));
            next.hash = mapped?.id || 'sermon-text';
          }
          history.replaceState(null, '', next);
        }
      } catch (error) { /* An invalid fragment does not prevent selecting a translation. */ }
      revealHash();
    });
  }
  controls.addEventListener("change", event => change(event.target.value === "reading" ? "english" : scholarText?.value || "parallel", true));
  scholarText?.addEventListener("change", () => change(scholarText.value, true));
  window.addEventListener("hashchange", revealHash);
  window.addEventListener("popstate", () => {
    const currentParams = new URLSearchParams(location.search);
    const requested = currentParams.get('translation');
    if (availableVersions.includes(requested)) activeTranslation = requested;
    showTranslation();
    const view = normalizedView(currentParams.get("view"));
    // Fragment navigation also emits popstate; retain the reader's disclosure choices.
    if (view !== activeView) apply(view);
  });
  reader.addEventListener("click", event => {
    if (event.target.closest('a[href^="#"]')) requestAnimationFrame(revealHash);
  });
})();
