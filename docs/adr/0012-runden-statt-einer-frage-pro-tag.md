# ADR-0012 · Runden statt einer Frage pro Tag, und eigene Fragen

**Status:** Gültig
**Datum:** 2026-09-06

## Kontext

Mila hat zwei Dinge angemerkt: eine Frage pro 24 Stunden ist zu wenig, und sie
möchte selbst fragen können. Beides zielt auf dieselbe Stelle — bisher fragte
ausschließlich die App, einmal am Tag, aus einer gebündelten Tabelle mit 56
Fragen ([ADR-0005](0005-ein-gemeinsamer-kalendertag.md) für den Tagesschlüssel).

Die Gegenkraft ist der Charakter der App. Was Ryadom hat und ein Messenger nicht
hat, ist Knappheit plus Gleichzeitigkeit: **eine** Sache, dieselbe für beide, und
ihr Text erscheint erst, wenn der eigene geschrieben ist
([ADR-0003](0003-passphrase-pro-seite-lock-in-serverseitig.md)). Mehr Fragen pro
Tag darf diese Mechanik nicht auflösen, sonst ist es ein Chat mit einer
Überschrift — und einen Chat haben die beiden schon.

## Entscheidung

Ein Tag besteht aus bis zu **drei Runden**. Runde 0 ist die Frage des Tages und
wird wie bisher aus dem Datum abgeleitet, also auch offline und auf einem Gerät
ohne Serverkontakt. Jede weitere Runde öffnet der **Server** in dem Moment, in
dem beide die vorherige beantwortet haben; die Frage wird dabei festgeschrieben,
nicht auf zwei Telefonen abgeleitet.

Das Offline-Versprechen ([ADR-0002](0002-lokal-zuerst-outbox-sync.md)) bleibt
heil, weil alles jenseits von Runde 0 ohnehin Serverwissen voraussetzt: ob die
Gegenseite geantwortet hat, weiß nur der Server.

Beide können **eigene Fragen** schreiben. Sie liegen als Pool auf dem Server,
synchronisieren wie Antworten und werden vor den gebündelten gestellt — älteste
zuerst, ohne Datumswahl. Jede Frage trägt die Sprache, in der sie geschrieben
wurde, plus eine **optionale** Übersetzung mit Herkunft (`author` | `machine`).
Ist keine da, liest die Gegenseite den Satz so, wie er geschrieben wurde.

Der Deckel von drei Runden ist Form, keine Drossel: eine am Tag war zu wenig,
unbegrenzt wäre ein Chat. Er hat außerdem einen inhaltlichen Grund — 56
gebündelte Fragen sind bei drei Runden am Tag in neunzehn Tagen einmal durch.

## Verworfene Alternativen

- **Feste Anzahl Fragen pro Tag (z. B. drei, alle sofort offen).** Billiger zu
  bauen, liest sich aber als Formular: zwei unbeantwortete Blöcke stehen als
  offene Aufgaben herum, und der Lock-In verliert seinen Takt.
- **Eigene Fragen mit Datum („die stelle ich am Samstag").** Macht aus einem
  Einfall eine Terminplanung und nimmt die Überraschung, die der halbe Wert ist.
- **Fragen-Pool auf beiden Geräten deterministisch auswählen.** Zwei Telefone mit
  unterschiedlichem Sync-Stand hätten verschiedene Fragen gezogen. Deshalb
  entscheidet der Server und friert die Frage in der Runde ein.
- **Maschinelle Übersetzung sofort mitbauen.** Serverseitig wäre sie mit
  [ADR-0001](0001-ein-hostname-keine-fremd-hosts.md) vereinbar — das Telefon
  spricht weiter nur mit einem Hostnamen — berührt aber ADR-0003: heute verlässt
  kein Text den Server. Das ist eine eigene Entscheidung und wartet auf sie. Das
  Datenmodell hält den Platz dafür frei.
- **Antworten übersetzen.** Nein, unter keiner Variante. Fragen sind kurz und an
  beide gerichtet, Antworten sind das Intime.

## Konsequenzen

- Der Server ist ab jetzt nicht mehr nur Briefkasten, sondern entscheidet, wann
  eine Runde aufgeht und was sie fragt. Das ist die erste Regel dieser Art in
  `server/index.mjs`.
- `MAX_ROUNDS` steht doppelt: im Server (verbindlich) und in
  `src/content/prompt.ts` (nur damit die Seite „das war der Tag" sagen kann).
  Beim Ändern beide anfassen.
- Runden öffnen beim Schreiben — und beim Lesen des **heutigen** Tages, falls
  eine fällig ist und niemand mehr geschrieben hat. Genau das trat am
  Umstellungstag ein: beide hatten vor dem Deploy geantwortet, die Migration
  machte daraus Runde 0, und die verdiente zweite Runde hing hinter einem
  Schreibvorgang, der längst passiert war. Vergangene Tage rührt das Lesen nie
  an, sonst verbrauchte ein Sync von gestern eine eurer eigenen Fragen.
- Damit kennt der Server zum ersten Mal „heute" (`PAIR_TIMEZONE` steht jetzt
  auch in `server/index.mjs`, siehe ADR-0005). Nur dafür.
- Datenmigrationen laufen automatisch: der Server formt `days[date][a|b]` zu
  `days[date].rounds[0]` und legt vorher `answers.before-rounds.json` daneben;
  IndexedDB steigt auf Version 2 und schreibt bestehende Antworten auf Runde 0
  um. Die Tagesantwort trägt die alten Feldnamen `you`/`partner` weiter, damit
  ein Telefon mit altem Bundle während des Deploys normal weiterarbeitet.
- Die Chronik zeigt die vergangenen Tage mit Frage und beiden Antworten; die
  eigenen Fragen stehen als Abschnitt darunter, und von „Heute" führt eine Zeile
  dorthin. Sie kennt nur, was das jeweilige Gerät gesehen hat
  ([TD-10](../tech-debt.md)).
- Die Fragentabelle ist für drei Runden am Tag zu klein
  ([TD-14](../tech-debt.md)).
