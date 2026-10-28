// Leiste „Kostenloses Erstgespräch“ am unteren Rand (nur kleine Bildschirme, siehe styles.css).
// Sie erscheint, sobald der Einstieg aus dem Bild ist, und verschwindet im Kontaktbereich und beim
// Abschluss, wo ohnehin ein Buchungsbutton steht. Es wird nichts gespeichert oder gemessen.
(() => {
  const bar = document.querySelector('[data-cta-leiste]');
  const watched = document.querySelectorAll('.hero-block, #kontakt, #los');
  if (!bar || !watched.length || !('IntersectionObserver' in window)) return;

  const inView = new Set();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) inView.add(entry.target);
      else inView.delete(entry.target);
    }
    bar.hidden = inView.size > 0;
  });
  watched.forEach((el) => observer.observe(el));
})();
