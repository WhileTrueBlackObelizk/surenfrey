// Startklar-Check: rechnet komplett im Browser. Es wird nichts gespeichert oder übertragen.
// Grundlagen: Mifflin-St-Jeor (Grundumsatz), PAL nach DGE, MET-Werte (Compendium of Physical Activities),
// WHO-Leitlinie 2020 (Bewegung, Sitzen), Paluch et al. 2022 (Schritte), Morton et al. 2018 und
// Schoenfeld & Aragon 2018 (Eiweiß, Verteilung), EFSA 2010 (Wasser), DGE (Ballaststoffe, Gemüse),
// AASM/SRS-Konsens 2015 (Schlaf), iCalendar RFC 5545 (Kalender-Export).

import { needs, insertSteps } from './auswertung.js';
import { needsSummaryHtml, needsListHtml, initNeeds, uebungenHtml, initUebungen } from './ergebnis.js';
import { FIGUREN } from './figuren.js';

const BOOKING_URL = 'https://calendar.app.google/o5Fur34rWRrZEidT8';
const SLOT_TIME = { morning: [7, 0], noon: [12, 30], evening: [18, 30] };
const SLOT_LABEL = { morning: 'morgens', noon: 'mittags', evening: 'abends' };
const DAY = { MO: 'Montag', TU: 'Dienstag', WE: 'Mittwoch', TH: 'Donnerstag', FR: 'Freitag', SA: 'Samstag' };
const DAY_INDEX = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

// Vorsichtiger Einstieg je nach verfügbarer Zeit (Minuten pro Woche). Bewusst niedrig angesetzt:
// Viele starten nach langer Pause oder mit Beschwerden. Den genauen Plan gibt es erst im Coaching.
const PLANS = {
  60: { strength: [2, 20], cardio: [0, 0], walk: 10 },
  90: { strength: [2, 20], cardio: [1, 25], walk: 10 },
  120: { strength: [2, 25], cardio: [2, 25], walk: 10 },
  180: { strength: [2, 30], cardio: [2, 30], walk: 15 },
};
const STRENGTH_DAYS = { 2: ['MO', 'TH'], 3: ['MO', 'WE', 'FR'] };
const CARDIO_DAYS = { 1: ['TU'], 2: ['TU', 'SA'] };

// Schonende Grundübungen, die fast jeder sicher ausführen kann. slug = Animation: eigene Strichfigur aus
// figuren.js oder, falls es keine gibt, Video aus medien/uebungen/ (Everkinetic, CC BY-SA 3.0)
const UEBUNG = {
  stuhl: { slug: 'stuhl-aufstehen', name: 'Aufstehen vom Stuhl und wieder hinsetzen', hint: 'Füße hüftbreit, ruhig aufstehen und langsam wieder hinsetzen.' },
  wand: { slug: 'wand-liegestuetz', name: 'Liegestütze an der Wand', hint: 'Hände auf Schulterhöhe, der Körper bleibt gerade wie ein Brett.' },
  waden: { slug: 'wadenheben', name: 'Wadenheben, am Tisch festhalten', hint: 'Leicht festhalten, auf die Zehen und langsam wieder ab.' },
  schulter: { slug: 'schulterblaetter', name: 'Schulterblätter zusammenziehen im Sitzen', hint: 'Aufrecht sitzen, Ellbogen nach hinten, kurz halten.' },
  bruecke: { slug: 'hueftbruecke', name: 'Hüftbrücke im Liegen', hint: 'Füße aufgestellt, Becken anheben und langsam ablegen.' },
  hantel: { slug: 'kurzhantel-rudern', name: 'Rudern mit leichter Kurzhantel, am Stuhl abgestützt', hint: 'Rücken gerade, Hantel ruhig zur Hüfte ziehen.' },
  beinpresse: { slug: 'beinpresse', name: 'Beinpresse', hint: 'Füße hüftbreit, die Knie zeigen in Richtung Fußspitzen.' },
  brustpresse: { slug: 'brustpresse', name: 'Brustpresse an der Maschine', hint: 'Griffe auf Brusthöhe, ruhig nach vorn drücken.' },
  kabel: { slug: 'kabelrudern', name: 'Rudermaschine oder Rudern am Kabel', hint: 'Aufrecht sitzen, Griff zum Bauch ziehen, Schultern unten.' },
  latzug: { slug: 'latzug', name: 'Latzug zur Brust', hint: 'Stange ruhig zur oberen Brust ziehen, langsam zurück.' },
  tuer: { slug: 'tuerrahmen-dehnung', name: 'Brustdehnung am Türrahmen', hint: 'Unterarme an den Rahmen, sanft nach vorn lehnen.' },
  kreisen: { slug: 'schulterkreisen', name: 'Schultern und Nacken locker kreisen', hint: 'Locker und langsam, in beide Richtungen.' },
};
const EXERCISES = {
  office: [UEBUNG.stuhl, UEBUNG.wand, UEBUNG.waden, UEBUNG.schulter],
  home: [UEBUNG.stuhl, { ...UEBUNG.wand, name: 'Liegestütze an der Wand oder Tischkante' }, UEBUNG.bruecke, UEBUNG.hantel],
  gym: [UEBUNG.beinpresse, UEBUNG.brustpresse, UEBUNG.kabel, UEBUNG.latzug],
};
const CARDIO = {
  office: 'zügig gehen, zum Beispiel Telefonate oder Meetings im Gehen',
  home: 'zügig gehen oder Rad fahren',
  gym: 'Ergometer, Crosstrainer oder Laufband in gemütlichem Tempo',
};
const MOBILITY = [UEBUNG.tuer, UEBUNG.kreisen];
const DESK_BREAKS = ['Kurz aufstehen und ein paar Schritte gehen', '10-mal Wadenheben am Schreibtisch', 'Schulterkreisen und Brust öffnen', 'Telefonate im Stehen oder Gehen führen'];

