// Bilder groß anzeigen (Lightbox) und YouTube erst nach Klick laden.
// Ohne JavaScript funktioniert die Seite trotzdem: Bilder öffnen sich dann direkt.

// --- Lightbox ---------------------------------------------------------------
const zoomLinks = [...document.querySelectorAll('a.zoom')];

if (zoomLinks.length && 'HTMLDialogElement' in window) {
  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.setAttribute('aria-label', 'Bildansicht');
  // Bild ohne src, bis es geöffnet wird; Bildunterschrift wird bei Wechsel vorgelesen
  dialog.innerHTML = `
    <img alt="" />
    <p class="lightbox-caption" aria-live="polite"></p>
    <button type="button" class="lightbox-close" aria-label="Schließen">×</button>
    <button type="button" class="lightbox-prev" aria-label="Vorheriges Bild">‹</button>
    <button type="button" class="lightbox-next" aria-label="Nächstes Bild">›</button>`;
  document.body.append(dialog);

  const img = dialog.querySelector('img');
  const caption = dialog.querySelector('.lightbox-caption');
  let current = 0;
  let opener = null;

  const show = (index) => {
    current = (index + zoomLinks.length) % zoomLinks.length;
    const link = zoomLinks[current];
    const thumb = link.querySelector('img');
    img.src = link.href;
    img.alt = thumb ? thumb.alt : '';
    const figcaption = link.closest('figure')?.querySelector('figcaption');
    const text = figcaption ? figcaption.textContent.trim() : '';
    const position = zoomLinks.length > 1 ? `Bild ${current + 1} von ${zoomLinks.length}` : '';
    caption.textContent = [position, text].filter(Boolean).join(' – ');
  };

  zoomLinks.forEach((link, index) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      opener = link;
      show(index);
      dialog.showModal();
      document.documentElement.style.overflow = 'hidden';
    });
  });

  const multiple = zoomLinks.length > 1;
  dialog.querySelector('.lightbox-prev').hidden = !multiple;
  dialog.querySelector('.lightbox-next').hidden = !multiple;

  dialog.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
  // Nach dem Schließen: Seite wieder scrollbar, Fokus zurück aufs angeklickte Bild
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    opener?.focus();
  });
  dialog.querySelector('.lightbox-prev').addEventListener('click', () => show(current - 1));
  dialog.querySelector('.lightbox-next').addEventListener('click', () => show(current + 1));
  // Klick auf den abgedunkelten Hintergrund schließt
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (!multiple) return;
    if (event.key === 'ArrowLeft') show(current - 1);
    if (event.key === 'ArrowRight') show(current + 1);
  });
}

// --- YouTube erst nach Klick (Zwei-Klick-Lösung) ------------------------------
document.querySelectorAll('.embed[data-youtube]').forEach((box) => {
  box.querySelector('button').addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(box.dataset.youtube)}?autoplay=1`;
    iframe.title = box.dataset.title || 'YouTube-Video';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    box.replaceChildren(iframe);
    box.classList.add('loaded');
  });
});
