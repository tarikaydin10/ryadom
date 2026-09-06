# Produktkonzept und Roadmap

Was Ryadom sein soll, was es heute ist, und was in welcher Reihenfolge als
Nächstes kommt. Das **Warum** der bestehenden Teile steht im [README](../README.md),
das **Wie** in [CLAUDE.md](../CLAUDE.md), die Entscheidungen in [docs/adr](adr/README.md).
Hier steht, wohin es geht — und was bewusst nicht gebaut wird.

Stand: 2026-09-06, Tag des Livegangs. Am selben Tag kamen Runden, eigene
Fragen und Push dazu ([ADR-0012](adr/0012-runden-statt-einer-frage-pro-tag.md),
[ADR-0013](adr/0013-push-benachrichtigungen.md)) — auf Milas Anmerkung hin,
dass eine Frage am Tag zu wenig ist und sie selbst fragen will. Das ist der
erste Nutzerwunsch, der Produkt geworden ist, und er verschiebt die Mitte der
App: nicht mehr „eine Frage, einmal am Tag", sondern **ein Takt zu zweit**.

---

## Der Kern in einem Satz

Zwei Menschen in zwei Städten sehen denselben Himmel, beantworten dieselbe
Frage — und lesen die Antwort der anderen Seite erst, wenn sie selbst
geschrieben haben. Haben beide geschrieben, geht die nächste Frage auf.

Was Ryadom von einem Chat unterscheidet, sind **Knappheit und Gleichzeitigkeit**:
eine Sache, dieselbe für beide, und ein Takt, den keiner allein bestimmen kann.
Jede neue Funktion wird an dieser Stelle geprüft: Löst sie den Takt auf, ist
sie falsch — auch wenn sie sich jemand wünscht.

## Woran man merkt, dass es funktioniert

Keine Analytics ([ADR-0001](adr/0001-ein-hostname-keine-fremd-hosts.md)). Die
Nutzer sind zwei; man fragt sie. Drei Dinge zählen:

1. **Beide schreiben an den meisten Tagen.** Nicht „jeden Tag" — ein
   verpasster Tag darf kein schlechtes Gewissen machen. Bleibt eine Woche
   leer, lautet die Frage: hat die App genervt, oder waren die Fragen schlecht?
2. **Der Pool ist nie leer.** Wenn beide eigene Fragen schreiben, funktioniert
   der Takt. Läuft nur die Tabelle, ist die App ein Kalender.
3. **Man schaut zurück.** Die Chronik wird geöffnet, nicht nur Today.

## Grundsätze für alles Neue

Die harten Rahmenbedingungen — ein Hostname für das Telefon, privat für zwei,
offline zuerst, weniger Code — gelten unverändert. Dazu drei Produkt-Grundsätze:

- **Nichts, was drängt.** Push sagt, *dass* geschrieben wurde, nie *was*, und
  nur einmal pro Runde. Keine Streaks als Druckmittel, keine „3 Tage
  verpasst"-Banner, keine Erinnerung am Abend. Die App wartet; sie ruft nur,
  wenn die andere Seite etwas getan hat.
- **Die Vergangenheit gehört beiden.** Was einmal geschrieben wurde, gehört
  beiden Geräten und geht nicht verloren — nicht bei einer Neuinstallation,
  nicht auf einem neuen Telefon, nicht durch ein Deploy
  ([ADR-0014](adr/0014-chronik-verlauf-vom-server.md)).
- **Der Lock-In gilt rückwirkend.** Eine Runde, an der nur eine Seite schrieb,
  bleibt für die andere geschlossen — auch in der Chronik. Sonst wäre die
  Regel für heute nur eine Verzögerung.

## Stand heute

| Bereich | Stand |
|---|---|
| Himmelsband, Sonne/Mond, Wetter | Fertig. Wischen durch ±14 Tage. |
| Frage des Tages, Lock-In | Fertig, serverseitig. |
| Runden | Bis zu drei am Tag; jede weitere öffnet der Server, wenn beide geschrieben haben. |
| Eigene Fragen | Pool auf dem Server, älteste zuerst, optional mit Übersetzung. Seit ADR-0016 auch als Frage des Tages: eure zuerst, die Tabelle füllt auf. |
| Push | Serverseitig, ohne Inhalt, nur in der installierten App. Auf dem iPhone bestätigt. |
| Chronik | Vergangene Tage mit allen Runden, vollständig auf jedem Gerät (ADR-0014); verpasste Runden lassen sich nachschreiben (ADR-0015). |
| Backup | Täglich durch den Server, dreißig Tage; Anleitung für die Kopie nach außen in deploy/README.md. |
| Countdown | Fertig, Datum wird geteilt. |
| Karte | Platzhalter. Kein Design, kein Konzept ohne Fremd-Host (s. u.). |
| iOS | Zwei offene Punkte ([TD-01](tech-debt.md), [TD-02](tech-debt.md)); Diagnose jetzt unter „Us". |

## Roadmap

In Reihenfolge. Jeder Schritt ist klein genug für einen Deploy und trägt für
sich. Nummern sind Prioritäten, keine Termine.

### 1 · Fragentabelle vergrößern — *erledigt 2026-09-06*

