// Schwerpunkte auf der Informatik-Seite als Filter für die Projektliste. Mehrere Themen gleichzeitig zeigen
// alle Projekte, die zu mindestens einem davon passen; ohne Auswahl sind wieder alle sichtbar.
// Ohne JavaScript bleiben Schwerpunkte und Projekte einfache Listen. Es wird nichts gespeichert.
(() => {
  const chips = document.querySelectorAll('[data-filter-themen] [data-thema]');
  const cards = [...document.querySelectorAll('[data-themen]')];
  const status = document.querySelector('[data-filter-status]');
  const actions = document.querySelector('[data-filter-aktionen]');
  if (!chips.length || !cards.length || !status || !actions) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const topics = (card) => card.dataset.themen.split(' ');
  const active = new Set();
  const names = {};
  const buttons = [];

  // Eigener Name je Karte, damit die View-Transition jede einzeln ein- und ausblenden kann
  cards.forEach((card, i) => card.style.setProperty('view-transition-name', `projekt-${i + 1}`));

  chips.forEach((chip) => {
    const key = chip.dataset.thema;
    const count = cards.filter((card) => topics(card).includes(key)).length;
    if (!count) return; // Themen ohne öffentliches Projekt bleiben reine Anzeige
    names[key] = chip.textContent.trim();

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip-filter';
    button.dataset.thema = key;
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `${chip.innerHTML}<span class="chip-count"><span class="sr-only">, </span>${count}<span class="sr-only"> ${count === 1 ? 'Projekt' : 'Projekte'}</span></span>`;
    chip.textContent = '';
    chip.append(button);
    chip.classList.add('ist-filter');
    buttons.push(button);

    button.addEventListener('click', () => {
      if (active.has(key)) active.delete(key);
      else active.add(key);
      button.setAttribute('aria-pressed', String(active.has(key)));
      apply();
    });
  });
  if (!buttons.length) return;

  document.querySelector('[data-filter-themen]').classList.add('filter-aktiv');
  document.querySelector('[data-filter-hinweis]')?.removeAttribute('hidden');

  document.querySelector('[data-filter-reset]').addEventListener('click', () => {
    active.clear();
    buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    apply();
    buttons[0].focus(); // der Zurücksetzen-Button verschwindet, Fokus nicht ins Leere fallen lassen
  });

  const update = (animateFallback) => {
    let shown = 0;
    cards.forEach((card) => {
      const visible = !active.size || topics(card).some((t) => active.has(t));
      if (visible && card.hidden && animateFallback) {
        card.classList.add('ploppt');
        card.addEventListener('animationend', () => card.classList.remove('ploppt'), { once: true });
      }
      card.hidden = !visible;
      if (visible) shown += 1;
    });
    actions.hidden = !active.size;
    const chosen = [...active].map((k) => names[k]);
    const list = chosen.length > 1 ? `${chosen.slice(0, -1).join(', ')} oder ${chosen.at(-1)}` : chosen[0];
    status.textContent = active.size
      ? `${shown} von ${cards.length} Projekten zu ${list}.`
      : `Alle ${cards.length} Projekte werden angezeigt.`;
  };

  const apply = () => {
    if (reduceMotion.matches) update(false);
    else if (document.startViewTransition) document.startViewTransition(() => update(false));
    else update(true);
  };
})();
