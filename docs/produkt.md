# Produktkonzept und Roadmap

Was Ryadom sein soll, was es heute ist, und was in welcher Reihenfolge als
Nächstes kommt. Das **Warum** der bestehenden Teile steht im [README](../README.md),
das **Wie** in [CLAUDE.md](../CLAUDE.md), die Entscheidungen in [docs/adr](adr/README.md).
Hier steht, wohin es geht — und was bewusst nicht gebaut wird.

Stand: 2026-09-07, der Tag nach dem Livegang — mit der ersten PM-Runde
(unten, „Ausbau vom 2026-09-07“). Am selben Tag kamen Runden, eigene
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
| Karte | Gebaut: Küste im Bundle, Nacht aus der Sonne, Luftlinie, Wiedersehen markiert; Zeit wie im Band gewunden. Seit 2026-09-08 wandert ein Punkt auf der Linie, so weit das Warten ist. |
| Wiedersehen | Karte mit Zahl, Satz und dem Weg dorthin (Linie mit Punkt); ein Tipp windet den Himmel auf die Stunde der Ankunft, egal wie fern; Ankunftszeit optional; nach dem Datum „seit Hamburg: N Tage“. |
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

### 4 · Karte — *erledigt 2026-09-06*

Nach [docs/konzepte/karte.md](konzepte/karte.md), ohne Vorlage. Der Punkt auf
der Linie kam am 2026-09-08: er wandert vom Tag, an dem das Datum gesetzt
wurde, bis zur Stunde der Ankunft — derselbe Bruch wie auf der Wiedersehen-
Karte, aus einer Funktion (`reunionProgress`).

### 5 · Rückblick-Momente — *teilweise erledigt 2026-09-07*

Der Fund („Nашлось снова“) und der Zähler stehen in der Chronik ab der zweiten
Woche ([ADR-0020](adr/0020-zaehler-statt-streak-und-nachtpapier.md)). Was
bleibt, wenn ein Jahr voll ist: „Heute vor einem Jahr“ als eigener Fund, das
erste Wiedersehen als Marke in der Chronik.

### 6 · Export — *erledigt 2026-09-07*

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

## Ausbau vom 2026-09-07

Acht Schritte aus einer Produktrunde, jeder ein Commit, in dieser Reihenfolge
gebaut. Der Filter dafür: Trigger, die Vorfreude, Neugier und Wert erzeugen —
nichts, was drängt.

| # | Was | Trigger | Wo |
|---|---|---|---|
| 1 | Der Reveal: ihre Antwort wird aus den Balken zu Text, die Runde bleibt offen, die neue kommt herein | Variable Belohnung | `AnswerPair`, `Today` |
| 2 | Punkt auf dem Icon, wenn ihre Antwort wartet | Offener Loop | `data/badge.ts`, `push-sw.js` |
| 3 | Ihre ungestellten Fragen versiegelt; Fragen auf Today, an Ort und Stelle | Neugier-Lücke | [ADR-0019](adr/0019-versiegelte-fragen-und-fragen-auf-today.md) |
| 4 | Zähler, der nur wächst; Fund von früher | Besitz, Nostalgie | [ADR-0020](adr/0020-zaehler-statt-streak-und-nachtpapier.md) |
| 5 | Fragen aus dem Himmel; der Tag wird tiefer; Geburtstage, Jahrestag, Vorabend | Kontext, Selbstoffenbarung | [ADR-0018](adr/0018-fragen-aus-dem-himmel-und-tiefe.md) |
| 6 | Ankunftszeit, Reisepunkt auf der Karte, „seit Hamburg: 12 Tage“ | Peak-End | `CountdownCard`, `Map` |
| 7 | Nachtpapier nach der Dämmerung | Kontext | [ADR-0020](adr/0020-zaehler-statt-streak-und-nachtpapier.md) |
| 8 | Export als Text und JSON | Vertrauen | [Konzept](konzepte/export.md) |

Dazu: „Us“ speichert Namen und Daten beim Tippen, ohne Knopf.

**Zweite Runde, 2026-09-08:** Senden ist eine Zusage (kein Bearbeiten mehr,
sobald ihre Antwort offen ist; der Server hält das), ihre Balken zeigen die
Länge der verschlossenen Antwort (eins bis vier, nie den Inhalt), ein Wort
an ihr Telefon von Seite A („Слово для Милы“ unter „Us“), und das
Wiedersehen als Karte mit dem Weg dorthin und dem Sprung im Himmel auf den
Tag. „Посмотри вверх“ (ein Tipp unter dem Mond, der ihr Telefon anspricht)
wurde gebaut und auf Aydins Zweifel hin wieder entfernt — steht unten bei
den offenen Entscheidungen.

**Vor dem Push auf `main`:** `DEPTH_EPOCH` in `src/content/questions.ts`
muss der Tag nach dem Deploy sein ([TD-17](tech-debt.md)). Und: nichts davon
ist auf dem iPhone gesehen — Reveal, Badge, Nachtpapier und das Zeitfeld im
Countdown gelten erst als verifiziert, wenn Aydin sie auf dem Gerät hatte.

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

1. **Export: Form und Ort** ([docs/konzepte/export.md](konzepte/export.md)) —
   Empfehlung: ein Knopf unter „Us", der eine Textdatei und eine JSON-Datei
   über den Teilen-Dialog liefert.
2. **Maschinelle Übersetzung eigener Fragen** — in ADR-0012 offen gelassen.
   Berührt ADR-0003 (Text verlässt den Server). Empfehlung: erst, wenn eine
   von beiden eine Frage nicht versteht.
3. **Kopie der Backups nach außen** — einmal einrichten, nach
   `deploy/README.md` „Sicherung".
4. **Anwesenheits-Glow** — ihr Stadtpunkt im Band leuchtet, wenn sie in den
   letzten Minuten in der App war; keine Uhrzeit, kein „zuletzt online“. Der
   stärkste Trigger aus der Runde vom 2026-09-07 und der einzige, der an
   „nichts, was drängt“ kratzt. Empfehlung: bauen, mit Schalter pro Gerät.
5. **„Посмотри вверх“** — steht der Mond über beiden Städten, ein Tipp, und
   ihr Telefon sagt „Тарик сейчас смотрит на луну. Посмотри и ты.“ Gebaut,
   wieder entfernt (Commit 1495813 hat den Stand zum Zurückholen). Aydin ist
   sich nicht sicher, ob ein Tipp, der das andere Telefon anspricht, in
   diese App gehört.
6. **Wetterfragen über den Server** ([TD-16](tech-debt.md)) — „Regen in
   beiden Städten“, „erster Schnee“. Ein Abend, sobald die Himmelsfragen
   sich bewährt haben.