200 statt 56 Fragen, ab Stichtag 2026-09-07 drei Runden am Tag ohne
Wiederholung für 66 Tage; die Vergangenheit bleibt an ihrer alten Zuordnung
([TD-14](tech-debt.md)). Was bleibt: die Fragen sind von mir geschrieben, nicht
von euch — wenn eine schief klingt oder auf Russisch nicht sitzt, ist das eine
Zeile in `src/content/questions.ts`. Und der eigene Pool ist weiterhin die
bessere Quelle.

### 2 · Nachschreiben — *erledigt 2026-09-06*

Ohne Frist, ohne neue Runde, mit „nachgetragen am …"
([ADR-0015](adr/0015-nachschreiben-ohne-frist-ohne-runde.md)).

### 3 · Push auf dem Gerät bestätigen — *erledigt 2026-09-06*

Erlaubnis, Zustellung im Hintergrund: auf dem iPhone gesehen.

### 4 · Karte — Konzept liegt vor, Design fehlt

Ausgearbeitet in [docs/konzepte/karte.md](konzepte/karte.md). Kurzfassung:

Der Tab existiert, weil der Handoff ihn vorsah; was er zeigen soll, wurde nie
entschieden. Zwei Dinge sind klar:

- **Keine Kacheln.** OpenStreetMap, Mapbox, Apple Maps sind Fremd-Hosts für
  das Telefon ([ADR-0001](adr/0001-ein-hostname-keine-fremd-hosts.md)). Eine
  Karte in Ryadom ist gezeichnet und liegt im Bundle: Ostseeküste als
  Vektor-Silhouette, zwei Punkte, eine Linie. Das Himmelsband ist auch kein Foto.
- **Kein Ortungsdienst.** Die Städte sind bekannt; wo genau ein Telefon
  gerade ist, geht die App nichts an (`permissions-policy: geolocation=()` bleibt).

**Vorschlag:** die Strecke — Luftlinie, die Tag-Nacht-Grenze wie im Band, aber
von oben; am Reisetag der Fortschritt aus dem Countdown, linear, ohne Ortung.
Ein Bild, kein Werkzeug. **Nicht bauen, bevor eine Vorlage da ist** (TD-10).

### 5 · Rückblick-Momente

Sobald Daten da sind: „Heute vor einem Jahr", das erste Wiedersehen als
Marke in der Chronik, die Frage mit den längsten Antworten. Erst ab einem Jahr
Daten; vorher gibt es nichts zurückzublicken.

### 6 · Export — Konzept liegt vor

Ausgearbeitet in [docs/konzepte/export.md](konzepte/export.md). Kurzfassung:

Eine Datei mit allem — beide Seiten, alle Tage, alle Runden, Klartext, in einem
Format, das man in zehn Jahren noch öffnet (JSON *und* eine lesbare
Textfassung). Die Antwort auf [TD-11](tech-debt.md) und auf die Frage, was
passiert, wenn die App einmal nicht mehr betrieben wird. Über „Us" → „Daten";
der Server liefert die eigene Sicht — der Lock-In bleibt.

### 7 · Löschen, mit Tombstones

Erst wenn jemand es braucht ([TD-06](tech-debt.md)). Was gelöscht wird, war
der anderen Seite gezeigt; in einer Chronik zu zweit ist das keine
Selbstverständlichkeit.

## Bewusst nicht gebaut

| Was | Warum nicht |
|---|---|
| Push mit Inhalt oder Namen | Der Lock-In gilt auch auf dem Sperrbildschirm; Namen brauchen im Russischen ein Geschlecht (ADR-0013). |
| Mehr als drei Runden, Runden ohne Lock-In | Dann ist es ein Chat mit Überschrift. Den Chat gibt es schon. |
| Streaks, Zähler mit Druck | Ein Zähler, der bei einem Fehltag auf null fällt, bestraft den falschen Moment. |
| Reaktionen, Likes | Die Antwort ist die Reaktion. |
| Fotos | Größe, Server, Backup, Löschen — verdoppelt die Komplexität für etwas, das jeder Messenger besser kann. Vielleicht einmal *ein* Foto pro Tag, klein. Nicht jetzt. |
| Eigene Fragen mit Datum | Macht aus einem Einfall eine Terminplanung (ADR-0012). |
| Frage des Tages und eigene Fragen als zwei Spiele | Zweimal Lock-In oder einmal keiner. Eine Liste, eure zuerst (ADR-0016). |
| Antworten übersetzen | Nie. Fragen sind kurz und an beide gerichtet; Antworten sind das Intime. |
| Mehr als zwei Nutzer, Konten | Die App ist für zwei; jede Verallgemeinerung kostet die Einfachheit, die sie erreichbar hält. |
| Analytics | Zwei Nutzer, die man fragen kann. |

## Offene Entscheidungen

Für Aydin, in der Reihenfolge, in der sie anstehen:

1. **Karte: das Konzept freigeben** ([docs/konzepte/karte.md](konzepte/karte.md))
   und eine Vorlage zeichnen — oder zeichnen lassen. Vorher kein Code.
2. **Export: Form und Ort** ([docs/konzepte/export.md](konzepte/export.md)) —
   Empfehlung: ein Knopf unter „Us", der eine Textdatei und eine JSON-Datei
   über den Teilen-Dialog liefert.
3. **Maschinelle Übersetzung eigener Fragen** — in ADR-0012 offen gelassen.
   Berührt ADR-0003 (Text verlässt den Server). Empfehlung: erst, wenn eine
   von beiden eine Frage nicht versteht.
4. **Kopie der Backups nach außen** — einmal einrichten, nach
   `deploy/README.md` „Sicherung".
