# ADR-0018 · Fragen aus dem Himmel, und ein Tag, der tiefer wird

**Status:** Gültig (ergänzt ADR-0012)
**Datum:** 2026-09-07

## Kontext

Die Fragentabelle war flach: 200 Fragen, drei am Tag, in einer Reihenfolge,
die nichts vom Tag wusste. „Wovor drückst du dich?“ konnte um acht Uhr morgens
als erste Frage kommen; der Vollmond über beiden Städten, den das Himmelsband
längst zeichnet, fragte nichts. Dabei ist der Himmel das, was Ryadom hat und
keine andere App: beide Telefone rechnen ihn lokal, exakt und identisch.

Die Rahmenbedingung aus [ADR-0012](0012-runden-statt-einer-frage-pro-tag.md):
Runde 0 muss aus dem Datum allein ableitbar sein, ohne Server, auf beiden
Telefonen gleich.

## Entscheidung

1. **Der Himmel fragt.** `src/content/occasions.ts` kennt Regeln, die nur vom
   Datum abhängen — Vollmond über dem gemeinsamen Tag, längster und kürzester
   Tag, Tag-und-Nacht-Gleiche (wie man sie sieht: Aufgang bis Untergang), die
   Nacht, in der Hamburgs Uhr springt und die Stunde zwischen den beiden
   auftaucht oder verschwindet, der erste Abend mit Untergang vor sechs bzw.
   nach neun in Hamburg. Trifft eine zu, ist ihre Frage die Frage des Tages;
   die Tabellenfrage des Slots wird übersprungen, nicht verschoben. Ids
   beginnen mit `o-`, damit der Server sie von Tabelle und Pool unterscheidet.
2. **Ein Tag wird tiefer.** Jede Tabellenfrage hat eine Tiefe (1 leicht,
   2 mittel, 3 tief), als Mengen von Ids in `questions.ts`. Runde 0 zieht aus
   dem leichten Pool, Runde 1 aus dem mittleren, Runde 2 aus dem tiefen, jeder
   Pool mit eigenem Schritt — rund zwei Monate ohne Wiederholung je Pool.
3. **Die Tage der beiden fragt der Server.** Geburtstage, der eigene Jahrestag
   und der Vorabend eines Wiedersehens liegen in den Einstellungen, nicht im
   Kalender; zwei Telefone mit zwei Ständen der Einstellungen würden zwei
   Fragen ableiten. Deshalb friert `settle` an so einem Tag eine Id auf Runde 0
   ein (`{ kind: 'bundled', id: 'o-birthday-hamburg' }`), genau wie eine
   eigene Frage, und das Telefon kennt nur die Worte dazu (`occasionById`).
   Vor einer eigenen Frage aus dem Pool: ein Geburtstag kommt einmal im Jahr,
   die Frage im Pool wartet einen Tag. Der Konflikt „Telefon hat vor dem
   ersten Sync die Tabellenfrage beantwortet“ wird wie in
   [ADR-0016](0016-eigene-fragen-zuerst-auch-als-frage-des-tages.md) gelöst:
   wer zuerst schreibt, entscheidet.

## Verworfene Alternativen

- **Wetterfragen auf dem Telefon** („Regen in beiden Städten“, „erster
  Schnee“). Zwei Telefone holen zwei Vorhersagen zu zwei Zeitpunkten; eine
  Frage, die nicht beiden gestellt wird, ist schlimmer als keine. Wenn Regen
  über beiden Städten je etwas fragen soll, muss der Server den Regen sehen —
  derselbe Mechanismus wie in Punkt 3, plus ein Wetterabruf im Server
  ([TD-16](../tech-debt.md)).
- **Neumond als Anlass.** Unsichtbar, und mit dem Vollmond zusammen alle zwei
  Wochen ein Anlass — dann ist es kein Anlass mehr. Der Vollmond bekommt
  stattdessen drei Formulierungen, die mit der Lunation wechseln.
- **Tiefe als Feld an jeder Frage.** Zweihundert Zeilen ändern, um drei
  Mengen zu beschreiben. Die Mengen sind die kleinere Änderung und lassen die
  Tabelle, wie sie ist.
- **Der Himmelsanlass verschiebt die Tabellenfrage** statt sie zu
  überspringen. Dann hinge jede spätere Frage von der Zahl der Anlässe davor
  ab, und eine neue Regel würde die Vergangenheit verschieben.

## Konsequenzen

- Zweiter Stichtag `DEPTH_EPOCH` in `questions.ts` (2026-09-09, der Tag nach
  dem geplanten Deploy). Wer später deployt, zieht ihn nach — sonst ändert
  sich unter schon gezeigten Tagen die Frage ([TD-17](../tech-debt.md)).
- `RoundQuestion` kennt `{ kind: 'bundled', id }`; ein Build, der eine Id
  nicht kennt, zeigt die Tabellenfrage und lernt sie mit dem nächsten Update.
- `promptFor` braucht die Namen (für „{name} — с днём рождения“); Answers
  laden die Einstellungen mit.
- Der Server kennt zum ersten Mal die Einstellungen inhaltlich
  (`specialQuestion` liest `dates` und `reunion`).
