// Umschalter zwischen Bereichen (z. B. Firmen und Vereine) nach dem ARIA-Muster „Tabs“.
// Ohne JavaScript stehen alle Bereiche untereinander. Pfeiltasten, Pos1 und Ende wechseln den Reiter.
// Ein Anker in der Adresse (#vereine) öffnet den passenden Bereich. Es wird nichts gespeichert.
(() => {
  document.querySelectorAll('[data-tabs]').forEach((root, n) => {
    const panels = [...root.querySelectorAll(':scope > [data-tab-label]')];
    if (panels.length < 2) return;

    const list = document.createElement('div');
    list.className = 'tab-leiste';
    list.setAttribute('role', 'tablist');
    list.setAttribute('aria-label', root.closest('section')?.querySelector('h2')?.textContent ?? 'Bereiche');

    const tabs = panels.map((panel, i) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.id = `tab-${n}-${i}`;
      tab.textContent = panel.dataset.tabLabel;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.tabIndex = 0;
      list.append(tab);
      return tab;
    });
    root.prepend(list);
    root.classList.add('tabs-aktiv');

    const select = (index, focus) => {
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
      });
      root.dataset.aktiv = panels[index].id; // für den Farbton je Reiter
      if (focus) tabs[index].focus();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i, false));
      tab.addEventListener('keydown', (event) => {
        const last = tabs.length - 1;
        const next = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        select(next, true);
      });
    });

    const fromHash = () => {
      const index = panels.findIndex((panel) => `#${panel.id}` === location.hash);
      if (index >= 0) {
        select(index, false);
        root.scrollIntoView();
      }
      return index;
    };
    if (fromHash() < 0) select(0, false);
    addEventListener('hashchange', fromHash);
  });
})();