// MET-Werte (Compendium of Physical Activities): Krafttraining moderat ~3,5, zügiges Gehen/Ausdauer ~5
const MET = { strength: 3.5, cardio: 5, walk: 3.5 };

const result = document.getElementById('ergebnis');
const resultBody = document.getElementById('result-body');

const fmt = (n) => Math.round(n).toLocaleString('de-DE');
const round50 = (n) => Math.round(n / 50) * 50;

function calculate(d) {
  const sexTerm = { m: 5, f: -161, x: -78 }[d.sex];
  const bmr = 10 * d.weight + 6.25 * d.height - 5 * d.age + sexTerm;

  let pal = { low: 1.4, mid: 1.5, high: 1.6 }[d.activity];
  if (d.sitting < 8) pal += 0.1;

  const plan = PLANS[d.minutes];
  const [sCount, sDur] = plan.strength;
  const [cCount, cDur] = plan.cardio;
  const walkWeek = plan.walk * 5;
  const kcalPerMin = (met) => ((met - 1) * 3.5 * d.weight) / 200; // Netto-Mehrverbrauch
  const trainingPerDay = (sCount * sDur * kcalPerMin(MET.strength) + cCount * cDur * kcalPerMin(MET.cardio) + walkWeek * kcalPerMin(MET.walk)) / 7;

  const total = bmr * pal + trainingPerDay;
  let target = total;
  if (d.goal === 'lose') target = Math.max(total - 400, bmr);
  if (d.goal === 'strength') target = total + 200;

  // Eiweiß: ab ~1,6 g/kg kaum Zusatznutzen (Morton 2018); im Defizit eher am oberen Rand
  const [pLow, pHigh] = d.goal === 'lose' || d.goal === 'strength' ? [1.6, 2.0] : [1.2, 1.6];
  const proteinPerMeal = 0.4 * d.weight; // ~0,4 g/kg pro Mahlzeit (Schoenfeld & Aragon 2018)
  // Schritte: Nutzen flacht ab bei 8.000–10.000 (< 60 J.) bzw. 6.000–8.000 (≥ 60 J.) (Paluch 2022)
  const steps = d.age < 60 ? [8000, 10000] : [6000, 8000];
  // Wasser: EFSA-Gesamtzufuhr 2,0 l (Frauen) / 2,5 l (Männer), davon ~80 % aus Getränken
  const water = { f: 2.0, m: 2.5, x: 2.25 }[d.sex] * 0.8;
  const aerobic = cCount * cDur + walkWeek;
  const lossPerWeek = [d.weight * 0.005, d.weight * 0.01];

  return { bmr, pal, total, target, protein: [d.weight * pLow, d.weight * pHigh], proteinPerMeal, steps, water, plan, aerobic, strengthDays: sCount, lossPerWeek };
}

