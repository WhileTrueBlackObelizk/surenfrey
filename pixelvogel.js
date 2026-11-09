// Kleiner Pixel-Vogel, der etwa einmal pro Minute durch den Hintergrund der Coaching-Seite fliegt und
// ein Banner zum Datenschutz hinter sich herzieht. Er sucht sich eine Höhe ohne Text und Bedienelemente,
// damit er nie über Inhalt fliegt, und scrollt mit der Seite; angeklickt weicht er aus und lacht.
// Rein dekorativ (aria-hidden). Weil ein Flug länger als 5 Sekunden dauert, lässt er sich über den Schalter [data-vogel-toggle] anhalten (WCAG 2.2.2).
// Entfällt bei „Bewegung reduzieren“ und pausiert in Hintergrund-Tabs. Es wird nichts gespeichert.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const FIRST_DELAY = 8000; // erster Flug nach 8 Sekunden
  const INTERVAL = 60000; // danach etwa jede Minute
  const RETRY = 3000; // gerade keine freie Flugbahn im Bild: in 3 Sekunden neu versuchen
  const MESSAGE = 'Kein Tracking · keine Cookies';

  // Pixel-Art 13×9: # Körper, o Auge, b Schnabel
  const FRAMES = [
    ['....##.......', '....###......', '.....###.....', '...########..', '##########o#b', '..#########..', '....######...', '.............', '.............'],
    ['.............', '.............', '.............', '...########..', '##########o#b', '..#########..', '....######...', '.....###.....', '.....##......'],
  ];
  const COLOR = { '#': 'var(--text)', o: 'var(--bg)', b: 'var(--signal)' };

  const frame = (rows, cls) =>
    `<g class="${cls}">${rows
      .flatMap((row, y) => [...row].map((c, x) => (COLOR[c] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${COLOR[c]}"/>` : '')))
      .join('')}</g>`;

  const bird = document.createElement('div');
  bird.className = 'pixelvogel';
  bird.setAttribute('aria-hidden', 'true');
  bird.innerHTML = `
    <span class="pixelvogel-flug">
      <span class="pixelvogel-banner">${MESSAGE}</span>
      <span class="pixelvogel-line"></span>
      <svg class="pixelvogel-bird" viewBox="0 0 13 9" shape-rendering="crispEdges">${frame(FRAMES[0], 'f1')}${frame(FRAMES[1], 'f2')}</svg>
      <span class="pixelvogel-haha">Haha!</span>
    </span>`;
  // Die Bahn liegt über der ganzen Seite und scrollt mit: Was beim Start frei war, bleibt frei.
  // overflow: hidden verhindert seitliches Scrollen, wenn der Vogel über den Rand hinausfliegt.
  const lane = document.createElement('div');
  lane.className = 'pixelvogel-bahn';
  lane.setAttribute('aria-hidden', 'true');
  lane.append(bird);
  document.body.append(lane);
  const inner = bird.querySelector('.pixelvogel-flug');

  let timer = null;
  let enabled = true;
  let laugh = null;

  // Alles, was der Vogel nicht kreuzen soll: Text, Bilder, Grafiken und Bedienelemente
  const MEDIA = 'img, svg, video, iframe, canvas, button, input, select, textarea, .button';
  const contentRects = () => {
    const rects = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.textContent.trim() && !bird.contains(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    const range = document.createRange();
    while (walker.nextNode()) {
      range.selectNodeContents(walker.currentNode);
      for (const r of range.getClientRects()) if (r.bottom > 0 && r.top < innerHeight && r.width) rects.push(r);
    }
    document.querySelectorAll(MEDIA).forEach((el) => {
      if (bird.contains(el)) return;
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight && r.width) rects.push(r);
    });
    return rects;
  };

  // Höhe des Vogels samt Banner und Wippen (Pixel)
  const BAND = 48;
  const isFree = (top, rects) => rects.every((r) => r.bottom < top - 4 || r.top > top + BAND + 4);

  // Alle freien Flughöhen im Fenster (Oberkante der Bahn in Pixeln)
  const freeLanes = () => {
    const rects = contentRects();
    const free = [];
    for (let y = 80; y < innerHeight - BAND - 16; y += 8) if (isFree(y, rects)) free.push(y);
    return free;
  };

  // Ohne freie Bahn fällt der Flug diesmal aus
  const findAltitude = () => {
    const free = freeLanes();
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
  };

  const fly = () => {
    if (document.hidden || !enabled) return false;
    const y = findAltitude();
    if (y === null) return false;
    bird.style.setProperty('--y', `${Math.round(y + scrollY)}px`); // Seitenkoordinate
    inner.style.translate = '';
    bird.classList.remove('is-flying', 'lacht');
    void bird.offsetWidth; // Animation neu starten
    bird.classList.add('is-flying');
    return true;
  };

  const schedule = (delay) => {
    clearTimeout(timer);
    timer = setTimeout(() => schedule(fly() ? INTERVAL : RETRY), delay);
  };

  // Anklicken: Der Vogel liegt hinter dem Inhalt, deshalb prüft ein Klick-Listener die Position.
  // Klicks auf Links und Buttons gehen wie gewohnt an diese.
  document.addEventListener('click', (event) => {
    if (!bird.classList.contains('is-flying')) return;
    if (event.target.closest('a, button, input, select, textarea, summary, label')) return;
    const r = bird.querySelector('.pixelvogel-bird').getBoundingClientRect();
    const pad = 16;
    if (event.clientX < r.left - pad || event.clientX > r.right + pad || event.clientY < r.top - pad || event.clientY > r.bottom + pad) return;

    // In eine andere freie Bahn ausweichen, bevorzugt weg vom Klick. Gibt es keine, nur ein Hüpfer.
    const shift = parseFloat(inner.style.translate.split(' ')[1]) || 0;
    const now = inner.getBoundingClientRect().top;
    const away = event.clientY < r.top + r.height / 2 ? 1 : -1;
    const lanes = freeLanes().filter((y) => Math.abs(y - now) >= 40);
    const preferred = lanes.filter((y) => Math.sign(y - now) === away);
    const pool = preferred.length ? preferred : lanes;
    if (pool.length) {
      const target = pool.reduce((a, b) => (Math.abs(b - now) < Math.abs(a - now) ? b : a));
      inner.style.translate = `0 ${shift + target - now}px`;
    } else {
      inner.classList.remove('huepft');
      void inner.offsetWidth;
      inner.classList.add('huepft');
    }

    bird.classList.add('lacht');
    clearTimeout(laugh);
    laugh = setTimeout(() => bird.classList.remove('lacht'), 1400);
    const flight = bird.getAnimations().find((a) => a.animationName === 'pixelvogel-fly');
    if (flight) flight.playbackRate = 1.8; // und schnell davon
  });

  bird.addEventListener('animationend', (event) => {
    if (event.animationName === 'pixelvogel-fly') bird.classList.remove('is-flying', 'lacht');
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimeout(timer);
    else schedule(INTERVAL / 2);
  });

  // Schalter zum Ausblenden (gilt nur für diesen Seitenaufruf)
  const toggle = document.querySelector('[data-vogel-toggle]');
  if (toggle) {
    toggle.addEventListener('click', () => {
      enabled = !enabled;
      toggle.textContent = enabled ? 'Pixel-Vogel ausblenden' : 'Pixel-Vogel wieder einblenden';
      if (!enabled) {
        bird.classList.remove('is-flying');
        clearTimeout(timer);
      } else {
        schedule(FIRST_DELAY);
      }
    });
  }

  schedule(FIRST_DELAY);
})();
