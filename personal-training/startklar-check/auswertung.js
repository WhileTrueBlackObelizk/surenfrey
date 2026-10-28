// Auswertung als „Bedürfnis-Balken“ (wie bei Die Sims). Jeder Bereich bekommt 0 bis 10 Punkte, 10 = voll.
// Die Werte folgen direkt aus den Antworten im Rad; die Regeln stehen als Kommentar über jedem Bereich.
// Quellen wie in check.js: WHO 2020 (Bewegung, Sitzen, Kraft), Paluch 2022 (Schritte), AASM/SRS 2015 (Schlaf),
// EFSA 2010 (Wasser), DGE (regelmäßige Mahlzeiten, Gemüse, Wasser statt zuckerhaltiger Getränke).

// Zwei neue Fragen, damit es insgesamt 14 werden. `after` sagt, hinter welchem Schritt aus STEPS sie ins Rad kommen.
// Kraft: ohne eigene Frage ließe sich Kraft nur raten (Schritte und Alter sagen nichts über Muskelarbeit),
// und der Plan deckt immer 2 Krafttage ab. Deshalb eine kurze Frage direkt nach der Alltagsbewegung.
// Ernährung: eine Frage mit vier Stufen bündelt Lieferdienst, schnelle Kantine, Süßes, ausgelassene Mahlzeiten
// und Getränke. Das Rad erlaubt nur eine Antwort, und „wie oft muss es schnell gehen“ lässt sich ehrlich schätzen.
export const NEW_STEPS = [
  { key: 'lifting', after: 'activity', q: 'Machst du gerade Kraftübungen?', hint: 'Zählt alles: Studio, Hanteln, Übungen mit dem eigenen Körpergewicht.',
    options: [['no', 'Gerade nicht'], ['rare', 'Ab und zu', 'unregelmäßig'], ['1', '1-mal', 'pro Woche'], ['2', '2-mal +', 'pro Woche']] },
  { key: 'eating', after: 'meals', q: 'Wie oft muss Essen in deiner Arbeitswoche schnell gehen?',
    hint: 'Zum Beispiel Lieferdienst, schnell in der Kantine, Süßes statt Mittagessen, eine Mahlzeit fällt aus oder Softdrinks und Feierabendbier. Grobe Schätzung reicht. Hier gibt es kein richtig oder falsch.',
    options: [['rare', 'Selten', 'meist in Ruhe'], ['some', 'Ab und zu', '1 bis 2 Tage'], ['often', 'Oft', '3 bis 4 Tage'], ['daily', 'Fast täglich', 'so ist es gerade']] },
];

// In die vorhandene Liste einsortieren: insertSteps(STEPS) gibt die 14 Schritte in der richtigen Reihenfolge zurück
export function insertSteps(steps) {
  const out = [];
  for (const s of steps) {
    out.push(s);
    NEW_STEPS.filter((n) => n.after === s.key).forEach(({ after, ...n }) => out.push(n));
  }
  return out;
}

export const LEVEL_TEXT = { low: 'ausbaufähig', mid: 'auf gutem Weg', high: 'gut gefüllt' };

// Untergrenze 1: kein Balken ist ganz leer, das wirkt ermutigender
const clamp = (n) => Math.max(1, Math.min(10, Math.round(n)));
const levelOf = (v) => (v <= 3 ? 'low' : v <= 6 ? 'mid' : 'high');
const fmt = (n) => Math.round(n).toLocaleString('de-DE');
const liters = (n) => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const STEPS_LABEL = { low: 'unter 5.000', mid: '5.000 bis 10.000', high: 'über 10.000' };
const SLEEP_LABEL = { lt6: 'unter 6 Stunden', '6': '6 bis 7 Stunden', '7': '7 bis 8 Stunden', gt8: 'über 8 Stunden' };
const STRESS_LABEL = { low: 'niedrig', mid: 'mittel', high: 'hoch', very: 'sehr hoch' };
const MEALS_LABEL = { '2': '1 bis 2', '3': '3', '4': '4', '5': '5 oder mehr' };
const LIFT_LABEL = { no: 'gerade keine Kraftübungen', rare: 'Kraftübungen ab und zu', '1': 'Kraftübungen 1-mal pro Woche', '2': 'Kraftübungen 2-mal pro Woche oder öfter' };
const EAT_LABEL = { rare: 'selten', some: 'an 1 bis 2 Tagen', often: 'an 3 bis 4 Tagen', daily: 'fast täglich' };
const WATER_NOW = { lt1: 0.75, '1': 1.25, '15': 1.75, gt2: 2.25 };
const WATER_LABEL = { lt1: 'unter 1 Liter', '1': '1 bis 1,5 Liter', '15': '1,5 bis 2 Liter', gt2: 'über 2 Liter' };
const HOURS = { 60: '1 Stunde', 90: '1,5 Stunden', 120: '2 Stunden', 180: '3 Stunden oder mehr' };