function sessions(d, r) {
  const [sCount, sDur] = r.plan.strength;
  const [cCount, cDur] = r.plan.cardio;
  const items = EXERCISES[d.place].map((u) => u.name);
  if (d.goal === 'posture' || d.sitting >= 8) items.push('Zum Schluss ein paar Minuten lockern: ' + MOBILITY.map((u) => u.name).join(', '));
  const list = STRENGTH_DAYS[sCount].map((day) => ({
    day,
    minutes: sDur,
    title: 'Sanfte Kräftigung',
    detail: 'Erst 5 Minuten locker aufwärmen. Dann jede Übung 10- bis 12-mal in ruhigem Tempo, ein bis zwei Durchgänge. Du solltest dich danach angenehm gefordert fühlen, nicht erschöpft. Bei Schmerzen die Übung auslassen.',
    items,
  }));
  if (cCount) {
    CARDIO_DAYS[cCount].forEach((day) => list.push({ day, minutes: cDur, title: 'Lockere Ausdauer', detail: `Locker, du solltest dich dabei noch gut unterhalten können: ${CARDIO[d.place]}.`, items: [] }));
  }
  return list.sort((a, b) => DAY_INDEX[a.day] - DAY_INDEX[b.day]);
}

function esc(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

const liters = (n) => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Übungen für die Wischreihe; Bildnachweis nur, wenn ein Everkinetic-Video dabei ist
function uebungen(d) {
  const list = [...EXERCISES[d.place]];
  if (d.goal === 'posture' || d.sitting >= 8) list.push(...MOBILITY);
  return list.map((u) => ({ ...u, dose: '10- bis 12-mal, 1 bis 2 Durchgänge', figur: FIGUREN[u.slug] }));
}

function render(d, r) {
  const list = sessions(d, r);
  const bars = needs(d, r);
  const moves = uebungen(d);
  const fremd = moves.some((u) => !u.figur);
  const [h, m] = SLOT_TIME[d.slot];
  const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} Uhr`;
  const goalText = { lose: 'mit einem moderaten Defizit von etwa 400 kcal', strength: 'mit einem kleinen Überschuss von etwa 200 kcal', energy: 'zum Halten deines Gewichts', posture: 'zum Halten deines Gewichts' }[d.goal];
  const aerobicOk = r.aerobic >= 150;
  const missing = Math.max(0, 150 - r.aerobic);
  const extraWalk = Math.ceil(missing / 5 / 5) * 5;

  resultBody.innerHTML = `
    <p class="notice private-note"><strong>Nur für dich:</strong> Diese Auswertung entsteht in deinem Browser. Sie wird nicht gespeichert und nicht an mich oder andere übertragen. Ob du sie mit mir teilst, zum Beispiel als PDF, entscheidest du.</p>

    <h3>Deine Füllstände</h3>
    <p class="hint need-legende">Je voller der Balken, desto besser ist der Bereich bei dir gerade versorgt. Unter „Was das heißt“ findest du, was der Wert bedeutet und was als Nächstes sinnvoll ist.</p>
    ${needsSummaryHtml(bars)}
    ${needsListHtml(bars)}

    <ul class="stats" role="list">
      <li class="stat">
        <span class="stat-label">Kalorien pro Tag</span>
        <span class="stat-value">ca. ${fmt(round50(r.target))} kcal</span>
        <span class="stat-note">${goalText}. Dein Grundumsatz liegt bei etwa ${fmt(round50(r.bmr))} kcal.</span>
      </li>
      <li class="stat">
        <span class="stat-label">Eiweiß pro Tag</span>
        <span class="stat-value">${fmt(r.protein[0])} bis ${fmt(r.protein[1])} g</span>
        <span class="stat-note">ca. ${fmt(r.proteinPerMeal)} g pro Mahlzeit</span>
      </li>
      <li class="stat">
        <span class="stat-label">Trinken pro Tag</span>
        <span class="stat-value">ca. ${liters(r.water)} l</span>
        <span class="stat-note">an Trainingstagen etwa 0,5 l mehr</span>
      </li>
      <li class="stat">
        <span class="stat-label">Schritte pro Tag</span>
        <span class="stat-value">${fmt(r.steps[0])}+</span>
        <span class="stat-note">größter Nutzen bis etwa ${fmt(r.steps[1])}</span>
      </li>
    </ul>

    <h3>Empfehlungen für deinen Einstieg</h3>
    <p>Das ist bewusst kein fertiger Trainingsplan, sondern ein ruhiger Start, der für die meisten gut passt. Deinen persönlichen Plan stimmen wir im Coaching ab, nach einem Gesundheitsfragebogen und abgestimmt auf deine Erfahrung.</p>
    <p class="notice"><strong>Bitte zuerst:</strong> Wenn du Vorerkrankungen, Beschwerden oder Schmerzen hast, schwanger bist oder lange keinen Sport gemacht hast, sprich vor dem Start mit deiner Ärztin oder deinem Arzt. Tut eine Übung weh, lass sie weg.</p>
    <h4 class="uebung-titel">Deine Übungen</h4>
    ${uebungenHtml(moves)}
    ${fremd ? '<p class="hint uebung-nachweis">Einige Illustrationen: Everkinetic, via Wikimedia Commons, Lizenz <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.de" rel="noopener">CC BY-SA 3.0</a>, von mir zu Animationen bearbeitet. Details im <a href="../../impressum/#bildnachweis">Bildnachweis</a>.</p>' : ''}
    <p>Mein Vorschlag für die ersten Wochen, ${esc(SLOT_LABEL[d.slot])} um ${time}:</p>
    <ol class="week" role="list">
      ${list
        .map(
          (s) => `<li class="session">
            <p class="session-head"><strong>${DAY[s.day]}</strong> <span>${esc(s.title)} · ${s.minutes} Minuten</span></p>
            <p>${esc(s.detail)}</p>
            ${s.items.length ? `<ul>${s.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
          </li>`
        )
        .join('')}
    </ol>

    <h3>Gegen langes Sitzen</h3>
    <p>Du sitzt etwa ${d.sitting} Stunden am Tag. Steh alle 30 bis 60 Minuten kurz auf und mach eine dieser Pausen. Dazu an Arbeitstagen ${r.plan.walk} Minuten zügig gehen, zum Beispiel in der Mittagspause.</p>
    <ul>${DESK_BREAKS.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>

    <h3>Abgleich mit der WHO-Empfehlung</h3>
    <div class="meters">
      <label class="meter">
        <span>Ausdauer und Bewegung: ${r.aerobic} von 150 Minuten pro Woche</span>
        <meter min="0" max="150" low="100" optimum="150" value="${Math.min(r.aerobic, 150)}">${r.aerobic} von 150 Minuten</meter>
      </label>
      <label class="meter">
        <span>Krafttraining: ${r.strengthDays} von 2 Tagen pro Woche</span>
        <meter min="0" max="2" optimum="2" value="${Math.min(r.strengthDays, 2)}">${r.strengthDays} von 2 Tagen</meter>
      </label>
    </div>
    <p>${aerobicOk
      ? 'Damit erreichst du die Empfehlung der WHO für Ausdauer und Kraft.'
      : `Für den Anfang ist das genug. Wenn du dich nach einigen Wochen wohlfühlst, geh an Arbeitstagen etwa ${extraWalk} Minuten länger, dann erreichst du auch die 150 Minuten der WHO.`}</p>
    <p><strong>Langsam steigern:</strong> Bleib die ersten zwei bis drei Wochen bei diesem Umfang. Fühlt sich alles gut an, mach einen Durchgang mehr oder geh ein paar Minuten länger. Lieber regelmäßig und locker als selten und hart.</p>

    <div class="result-actions">
      <button type="button" class="button primary" data-action="ics">Termine in meinen Kalender übernehmen</button>
      <button type="button" class="button" data-action="print">Als PDF speichern</button>
      <button type="button" class="button" data-action="restart">Neu berechnen</button>
    </div>
    <p class="hint">Der Kalender-Export legt die Vorschläge als wöchentliche Termine an (.ics-Datei für Outlook, Google und Apple-Kalender).</p>

    <div class="cta">
      <span>Im Coaching mache ich daraus deinen persönlichen Plan, passend zu deiner Gesundheit, deiner Erfahrung und deiner Woche.</span>
      <a class="button primary" href="${BOOKING_URL}" rel="noopener">Erstgespräch buchen<span class="sr-only"> (externe Seite)</span></a>
    </div>`;

  result.hidden = false;
  initNeeds(resultBody);
  initUebungen(resultBody);
  resultBody.querySelector('[data-action="ics"]').addEventListener('click', () => downloadIcs(d, list));
  resultBody.querySelector('[data-action="print"]').addEventListener('click', () => window.print());
  resultBody.querySelector('[data-action="restart"]').addEventListener('click', () => restart());
  const title = document.getElementById('result-title');
  title.focus({ preventScroll: true });
  result.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

// --- iCalendar (RFC 5545) ---------------------------------------------------------
const VTIMEZONE = [
  'BEGIN:VTIMEZONE', 'TZID:Europe/Berlin',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE',
];

const icsText = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const pad = (n) => String(n).padStart(2, '0');
const localStamp = (dt) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
const utcStamp = (dt) => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// Zeilen länger als 75 Byte falten (RFC 5545, Abschnitt 3.1)
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts = [];
  let current = '';
  for (const ch of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (new TextEncoder().encode(current + ch).length > limit) {
      parts.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function nextDate(dayCode, [h, m]) {
  const now = new Date();
  const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  let diff = (DAY_INDEX[dayCode] - dt.getDay() + 7) % 7;
  if (diff === 0 && dt <= now) diff = 7;
  dt.setDate(dt.getDate() + diff);
  return dt;
}

function downloadIcs(d, list) {
  const stamp = utcStamp(new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Suren Frey//Startklar-Check//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...VTIMEZONE];
  list.forEach((s, i) => {
    const start = nextDate(s.day, SLOT_TIME[d.slot]);
    const end = new Date(start.getTime() + s.minutes * 60000);
    const description = [s.detail, ...s.items.map((x) => `• ${x}`), '', 'Erstellt mit dem Startklar-Check von Suren Frey.'].join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${stamp}-${i}-${Math.random().toString(36).slice(2, 10)}@surenfrey.de`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Berlin:${localStamp(start)}`,
      `DTEND;TZID=Europe/Berlin:${localStamp(end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${s.day}`,
      `SUMMARY:${icsText(`${s.title} (${s.minutes} Min.)`)}`,
      `DESCRIPTION:${icsText(description)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Bewegung', 'TRIGGER:-PT10M', 'END:VALARM',
      'END:VEVENT'
    );
  });
  lines.push('END:VCALENDAR');
  const ics = lines.map(fold).join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'bewegung-suren-frey.ics' });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Auswahlrad -----------------------------------------------------------------------
// Eine Frage nach der anderen; die Antworten liegen im Kreis um die Mitte. Nach einer Auswahl
// schließt sich das Rad und öffnet sich mit der nächsten Frage wieder.
const STEPS = insertSteps([
  { key: 'sex', q: 'Für wen soll ich rechnen?', hint: 'Die Formel für den Energiebedarf unterscheidet nach Geschlecht.',
    options: [['f', 'Frau'], ['m', 'Mann'], ['x', 'Keine Angabe']] },
  { key: 'body', type: 'inputs', q: 'Ein paar Eckdaten', hint: 'Nur für die Berechnung. Die Werte werden nirgends gespeichert.' },
  { key: 'sitting', q: 'Wie viele Stunden sitzt du an einem Arbeitstag?', hint: '',
    options: [['4', 'bis 4', 'Stunden'], ['6', 'etwa 6', 'Stunden'], ['8', 'etwa 8', 'Stunden'], ['10', 'etwa 10', 'Stunden'], ['12', '12 +', 'Stunden']] },
  { key: 'activity', q: 'Wie viel bewegst du dich sonst im Alltag?', hint: '',
    options: [['low', 'Wenig', 'unter 5.000 Schritte'], ['mid', 'Mittel', '5.000 bis 10.000'], ['high', 'Viel', 'über 10.000 Schritte']] },
  { key: 'sleep', q: 'Wie viel schläfst du in einer normalen Nacht?', hint: '',
    options: [['lt6', 'unter 6', 'Stunden'], ['6', '6 bis 7', 'Stunden'], ['7', '7 bis 8', 'Stunden'], ['gt8', 'über 8', 'Stunden']] },
  { key: 'stress', q: 'Wie hoch ist dein Stresslevel gerade?', hint: 'Dein eigenes Gefühl reicht völlig.',
    options: [['low', 'Niedrig'], ['mid', 'Mittel'], ['high', 'Hoch'], ['very', 'Sehr hoch']] },
  { key: 'meals', q: 'Wie viele Mahlzeiten isst du am Tag?', hint: 'Snacks zählen mit, wenn sie satt machen.',
    options: [['2', '1 bis 2'], ['3', '3'], ['4', '4'], ['5', '5 oder mehr']] },
  { key: 'water', q: 'Wie viel trinkst du am Tag?', hint: 'Wasser, Tee, Kaffee und andere Getränke zusammen.',
    options: [['lt1', 'unter 1', 'Liter'], ['1', '1 bis 1,5', 'Liter'], ['15', '1,5 bis 2', 'Liter'], ['gt2', 'über 2', 'Liter']] },
  { key: 'minutes', q: 'Wie viel Zeit kannst du pro Woche einplanen?', hint: '',
    options: [['60', '1 Stunde'], ['90', '1,5 Stunden'], ['120', '2 Stunden'], ['180', '3 Stunden', 'oder mehr']] },
  { key: 'slot', q: 'Wann passt Training am ehesten in deinen Tag?', hint: '',
    options: [['morning', 'Morgens', 'vor der Arbeit'], ['noon', 'Mittags', 'in der Pause'], ['evening', 'Abends', 'nach der Arbeit']] },
  { key: 'place', q: 'Wo trainierst du meistens?', hint: '',
    options: [['office', 'Büro oder Hotel', 'ohne Geräte'], ['home', 'Zu Hause', 'mit Kurzhanteln'], ['gym', 'Fitness­studio']] },
  { key: 'goal', q: 'Was ist dir gerade am wichtigsten?', hint: '',
    options: [['energy', 'Mehr Energie'], ['strength', 'Kräftiger werden'], ['lose', 'Gewicht reduzieren'], ['posture', 'Beweglicher werden']] },
]);

const app = document.getElementById('check-app');
const wheel = document.getElementById('wheel');
const petals = document.getElementById('petals');
const lines = document.getElementById('wheel-lines');
const arc = document.getElementById('wheel-arc');
const bodyForm = document.getElementById('body-form');
const errorBox = document.getElementById('form-error');
const backBtn = document.getElementById('q-back');
const title = document.getElementById('q-title');
const hint = document.getElementById('q-hint');
const stepText = document.getElementById('q-step');
const bar = document.getElementById('q-bar');
const count = document.getElementById('q-count');
const centerLabel = document.getElementById('center-label');
const centerSub = document.getElementById('center-sub');

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion() ? 0 : ms));
const FLASH_MS = 220;
const LEAVE_MS = 260;

// Geometrie in Prozent der Radgröße (passt zum SVG mit viewBox 0 0 100 100)
const R_IN = 24;
const R_OUT = 48.6;
const R_MID = (R_IN + R_OUT) / 2;
const rad = (deg) => (deg * Math.PI) / 180;
const pt = (r, deg) => [50 + r * Math.cos(rad(deg)), 50 + r * Math.sin(rad(deg))];

const answers = {};
let current = 0;
let busy = false;
let centered = false;

function setCenter(label = '', sub = '') {
  const step = STEPS[current];
  centerLabel.textContent = label || (step.type === 'inputs' ? '' : 'Wähle');
  centerSub.textContent = sub || (label ? '' : 'eine Antwort');
}

function activate(btn) {
  if (!btn) {
    wheel.classList.remove('has-active');
    setCenter();
    return;
  }
  wheel.style.setProperty('--arc-rot', `${btn.dataset.mid}deg`);
  wheel.querySelector('.wheel-arc').style.setProperty('--arc-rot', `${btn.dataset.mid}deg`);
  wheel.classList.add('has-active');
  setCenter(btn.dataset.label, btn.dataset.sub);
}

function buildStep(i) {
  const step = STEPS[i];
  stepText.textContent = `Frage ${i + 1} von ${STEPS.length}`;
  bar.style.setProperty('--p', String(i / STEPS.length));
  count.textContent = `${i + 1}/${STEPS.length}`;
  title.textContent = step.q;
  hint.textContent = step.hint || '';
  backBtn.classList.toggle('is-invisible', i === 0);
  backBtn.disabled = i === 0;
  errorBox.textContent = '';

  const isForm = step.type === 'inputs';
  wheel.classList.toggle('is-form', isForm);
  bodyForm.hidden = !isForm;
  petals.replaceChildren();
  lines.replaceChildren();
  wheel.classList.remove('has-active');

  if (isForm) {
    for (const name of ['age', 'height', 'weight']) if (answers[name]) bodyForm.elements[name].value = answers[name];
    return;
  }

  const n = step.options.length;
  const span = 360 / n;
  const start0 = -90 - span / 2; // erstes Segment oben mittig
  // Leuchtbogen über die Breite eines Segments, um 0° zentriert (wird per CSS gedreht)
  const [ax, ay] = pt(49.4, -span / 2 + 4);
  const [bx, by] = pt(49.4, span / 2 - 4);
  arc.setAttribute('d', `M ${ax.toFixed(2)} ${ay.toFixed(2)} A 49.4 49.4 0 0 1 ${bx.toFixed(2)} ${by.toFixed(2)}`);

  step.options.forEach(([value, label, sub], k) => {
    const a0 = start0 + span * k;
    const a1 = a0 + span;
    const mid = a0 + span / 2;
    // Tortenstück als Polygon: Mittelpunkt + Punkte entlang des Außenrands
    const pts = ['50% 50%'];
    for (let d = a0; d <= a1 + 0.01; d += Math.min(5, span / 4)) {
      const [x, y] = pt(51, Math.min(d, a1));
      pts.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
    }
    const [lx, ly] = pt(R_MID, mid);
    const chord = 2 * R_MID * Math.sin(rad(span / 2));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'seg';
    btn.dataset.mid = String(mid);
    btn.dataset.label = label.replace(/­/g, '');
    btn.dataset.sub = sub || '';
    btn.style.setProperty('--i', k);
    btn.style.setProperty('--dx', `${(Math.cos(rad(mid)) * 1.6).toFixed(2)}%`);
    btn.style.setProperty('--dy', `${(Math.sin(rad(mid)) * 1.6).toFixed(2)}%`);
    btn.style.clipPath = `polygon(${pts.join(', ')})`;
    btn.setAttribute('aria-pressed', String(answers[step.key] === value));
    btn.innerHTML = `<span class="seg-label" style="--lx:${lx.toFixed(2)}%;--ly:${ly.toFixed(2)}%;--lw:${Math.min(chord * 0.82, R_OUT - R_IN).toFixed(1)}%"><span class="seg-title">${label}</span>${sub ? ` <span class="seg-sub">${sub}</span>` : ''}</span>`;
    btn.addEventListener('click', () => choose(step.key, value, btn));
    btn.addEventListener('pointerenter', () => activate(btn));
    btn.addEventListener('focus', () => activate(btn));
    petals.append(btn);

    // Trennlinie am Anfang des Segments
    const [x1, y1] = pt(R_IN, a0);
    const [x2, y2] = pt(R_OUT, a0);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    Object.entries({ x1, y1, x2, y2 }).forEach(([k2, v]) => line.setAttribute(k2, v.toFixed(2)));
    lines.append(line);
  });
  setCenter();
  const chosen = petals.querySelector('[aria-pressed="true"]');
  if (chosen) activate(chosen);
}

async function show(i, { focus = true } = {}) {
  busy = true;
  // altes Rad wegdrehen
  wheel.classList.add('is-leaving');
  await wait(LEAVE_MS);
  // neues Rad ohne Übergang in Startposition setzen …
  wheel.classList.add('no-anim', 'is-closed');
  wheel.classList.remove('is-leaving');
  current = i;
  buildStep(i);
  void wheel.offsetWidth;
  // … und mit Schwung aufdrehen
  wheel.classList.remove('no-anim', 'is-closed');
  busy = false;
  if (focus) {
    const target = STEPS[i].type === 'inputs'
      ? bodyForm.elements.age
      : petals.querySelector('[aria-pressed="true"]') || petals.querySelector('.seg');
    target.focus({ preventScroll: true });
  }
}

// beim ersten Tippen das Rad einmal sanft mittig ins Bild holen, danach bleibt die Seite ruhig
function centerOnce() {
  if (centered) return;
  centered = true;
  const r = app.getBoundingClientRect();
  if (r.top < 70 || r.bottom > innerHeight) {
    const y = scrollY + r.top + r.height / 2 - innerHeight / 2;
    window.scrollTo({ top: Math.max(0, y), behavior: reduceMotion() ? 'auto' : 'smooth' });
  }
}

function next() {
  if (current < STEPS.length - 1) show(current + 1);
  else finish();
}

async function choose(key, value, chosen) {
  if (busy) return;
  busy = true;
  centerOnce();
  answers[key] = value;
  petals.querySelectorAll('.seg').forEach((b) => b.setAttribute('aria-pressed', String(b === chosen)));
  activate(chosen);
  chosen.classList.add('is-chosen');
  await wait(FLASH_MS);
  busy = false;
  next();
}

bodyForm.addEventListener('submit', (event) => {
  event.preventDefault();
  centerOnce();
  const fields = ['age', 'height', 'weight'].map((n) => bodyForm.elements[n]);
  // Gewicht darf mit Komma oder Punkt eingegeben werden (84,5 oder 84.5)
  const w = bodyForm.elements.weight;
  const kg = Number(w.value.trim().replace(',', '.'));
  w.setCustomValidity(w.value && (Number.isNaN(kg) || kg < 35 || kg > 250) ? 'Gewicht 35 bis 250 kg' : '');
  const invalid = fields.filter((f) => !f.checkValidity());
  fields.forEach((f) => f.toggleAttribute('aria-invalid', !f.checkValidity()));
  if (invalid.length) {
    errorBox.textContent = 'Bitte prüfe: ' + invalid.map((f) => f.closest('label').querySelector('span').textContent).join(', ') +
      '. Erlaubt sind 18 bis 99 Jahre, 130 bis 230 cm und 35 bis 250 kg.';
    invalid[0].focus({ preventScroll: true });
    return;
  }
  fields.forEach((f) => (answers[f.name] = f.value));
  next();
});

backBtn.addEventListener('click', () => {
  if (!busy && current > 0) show(current - 1);
});

petals.addEventListener('pointerleave', () => {
  const chosen = petals.querySelector('[aria-pressed="true"]');
  if (document.activeElement?.classList.contains('seg')) activate(document.activeElement);
  else activate(chosen);
});

// Pfeiltasten wandern im Kreis
petals.addEventListener('keydown', (event) => {
  const list = [...petals.querySelectorAll('.seg')];
  const k = list.indexOf(document.activeElement);
  if (k < 0) return;
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!step) return;
  event.preventDefault();
  list[(k + step + list.length) % list.length].focus({ preventScroll: true });
});

async function finish() {
  wheel.classList.add('is-leaving');
  await wait(LEAVE_MS);
  app.hidden = true;
  wheel.classList.remove('is-leaving');
  const data = {
    sex: answers.sex,
    age: Number(answers.age),
    height: Number(answers.height),
    weight: Number(String(answers.weight).replace(',', '.')),
    sitting: Number(answers.sitting),
    activity: answers.activity,
    lifting: answers.lifting,
    minutes: Number(answers.minutes),
    slot: answers.slot,
    place: answers.place,
    goal: answers.goal,
    sleep: answers.sleep,
    stress: answers.stress,
    meals: answers.meals,
    eating: answers.eating,
    water: answers.water,
  };
  render(data, calculate(data));
}

function restart() {
  result.hidden = true;
  app.hidden = false;
  centered = false;
  app.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' });
  show(0);
}

// Start: erste Frage aufdrehen, ohne den Fokus zu verschieben
show(0, { focus: false });
