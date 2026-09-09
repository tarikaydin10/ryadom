# ADR-0016 · Eigene Fragen zuerst — auch als Frage des Tages

**Status:** Gültig (ergänzt ADR-0012)
**Datum:** 2026-09-06

## Kontext

[ADR-0012](0012-runden-statt-einer-frage-pro-tag.md) stellte eigene Fragen
*vor* die Tabelle — aber erst ab Runde 1. Runde 0 kam immer aus der Tabelle,
weil sie aus dem Datum abgeleitet wird und damit offline da ist. Folge: eine
Frage, die Mila gestern geschrieben hat, wartet hinter einer Tabellenfrage und
kommt womöglich als Runde 3 um 23 Uhr, wenn niemand mehr schreibt.

Aydins Vorschlag, in einem Satz: **eine Liste, eigene Fragen mit Priorität,
Tabelle nur, wenn keine eigenen mehr da sind.**

## Entscheidung

1. **Der erste Blick auf heute legt die Frage des Tages fest.** Wartet eine
   eigene Frage, wird der Tag mit ihr als Runde 0 angelegt (`settle`). Das
   ist die eine Ausnahme von „ein Lesen erfindet keinen Tag": es erfindet ihn
   für eine Frage, die jemand geschrieben hat.
2. **Wer zuerst schreibt, entscheidet.** Ein Telefon, das offline war und die
   Tabellenfrage beantwortet hat (`questionId` beginnt mit `q`), trifft auf
   dem Server vielleicht eine eigene Frage in Runde 0. Hat noch niemand die
   eigene beantwortet, geht Runde 0 zurück zur Tabelle und die eigene Frage
   an den Anfang der Warteschlange. Hat jemand — dann 409 „question changed";
   das Telefon behält seine Kopie. Das ist ein Wettlauf zweier Telefone, die
   beide vor dem ersten Sync des Tages schreiben, und selten genug für einen
   Fehlercode.
3. **Eine Frage gilt erst als gestellt, wenn jemand geantwortet hat.** Liegt
   eine eigene Frage auf einem Tag, an dem niemand schrieb, kommt sie am
   nächsten Tag zurück nach vorn; die leere Runde wird gelöscht, ein leerer
   Tag ebenso (`pendingOwnQuestion`). Vorher wäre sie stumm verbraucht worden.
4. **Runde 0 bleibt offline lesbar.** Bis zum ersten Sync zeigt das Telefon
   die Tabellenfrage; nach dem Sync die eigene. Das Offline-Versprechen gilt
   für „es gibt eine Frage", nicht für „es ist genau diese".

## Verworfene Alternativen

- **Zwei Listen, zwei Tabs („Frage des Tages" und „Fragespiel").** Zweimal
  Lock-In oder einmal keiner; zwei Stellen, an denen man dran ist. Die
  Knappheit ist das Produkt.
- **Eigene Fragen nur ab Runde 1 (Stand ADR-0012).** Funktionierte, stellte
  aber das Persönliche hinter das Generische.
- **Client entscheidet Runde 0 aus seinem Pool-Stand.** Zwei Telefone mit
  unterschiedlichem Sync-Stand hätten verschiedene Fragen gezogen — derselbe
  Grund, aus dem ADR-0012 die Runden dem Server gab.
- **Abwarten, ob sich Fragen stauen** (mein erster Vorschlag). Die Regel
  „eure zuerst" ist einfacher als die Regel „eure zuerst, außer in Runde 0".

## Konsequenzen

- Die Tabelle wird an Tagen mit eigenen Fragen später oder gar nicht
  erreicht. Das ist gewollt; sie ist der Vorrat, nicht das Programm.
- `questionFor(date, 0)` beschreibt nicht mehr sicher, was heute gefragt
  wurde; die Chronik liest ohnehin die gespeicherte Runde.
- Push bleibt unverändert: erste Antwort auf eine Runde, nur heute.
- Ein Tag kann jetzt ohne Antwort existieren (angelegt durch `settle`) und
  wird beim nächsten Tag wieder entfernt, wenn er leer blieb. Die Chronik
  zeigt ihn nie (leerer Stuhl).
