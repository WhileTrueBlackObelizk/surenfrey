// Laufband mit Bewertungen und Vorteilen auf der Coaching-Seite. Ohne JavaScript oder bei
// „Bewegung reduzieren“ bleibt es eine stehende Liste. Weil es länger als 5 Sekunden läuft, lässt es sich
// über den Schalter anhalten (WCAG 2.2.2); bei Mauszeiger darüber pausiert es ebenfalls.
(() => {
  const band = document.querySelector('[data-laufband]');
  if (!band || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Zweite, unsichtbare Kopie für die nahtlose Schleife; Screenreader lesen die Liste nur einmal
  const list = band.querySelector('.laufband-liste');
  const copy = list.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  copy.inert = true;
  list.after(copy);

  // Tempo an die Länge anpassen: etwa 50 Pixel pro Sekunde (gemessen in einer Zeile)
  band.classList.add('laeuft');
  band.style.setProperty('--laufband-dauer', `${Math.max(20, list.offsetWidth / 50)}s`);

  const button = band.querySelector('.laufband-pause');
  button.hidden = false;
  button.addEventListener('click', () => {
    const paused = band.classList.toggle('pausiert');
    button.setAttribute('aria-pressed', String(paused));
  });
})();
