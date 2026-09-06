# ADR-0017 · Der gemeinsame Tag wechselt um vier Uhr morgens

**Status:** Gültig (ergänzt ADR-0005)
**Datum:** 2026-09-06

## Kontext

[ADR-0005](0005-ein-gemeinsamer-kalendertag.md) gab dem Paar einen gemeinsamen
Kalender (`Europe/Berlin`), damit beide dieselbe Frage sehen. Die Grenze lag
bei Mitternacht. Der eine Fall, in dem das wehtut: einer schreibt um 23:50,
die andere um 00:10 — sie landet auf der neuen Frage, seine Antwort bleibt
ungelesen, bis jemand nachschreibt. Für beide war 00:10 derselbe Abend.

Mittags oder abends wechseln wurde erwogen und verworfen: die Fragen sind als
„heute" formuliert und werden abends beantwortet; Himmel, Countdown und
Chronik rechnen in Kalendertagen. Eine Frage, die einen anderen Tag meint als
alles andere auf dem Schirm, wäre ein Verwirrungsherd ohne Gewinn.

## Entscheidung

Der gemeinsame Tag beginnt um **04:00 Berliner Zeit** (`DAY_START_HOUR` in
`src/lib/day.ts`, `DAY_SHIFT_MS` im Server). Wer um ein Uhr schreibt, schreibt
noch über gestern — was auch stimmt. Um vier schreibt niemand; in Kaliningrad
ist es dann fünf oder sechs, ebenso leer.

Nur der Kalender verschiebt sich: `dateKey`, `startOfPairDay`, `pairDay()`.
Uhren, Sonnenstände, Wetter und das Himmelsband bleiben auf Echtzeit. Die
Tagesmarken auf der Zeitleiste stehen jetzt bei vier Uhr, weil sie sagen, wann
die Frage wechselt, nicht wann der Himmel es tut.

## Verworfene Alternativen

- **Mitternacht lassen, Nachschreiben reicht.** Repariert den Fall, aber
  hinterher. Die Grenze um vier verhindert ihn.
- **Grenze um 12 oder 18 Uhr.** Siehe Kontext.
- **Grenze pro Nutzer** (jeder sein eigener Tag). Genau das, was ADR-0005
  abgeschafft hat.

## Konsequenzen

- Am Tag der Umstellung ist die Zeit zwischen 00:00 und 04:00 zweimal
  „gestern": ein Telefon mit altem Bundle sagt bis vier Uhr „heute". Der Server
  entscheidet für Runden und Push nach seiner eigenen Uhr; ein Konflikt in
  diesem Fenster ist ein Nachschreib-Fall, kein Datenverlust.
- In den zwei Nächten der Zeitumstellung kann `startOfPairDay` eine Stunde
  neben vier liegen. Niemand schreibt um drei oder fünf.
- Die Fragen-Zuordnung (`questionFor`) rechnet aus dem Tagesschlüssel und
  ändert sich nicht.