function need(key, title, value, now, meaning, next) {
  const v = clamp(value);
  const level = levelOf(v);
  return { key, title, value: v, level, levelText: LEVEL_TEXT[level], now, meaning: meaning[level], next: next[level] };
}

export function needs(d, r) {
  const list = [];
  const steps = `${fmt(r.steps[0])} bis ${fmt(r.steps[1])}`;

  // Bewegung: Schritte geben die Basis (wenig 2, mittel 5, viel 8), Sitzen verschiebt:
  // bis 4 h +2, 6 h +1, 8 h 0, 10 h -1, 12 h -2 (WHO 2020: langes Sitzen unterbrechen; Paluch 2022: Schritte)
  const move = { low: 2, mid: 5, high: 8 }[d.activity] + { 4: 2, 6: 1, 8: 0, 10: -1, 12: -2 }[d.sitting];
  list.push(need('move', 'Bewegung', move,
    `${STEPS_LABEL[d.activity]} Schritte, etwa ${d.sitting} Stunden Sitzen`,
    {
      low: `Dein Alltag ist gerade eher ruhig. Hier bringt schon wenig zusätzliche Bewegung spürbar viel, ${steps} Schritte sind ein gutes Ziel.`,
      mid: `Du bewegst dich schon einiges. Mit etwas mehr Gehen und kurzen Pausen vom Sitzen kommst du in den Bereich von ${steps} Schritten.`,
      high: 'Du bist im Alltag gut in Bewegung. Das ist eine starke Grundlage für dein Training.',
    },
    {
      low: ['Steh alle 30 bis 60 Minuten kurz auf, zum Beispiel bei jedem Telefonat.', 'Geh an Arbeitstagen 10 Minuten zügig, etwa nach dem Mittagessen.'],
      mid: ['Führe Telefonate und kurze Meetings im Gehen.', 'Nimm die Treppe statt den Aufzug.'],
      high: d.sitting >= 10 ? ['Unterbrich lange Sitzphasen alle 30 bis 60 Minuten, auch an vollen Tagen.'] : ['Behalte deine Gewohnheiten bei, sie tragen dich durch volle Wochen.'],
    }));

  // Kraft: eigene Frage. Gerade nicht 2, ab und zu 4, 1-mal pro Woche 6, 2-mal oder öfter 10 (WHO 2020: an 2 Tagen Kraft)
  const strength = { no: 2, rare: 4, '1': 6, '2': 10 }[d.lifting];
  list.push(need('strength', 'Kraft', strength,
    LIFT_LABEL[d.lifting],
    {
      low: 'Kraftübungen sind bei dir gerade noch kein fester Teil der Woche. Das geht vielen so, und genau hier fängt dein Plan ruhig an.',
      mid: 'Du hast schon einen Anfang. Die WHO empfiehlt Kraftübungen an 2 Tagen pro Woche, bis dahin fehlt nicht mehr viel.',
      high: 'Du machst schon regelmäßig Kraftübungen und erreichst damit die 2 Tage pro Woche, die die WHO empfiehlt.',
    },
    {
      low: ['Starte mit 2 kurzen Einheiten pro Woche, wie im Vorschlag unten.', 'Fang leicht an: 10 bis 12 ruhige Wiederholungen, ein bis zwei Durchgänge.'],
      mid: ['Leg einen zweiten festen Krafttag in deinen Kalender.', 'Bleib bei ruhigem Tempo und steigere erst nach ein paar Wochen.'],
      high: ['Halte deine 2 Krafttage, auch in vollen Wochen lieber kurz als gar nicht.'],
    }));

  // Erholung: Schlafdauer. Unter 6 h 2, 6 bis 7 h 5, 7 bis 8 h 9, über 8 h 9 (AASM/SRS 2015: mindestens 7 Stunden)
  const sleep = { lt6: 2, '6': 5, '7': 9, gt8: 9 }[d.sleep];
  list.push(need('sleep', 'Erholung', sleep,
    `${SLEEP_LABEL[d.sleep]} Schlaf`,
    {
      low: 'Du schläfst gerade deutlich weniger als die empfohlenen 7 Stunden. In vollen Phasen ist das häufig, und hier liegt viel Energie für dich.',
      mid: 'Du bist nah an den empfohlenen 7 Stunden. Schon eine halbe Stunde mehr kann sich gut anfühlen.',
      high: 'Du kommst auf mindestens 7 Stunden Schlaf. Damit hast du eine gute Basis für Erholung und Training.',
    },
    {
      low: ['Leg eine feste Aufstehzeit fest, auch am Wochenende.', 'Die letzte halbe Stunde vor dem Schlafen ohne Arbeitsmails und Bildschirm.'],
      mid: ['Geh an 3 Abenden pro Woche eine halbe Stunde früher ins Bett.', 'Koffein etwa 6 Stunden vor dem Schlafen weglassen.'],
      high: ['Halte deine Schlafzeiten möglichst gleich, auch am Wochenende.'],
    }));

  // Gelassenheit: Stress umgedreht, damit voll = gut. Niedrig 9, mittel 7, hoch 4, sehr hoch 1
  const calm = { low: 9, mid: 7, high: 4, very: 1 }[d.stress];
  list.push(need('calm', 'Gelassenheit', calm,
    `Stresslevel ${STRESS_LABEL[d.stress]}`,
    {
      low: 'Gerade ist bei dir viel los. Kleine, feste Pausen im Tag sind ein guter Anfang, ganz ohne großen Aufwand.',
      mid: 'Dein Stress ist spürbar, aber nicht übermächtig. Mit kurzen Pausen und Bewegung schaffst du dir mehr Ausgleich.',
      high: 'Du fühlst dich gerade ziemlich ausgeglichen. Training als fester Termin hilft, das auch in vollen Wochen zu halten.',
    },
    {
      low: d.stress === 'very'
        ? ['Zwei- bis dreimal am Tag 2 Minuten ruhig atmen, dabei länger aus- als einatmen.', 'Trainiere vorerst eher moderat und gib dem Schlaf Vorrang. Wenn der Stress dauerhaft hoch ist oder dich belastet, sprich mit deiner Hausärztin oder deinem Hausarzt.']
        : ['Zwei- bis dreimal am Tag 2 Minuten ruhig atmen, dabei länger aus- als einatmen.', 'Geh 10 Minuten nach dem Mittagessen, statt am Schreibtisch zu bleiben.'],
      mid: ['Geh 10 Minuten nach dem Mittagessen, statt am Schreibtisch zu bleiben.', 'Plane Training wie ein Meeting ein. Das schafft Struktur in intensiven Wochen.'],
      high: ['Plane Training wie ein Meeting ein, dann bleibt es auch in vollen Wochen.'],
    }));

  // Ernährung: neue Frage gibt die Basis (selten 9, ab und zu 7, oft 4, fast täglich 2),
  // Mahlzeiten verschieben: 1 bis 2 -1, 3 oder 4 +1, 5 und mehr 0 (DGE: regelmäßig essen; Eiweiß verteilen)
  const food = { rare: 9, some: 7, often: 4, daily: 2 }[d.eating] + { '2': -1, '3': 1, '4': 1, '5': 0 }[d.meals];
  list.push(need('food', 'Ernährung', food,
    `${MEALS_LABEL[d.meals]} Mahlzeiten am Tag, schnelles Essen ${EAT_LABEL[d.eating]}`,
    {
      low: 'Essen läuft bei dir gerade oft nebenbei. Das ist bei vollen Kalendern ganz normal. Ein, zwei feste Gewohnheiten machen hier schon viel leichter.',
      mid: 'Vieles läuft bei dir schon gut, an manchen Tagen muss es schnell gehen. Mit etwas Vorbereitung klappt es auch dann.',
      high: 'Du isst meist regelmäßig und in Ruhe. Das ist eine gute Grundlage für Energie im Alltag und für dein Training.',
    },
    {
      low: [d.meals === '2' ? 'Plane eine feste Mahlzeit mehr ein, zum Beispiel ein einfaches Frühstück oder einen Snack mit Eiweiß am Nachmittag.' : 'Leg dir für hektische Tage etwas Einfaches bereit, etwa Skyr, Nüsse oder Obst im Büro.', 'Wähle beim schnellen Essen eine Portion Gemüse dazu und trink Wasser statt zuckerhaltiger Getränke.'],
      mid: [`Achte auf etwa ${fmt(r.proteinPerMeal)} g Eiweiß pro Mahlzeit, zum Beispiel aus Quark, Eiern, Hülsenfrüchten oder Fisch.`, 'Jeden Tag Gemüse zu Mittag und Abend, auch in der Kantine.'],
      high: [`Verteile dein Eiweiß auf 3 bis 4 Mahlzeiten mit je etwa ${fmt(r.proteinPerMeal)} g.`],
    }));

  // Trinken: 10 Punkte, wenn die angegebene Menge den Richtwert erreicht; pro fehlendem Liter 12 Punkte weniger
  // (EFSA 2010, davon ~80 % aus Getränken; bis 0,25 l darunter noch gut gefüllt, ab etwa 0,6 l darunter ausbaufähig)
  const now = WATER_NOW[d.water];
  const drink = 10 - Math.max(0, r.water - now) * 12;
  list.push(need('water', 'Trinken', drink,
    `${WATER_LABEL[d.water]} am Tag`,
    {
      low: `Du trinkst gerade deutlich weniger als die etwa ${liters(r.water)} Liter, die als Richtwert gelten. Im Arbeitsalltag rutscht das schnell durch.`,
      mid: `Du bist nicht weit weg von etwa ${liters(r.water)} Litern am Tag. Ein, zwei Gläser mehr reichen oft schon.`,
      high: `Du trinkst ungefähr so viel wie empfohlen, etwa ${liters(r.water)} Liter. An Trainingstagen darf es etwa 0,5 Liter mehr sein.`,
    },
    {
      low: ['Stell dir eine Flasche Wasser auf den Schreibtisch und trink zu jedem Meeting ein Glas.', 'Ungesüßter Tee zählt mit, Kaffee in normalen Mengen ebenfalls.'],
      mid: ['Trink zu jeder Mahlzeit ein Glas Wasser.', 'Wasser statt zuckerhaltiger Getränke, das macht es auch leichter beim Essen.'],
      high: ['Behalte deine Flasche am Arbeitsplatz bei und nimm sie mit zum Training.'],
    }));

  // Zeit: Anteil an 3 Stunden pro Woche, denn damit passen 150 Minuten Bewegung und 2 Krafttage (WHO 2020) gut hinein.
  // 1 h 3, 1,5 h 5, 2 h 7, 3 h oder mehr 10
  const time = (d.minutes / 180) * 10;
  list.push(need('time', 'Zeit', time,
    `${HOURS[d.minutes]} pro Woche`,
    {
      low: 'Viel Zeit ist gerade nicht übrig. Für einen guten Start reicht das trotzdem, denn Regelmäßigkeit zählt mehr als Dauer.',
      mid: `Damit kommst du gut in den Rhythmus. Zusammen mit Alltagsbewegung bist du bei ${r.aerobic} von 150 Minuten, die die WHO empfiehlt.`,
      high: 'Du hast genug Zeit eingeplant, um Kraft und Ausdauer gut unterzubringen.',
    },
    {
      low: ['Trag die 2 kurzen Einheiten fest in deinen Kalender ein.', 'Nutze Wege im Alltag zum Gehen, das zählt mit.'],
      mid: ['Trag deine Einheiten als feste Termine ein.', 'Wenn es sich nach ein paar Wochen gut anfühlt, plane etwas mehr Zeit ein.'],
      high: ['Trag deine Einheiten als feste Termine ein, damit die Zeit nicht verplant wird.'],
    }));

  return list;
}
