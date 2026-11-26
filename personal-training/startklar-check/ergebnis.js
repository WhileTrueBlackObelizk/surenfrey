// Ergebnis des Startklar-Checks: Füllstände wie bei „Die Sims“ und Übungen als Wischreihe.
//
// Bedürfnisse (aus auswertung.js):
//   need = { key, title, value /* 0..10 */, level: 'low'|'mid'|'high', levelText, now, meaning, next: [strings] }
//   needsSummaryHtml(needs)  -> HTML für „Deine stärksten Bereiche“ und „Hier lohnt es sich anzufangen“
//   needsListHtml(needs)     -> HTML der Füllstände (ul.need-liste) mit <details> je Zeile
//   initNeeds(root)          -> startet die Füll-Animation, sobald die Liste sichtbar ist (nach innerHTML aufrufen)
// Übungen:
//   uebungenHtml(list, { id })  list = [{ slug, name, hint, dose?, figur? }]
//   initUebungen(root)          -> Videos und Figuren nur sichtbar bewegen, Pause-Schalter, Vor/Zurück-Knöpfe

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function esc(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

const svg = (body, cls = 'need-icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

// Selbst gezeichnete Symbole je Bereich (rein dekorativ)
export const NEED_ICONS = {
  move: '<circle cx="14.5" cy="4.5" r="2"/><path d="M12.5 8 9.5 13l4 2.5V21"/><path d="M6 10.5 9.5 8h4l2.5 3.5 3 1"/><path d="M9.5 13 7 20.5"/>',
  strength: '<path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11"/>',
  sleep: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M16 4h3l-3 3h3"/>',
  calm: '<path d="M5 19C5 11 10 5 19 5c0 9-6 14-14 14z"/><path d="M5 19l8-8"/>',
  food: '<path d="M12 7.5c-2-1.5-7-1.2-7 4 0 4.3 3.2 9.2 7 8.2 3.8 1 7-3.9 7-8.2 0-5.2-5-5.5-7-4z"/><path d="M12 7.5c0-2 1.2-3.7 3.2-4.2"/>',
  water: '<path d="M6 3h12l-1.6 17.1a1.5 1.5 0 0 1-1.5 1.4H9.1a1.5 1.5 0 0 1-1.5-1.4z"/><path d="M6.6 9.5c2.6-1 4.2 1 6 0s3.2-1 4.8 0"/>',
  time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
};

// Symbol je Stufe, damit die Stufe nie nur über Farbe erkennbar ist
const LEVEL_ICONS = {
  low: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
  mid: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>',
  high: '<circle cx="12" cy="12" r="9"/><path d="m7.5 12.5 3 3 6-6.5"/>',
};

const clamp = (v) => Math.max(0, Math.min(10, Math.round(Number(v) || 0)));

export function needsSummaryHtml(needs) {
  const strong = [...needs].filter((n) => n.level === 'high').sort((a, b) => b.value - a.value).slice(0, 2);
  const start = [...needs].filter((n) => n.level !== 'high').sort((a, b) => a.value - b.value).slice(0, 2);
  const item = (n, extra) =>
    `<li><span class="need-fazit-name">${svg(NEED_ICONS[n.key] || '', 'need-icon need-icon-klein')}${esc(n.title)} <span class="need-fazit-wert">${clamp(n.value)} von 10</span></span>${extra ? `<span class="need-fazit-tipp">${esc(extra)}</span>` : ''}</li>`;
  return `<div class="need-fazit">
    <div class="need-fazit-box need-fazit-stark">
      <h4>Deine stärksten Bereiche</h4>
      ${strong.length ? `<ul role="list">${strong.map((n) => item(n)).join('')}</ul>` : '<p>Noch ist kein Bereich richtig gefüllt. Das ist ein ehrlicher Startpunkt, und jeder kleine Schritt zählt.</p>'}
    </div>
    <div class="need-fazit-box need-fazit-start">
      <h4>Hier lohnt es sich anzufangen</h4>
      ${start.length ? `<ul role="list">${start.map((n) => item(n, n.next[0])).join('')}</ul>` : '<p>Alle Bereiche sind gut gefüllt. Jetzt geht es vor allem ums Dranbleiben.</p>'}
    </div>
  </div>`;
}

export function needsListHtml(needs, { idPrefix = 'need' } = {}) {
  return `<ul class="need-liste" role="list">
    ${needs
      .map((n, i) => {
        const v = clamp(n.value);
        const id = `${idPrefix}-${esc(n.key)}`;
        const valueText = `${v} von 10, ${n.levelText}`;
        return `<li class="need need-${n.level}" style="--i:${i};--wert:${v}">
        <span class="need-titel" id="${id}-titel">${svg(NEED_ICONS[n.key] || '')}${esc(n.title)}</span>
        <div class="need-roehre" role="meter" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${v}" aria-valuetext="${esc(valueText)}" aria-labelledby="${id}-titel">
          <span class="need-fuellung"></span>
        </div>
        <span class="need-zahl" aria-hidden="true">${v} von 10</span>
        <span class="need-stufe" aria-hidden="true">${svg(LEVEL_ICONS[n.level], 'need-stufe-icon')}${esc(n.levelText)}</span>
        <details class="need-mehr">
          <summary>Was das heißt<span class="sr-only"> bei ${esc(n.title)}</span></summary>
          <dl class="need-fakten">
            <div><dt>Jetzt</dt><dd>${esc(n.now)}</dd></div>
            <div><dt>Was das heißt</dt><dd>${esc(n.meaning)}</dd></div>
            <div><dt>Nächster Schritt</dt><dd><ul>${n.next.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></dd></div>
          </dl>
        </details>
      </li>`;
      })
      .join('')}
  </ul>`;
}

// Füll-Animation: Klasse need-voll setzen, sobald die Liste ins Bild kommt.
// Bei „Bewegung reduzieren“ füllt das CSS die Balken sofort ohne Übergang.
let needObserver;
export function initNeeds(root = document) {
  const lists = root.querySelectorAll('.need-liste:not(.need-voll)');
  if (!lists.length) return;
  if (reduceMotion() || !('IntersectionObserver' in window)) {
    lists.forEach((l) => l.classList.add('need-voll'));
    return;
  }
  needObserver ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('need-voll');
        needObserver.unobserve(e.target);
      }
    },
    { threshold: 0.15 }
  );
  // Ein Bild warten, damit der leere Zustand gezeichnet ist und der Übergang startet
  requestAnimationFrame(() => lists.forEach((l) => needObserver.observe(l)));
}

