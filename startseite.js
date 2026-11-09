// Startseite: Der Lichtschein auf den zwei großen Feldern folgt dem Mauszeiger.
// Nur Optik, es wird nichts gespeichert oder gemessen. Bei reduzierter Bewegung passiert nichts,
// dann wechseln die Felder per CSS nur die Farbe.
(() => {
  const felder = document.querySelectorAll('.feld');
  const ruhig = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!felder.length) return;

  felder.forEach((feld) => {
    feld.addEventListener('pointermove', (event) => {
      if (ruhig.matches || event.pointerType !== 'mouse') return;
      const rect = feld.getBoundingClientRect();
      // Prozentwerte, damit die Position auch bei vergrößertem Feld stimmt
      feld.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      feld.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    });
    feld.addEventListener('pointerleave', () => {
      feld.style.removeProperty('--mx');
      feld.style.removeProperty('--my');
    });
  });
})();
