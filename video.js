// Stumme Sportvideos auf der Coaching-Seite. Sie spielen nur, solange sie im Bild sind.
// data-video="schleife" läuft endlos und lässt sich über den Schalter anhalten (WCAG 2.2.2),
// data-video="einmal" spielt beim ersten Sichtbarwerden und bleibt auf dem letzten Bild stehen.
// Ohne JavaScript oder bei „Bewegung reduzieren“ bleibt das Standbild (poster).
(() => {
  const videos = [...document.querySelectorAll('video[data-video]')];
  if (!videos.length || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const angehalten = new WeakSet();

  const observer = new IntersectionObserver((entries) => {
    for (const { target: video, isIntersecting } of entries) {
      if (!isIntersecting) {
        video.pause();
      } else if (!angehalten.has(video)) {
        if (video.dataset.video === 'einmal') observer.unobserve(video);
        video.play().catch(() => {});
      }
    }
  }, { threshold: 0.4 });

  for (const video of videos) {
    observer.observe(video);

    const button = video.parentElement.querySelector('.video-pause');
    if (!button) continue;
    button.hidden = false;
    button.addEventListener('click', () => {
      const pause = !angehalten.has(video);
      if (pause) {
        angehalten.add(video);
        video.pause();
      } else {
        angehalten.delete(video);
        video.play().catch(() => {});
      }
      button.setAttribute('aria-pressed', String(pause));
    });
  }
})();