// Für den Druck alle Details öffnen und danach den alten Zustand wiederherstellen
let printHooked = false;
function hookPrint() {
  if (printHooked) return;
  printHooked = true;
  let opened = [];
  addEventListener('beforeprint', () => {
    opened = [...document.querySelectorAll('.need-mehr:not([open])')];
    opened.forEach((d) => (d.open = true));
  });
  addEventListener('afterprint', () => opened.forEach((d) => (d.open = false)));
}
hookPrint();

// --- Übungen als Wischreihe -------------------------------------------------------

const PAUSE_ICONS =
  '<svg class="pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>' +
  '<svg class="play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>';

export function uebungenHtml(list, { id = 'uebungen', base = '../../medien/uebungen/' } = {}) {
  // Medium je Übung: eigene Strichfigur (u.figur, SVG-Text) oder Video aus medien/uebungen/
  const medium = (u) =>
    u.figur
      ? `<div class="uebung-medium">${u.figur}</div>`
      : `<div class="uebung-medium">
            <span class="uebung-platzhalter" aria-hidden="true">${svg('<circle cx="12" cy="5" r="2"/><path d="M12 7.5v6.5M8 10.5l4-2 4 2M9.5 21l2.5-7 2.5 7"/>', 'uebung-platzhalter-icon')}</span>
            <video muted playsinline loop preload="none" poster="${esc(base + u.slug)}.jpg" aria-hidden="true" tabindex="-1">
              <source src="${esc(base + u.slug)}.webm" type="video/webm" />
              <source src="${esc(base + u.slug)}.mp4" type="video/mp4" />
            </video>
          </div>`;
  return `<div class="uebung-block">
    <div class="uebung-steuerung">
      <button type="button" class="uebung-knopf" data-uebung="zurueck" aria-controls="${id}" aria-label="Vorherige Übung">${svg('<path d="m15 5-7 7 7 7"/>', 'uebung-pfeil')}</button>
      <button type="button" class="uebung-knopf" data-uebung="vor" aria-controls="${id}" aria-label="Nächste Übung">${svg('<path d="m9 5 7 7-7 7"/>', 'uebung-pfeil')}</button>
      <button type="button" class="uebung-knopf uebung-pause" data-uebung="pause" aria-pressed="false" hidden>${PAUSE_ICONS}<span class="uebung-pause-text">Animationen anhalten</span></button>
    </div>
    <div class="uebung-reihe" id="${id}" role="region" aria-label="Übungen, seitlich blättern" tabindex="0">
      <ul class="uebung-liste" role="list">
        ${list
          .map(
            (u, i) => `<li class="uebung">
          ${medium(u)}
          <h4 class="uebung-name"><span class="sr-only">Übung ${i + 1} von ${list.length}: </span>${esc(u.name)}</h4>
          <p class="uebung-hinweis">${esc(u.hint)}</p>
          ${u.dose ? `<p class="uebung-dosis">${esc(u.dose)}</p>` : ''}
        </li>`
          )
          .join('')}
      </ul>
    </div>
  </div>`;
}

