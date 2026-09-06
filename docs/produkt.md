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
| Eigene Fragen | Pool auf dem Server, älteste zuerst, optional mit Übersetzung. |
| Push | Serverseitig, ohne Inhalt, nur in der installierten App. Auf dem Gerät noch nicht bestätigt. |
| Chronik | Vergangene Tage mit allen Runden; Verlauf wird vollständig nachgeladen (ADR-0014). |
| Countdown | Fertig, Datum wird geteilt. |
| Karte | Platzhalter. Kein Design, kein Konzept ohne Fremd-Host (s. u.). |
| iOS | Zwei offene Punkte ([TD-01](tech-debt.md), [TD-02](tech-debt.md)); Diagnose jetzt unter „Us". |

## Roadmap

In Reihenfolge. Jeder Schritt ist klein genug für einen Deploy und trägt für
sich. Nummern sind Prioritäten, keine Termine.

### 1 · Fragentabelle vergrößern — *dringend, seit es Runden gibt*

Bei drei Runden am Tag sind 56 Fragen in neunzehn Tagen einmal durch
([TD-14](tech-debt.md)). Das fällt auf, und die Chronik zeigt es.
Ziel: 150 bis 200 Fragen, zweisprachig, geschlechtsneutral wie bisher
(`сказал(а)`), mit einigen, die nur in Ferne Sinn ergeben — die sind die
besten. Schreiben, nicht programmieren.

**Vorsicht:** `questionFor` rechnet `Tag mod Anzahl`. Fragen anhängen
verschiebt die Zuordnung *aller* Tage — Today zeigt nach dem Deploy eine
andere Frage als am Vortag. Die Chronik ist immun (sie liest die gespeicherte
`questionId`), Today nicht. Deshalb den Katalog **einmal** auf Zielgröße
bringen und die Zuordnung an einen Stichtag binden (`Tage seit Stichtag mod n`
für Tage ab dem Stichtag, alte Formel davor), damit Vergangenes sich nicht ändert.

### 2 · Nachschreiben

Heute kann nur *heute* beantwortet werden. Wer eine Runde verpasst, sieht in
der Chronik für immer „erscheint, wenn du schreibst" — und die andere Seite hat
ins Leere geschrieben ([TD-15](tech-debt.md)). Das ist der eine Ort, an dem
die App hart ist, ohne dass die Härte etwas schützt.

**Vorschlag:** Eine eigene leere Runde in der Chronik ist antippbar und öffnet
denselben Editor wie auf Today. Die Antwort trägt das Datum der Runde;
der Lock-In öffnet sich wie sonst. Kein Umbau am Protokoll.
**Offen:** Darf eine nachgetragene Antwort noch eine Runde öffnen? Empfehlung:
nein — `settle` bleibt auf heute beschränkt, der Tag ist vorbei; nachschreiben
heißt lesen dürfen, nicht weiterspielen. Und: Frist oder keine? Empfehlung:
**keine**, aber die Chronik zeigt „nachgetragen am …".

### 3 · Push auf dem Gerät bestätigen

Gebaut, aber wie alles iOS-Spezifische erst dann verifiziert, wenn Aydin es auf
dem Telefon gesehen hat: Erlaubnis in der Home-Screen-App, Zustellung nach
Stunden im Hintergrund, Verhalten bei abgelaufenem Abo. Kein Feature, aber die
Voraussetzung für 4.

### 4 · Karte — braucht zuerst ein Konzept, dann ein Design

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

### 6 · Export

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
| Antworten übersetzen | Nie. Fragen sind kurz und an beide gerichtet; Antworten sind das Intime. |
| Mehr als zwei Nutzer, Konten | Die App ist für zwei; jede Verallgemeinerung kostet die Einfachheit, die sie erreichbar hält. |
| Analytics | Zwei Nutzer, die man fragen kann. |

## Offene Entscheidungen

Für Aydin, in der Reihenfolge, in der sie anstehen:

1. **Stichtag für den großen Fragenkatalog** (Roadmap 1) — der Tag des
   Deploys, damit sich Vergangenes nicht ändert.
2. **Nachschreiben: Frist ja/nein, Runde öffnen ja/nein** (Roadmap 2;
   Empfehlung: keine Frist, keine Runde).
3. **Maschinelle Übersetzung eigener Fragen** — in ADR-0012 offen gelassen.
   Berührt ADR-0003 (Text verlässt den Server). Empfehlung: erst, wenn eine
   von beiden eine Frage nicht versteht; die Übersetzung durch den Autor
   reicht vermutlich.
4. **Was die Karte zeigt** — Vorlage nötig, bevor Code entsteht.
5. **Backup auf dem VPS** ([TD-11](tech-debt.md)) — unabhängig von allem hier,
   aber seit heute mit echten Daten dringlicher als jede Funktion.