export function initUebungen(root = document) {
  for (const block of root.querySelectorAll('.uebung-block:not([data-bereit])')) {
    block.dataset.bereit = '';
    const reihe = block.querySelector('.uebung-reihe');
    const zurueck = block.querySelector('[data-uebung="zurueck"]');
    const vor = block.querySelector('[data-uebung="vor"]');
    const pause = block.querySelector('[data-uebung="pause"]');
    const pauseText = pause.querySelector('.uebung-pause-text');
    const karten = [...block.querySelectorAll('.uebung')];
    const medien = [...block.querySelectorAll('.uebung-medium')];

    // Vor/Zurück: um eine Kartenbreite blättern, Knöpfe am Rand deaktivieren
    const schritt = () => (karten[1] ? karten[1].offsetLeft - karten[0].offsetLeft : reihe.clientWidth);
    const blaettern = (dir) => reihe.scrollBy({ left: dir * schritt(), behavior: reduceMotion() ? 'auto' : 'smooth' });
    zurueck.addEventListener('click', () => blaettern(-1));
    vor.addEventListener('click', () => blaettern(1));
    const randPruefen = () => {
      const max = reihe.scrollWidth - reihe.clientWidth - 2;
      zurueck.disabled = reihe.scrollLeft <= 2;
      vor.disabled = reihe.scrollLeft >= max;
    };
    reihe.addEventListener('scroll', randPruefen, { passive: true });
    addEventListener('resize', randPruefen);
    randPruefen();

    // Fehlende Videodateien: Karte zeigt nur den neutralen Platzhalter
    for (const video of block.querySelectorAll('video')) {
      const karte = video.closest('.uebung');
      const fehlt = () => karte.classList.add('uebung-ohne-video');
      const probe = new Image();
      probe.addEventListener('load', () => karte.classList.add('uebung-mit-bild'));
      probe.addEventListener('error', fehlt);
      probe.src = video.getAttribute('poster');
      const quellen = video.querySelectorAll('source');
      quellen[quellen.length - 1].addEventListener('error', fehlt);
      video.addEventListener('error', fehlt);
    }

    // Bei „Bewegung reduzieren“ bleibt das Standbild, es gibt nichts anzuhalten
    if (reduceMotion() || !('IntersectionObserver' in window)) continue;

    // Nur sichtbare Übungen bewegen sich: Videos spielen, Figuren bekommen ist-sichtbar (CSS startet die Animation)
    let angehalten = false;
    const abspielen = (m) => {
      const video = m.querySelector('video');
      if (video && !angehalten && !m.closest('.uebung-ohne-video')) video.play().catch(() => {});
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const { target: m, isIntersecting } of entries) {
          m.classList.toggle('ist-sichtbar', isIntersecting);
          if (isIntersecting) abspielen(m);
          else m.querySelector('video')?.pause();
        }
      },
      { threshold: 0.6 }
    );
    medien.forEach((m) => observer.observe(m));

    pause.hidden = false;
    pause.addEventListener('click', () => {
      angehalten = !angehalten;
      block.classList.toggle('ist-angehalten', angehalten);
      pause.setAttribute('aria-pressed', String(angehalten));
      pauseText.textContent = angehalten ? 'Animationen abspielen' : 'Animationen anhalten';
      medien.forEach((m) => (angehalten ? m.querySelector('video')?.pause() : m.classList.contains('ist-sichtbar') && abspielen(m)));
    });
  }
}
