# Technische Schulden

Was bekannt und offen ist. Jeder Eintrag sagt, **woher** die Schuld kommt,
**was** sie riskiert und **wann** sie abgebaut werden sollte — damit niemand sie
zufällig entdeckt und für einen Fehler hält, und damit niemand sie „mal eben"
mit mehr Code zudeckt. Erledigte Einträge streichen, nicht löschen.

Stand: 2026-09-06.

---

## TD-01 · iOS: Layout-Viewport bleibt nach der Tastatur zu kurz — **offen**

**Woher:** WebKit-Verhalten in installierten Web-Apps mit `viewport-fit=cover`;
Details, Messwerte und Quellen in [ADR-0010](adr/0010-ios-tastatur-viewport-bug.md).
**Was es riskiert:** Nach der ersten Texteingabe steht die Tab-Leiste 62 pt zu
hoch, bis die App beendet wird. Sichtbar auf jedem Screen.
**Stand:** Zwei unbestätigte Maßnahmen im Repo (kein `overscroll-behavior:
none`; `healViewport()`). Testplan in ADR-0010.
**Abbau:** Sobald ein Test hält, die *andere* Maßnahme entfernen und erneut
testen. Wenn beide nicht helfen: Trainer vergleichen, iOS-Version notieren.

## TD-02 · PWA übernimmt Safaris Seitenzoom

**Woher:** iOS. Die Home-Screen-App lief mit 85 %, während Safari für die
Domain auf 100 % stand — auch nach Neuinstallation. Vermutlich gilt der
Standardwert „Andere Websites" (Einstellungen → Apps → Safari → Seitenzoom);
nicht belegt.
**Was es riskiert:** Nur noch Schriftgröße; das Layout ist seit ADR-0008 immun.
**Abbau:** Nicht im Code lösbar. Auf dem Gerät prüfen, welcher Wert gilt, und
das Ergebnis in ADR-0008/0010 eintragen.

## TD-03 · Rückstände der Fehlersuche vom 2026-09-05

Drei Dinge, die auf Grund einer falschen oder unbestätigten Hypothese ins Repo
kamen und dort harmlos, aber unbegründet stehen:

| Was | Wo | Warum es noch da ist |
|---|---|---|
| `shrink-to-fit=no` | `index.html` | Seit iOS 13 wirkungslos; kam gegen einen vermuteten Shrink-to-fit, der keiner war. |
| `contain: layout paint` | `.rail__track`, `styles.css` | Kam gegen dieselbe Vermutung. Sachlich sinnvoll (ein 1555-px-Kind soll nie zählen), aber nie als nötig belegt. |
| `healViewport()` | `src/lib/viewport.ts` | Sicherung für TD-01; unbestätigt. Seit 2026-09-06 protokolliert es seine Entscheidungen, siehe TD-05. |

**Abbau:** Mit TD-01. `healViewport()` fliegt, sobald der Fehler ohne sie
nicht auftritt. Die beiden anderen können bleiben, wenn der Kommentar ehrlich
ist — er ist es.

## TD-03a · `launchReset()` im Server — einmalig, danach löschen

**Woher:** Livegang am 2026-09-06 ohne Serverzugang. Der Server leert beim
ersten Start mit diesem Stand alle Tage, behält die Einstellungen, schreibt
vorher `answers.before-launch-2026-09-06.json` daneben und merkt sich den
Marker `launchReset` im Store. Jeder weitere Start ist ein No-op.
**Was es riskiert:** Nichts mehr, sobald es einmal lief — aber der Block ist
toter Code mit einem gefährlichen Namen.
**Abbau:** Sobald der Serverlog `launch reset: removed …` gezeigt hat (oder
`/api/days/2026-09-05` leer antwortet): Block und Aufruf entfernen. Der
Marker in `answers.json` darf bleiben.

## TD-04 · Keine automatisierten Tests

**Woher:** Projektgröße. Es gibt `tsc`, den Build und den Deploy-Health-Check
(200/401). Die CSP ist „gegen die laufende App getestet" — von Hand.
**Was es riskiert:** Regressionen in Sync-Logik (`applyDay`, Outbox-Retry,
`last write wins`), Tagesgrenzen (`dateKey` um Mitternacht, Zeitzonenwechsel)
und Server-Auth fallen erst auf dem Telefon auf.
**Abbau:** Sinnvoll wären wenige reine Unit-Tests ohne DOM: `src/lib/day.ts`,
`server/index.mjs` (`authenticate`, `dayResponse`, Rate-Limit). Layout und
iOS-Verhalten sind damit nicht testbar — das bleibt Gerätearbeit.

## TD-05 · Keine eingebaute Gerätediagnose — **erledigt 2026-09-06**

**Woher:** Am 2026-09-05 wurde ein Wegwerf-Overlay (`ViewportDebug`) eingebaut,
deployt, abgelesen, entfernt. Ohne ein solches Werkzeug sind iOS-Fehler von
außen nur zu raten — und geraten wurde tagelang.
**Was es riskierte:** Beim nächsten Gerätefehler beginnt das Raten von vorn.
Genau das trat am 2026-09-06 ein: die Leiste stand wieder zu hoch, diesmal um
grob das Dreifache der 62 pt aus ADR-0010, und es gab nichts abzulesen.
**Erledigt durch:** `Diagnostics` unter „Us", sichtbar nach fünf Tipp auf die
Überschrift: die Messwerte aus ADR-0010 plus ein Protokoll der letzten zwölf
`healViewport()`-Entscheidungen (ausgelöst? Tastatur oben? zu kurz? geheilt?)
und ein Kopieren-Knopf. Liest nur, ändert nichts.
**Bleibt offen:** ADR-0010 mit echten Zahlen abschließen — dann fliegt entweder
`healViewport()` oder die Diagnose mit ihm.

## TD-06 · Sync kennt kein Löschen

**Woher:** [ADR-0002](adr/0002-lokal-zuerst-outbox-sync.md). `applyDay`
übernimmt nur, was der Server *hat*; das Protokoll hat keine Tombstones.
**Was es riskiert:** Ein serverseitiger Reset (wie vor dem Livegang) lässt
lokale Kopien auf beiden Telefonen stehen. Eine später gelöschte Antwort käme
aus einer Outbox sogar zurück.
**Abbau:** Erst, wenn Löschen ein Produkt-Feature wird. Bis dahin: Reset =
`deploy/reset-answers.sh` auf dem Server **und** PWA auf beiden Geräten neu
installieren (oder Origin wechseln — ein Umzug auf `ryadom.net` erledigt das).

## TD-07 · Geteilte Passphrase als Fallback

**Woher:** [ADR-0003](adr/0003-passphrase-pro-seite-lock-in-serverseitig.md).
`PAIR_SECRET` für beide Seiten funktioniert noch; dann entscheidet der Header
`x-pair-member`, und der Lock-In ist nur behauptet. Der Server warnt beim Start.
**Was es riskiert:** Ein Betrieb im Fallback-Modus, ohne dass es jemand merkt.
**Abbau:** Prüfen, ob `/etc/ryadom.env` auf dem VPS `PAIR_SECRET_A` **und**
`PAIR_SECRET_B` setzt. Wenn ja: Fallback und `MEMBERS`-Header-Pfad aus
`authenticate()` entfernen.

## TD-08 · Klartext auf Gerät und Server

**Woher:** Bewusst (README „Absicherung"). Schloss, keine Verschlüsselung.
**Was es riskiert:** Wer den Server oder ein entsperrtes Telefon hat, liest.
**Abbau:** Ende-zu-Ende-Verschlüsselung wäre der nächste sinnvolle Schritt,
wenn der Server nicht mehr vertrauenswürdig sein soll. Kein aktueller Bedarf.

## TD-09 · `carry-over.ts` — die Umbenennung Rjadom → Ryadom

**Woher:** Migration der `localStorage`-/IndexedDB-Schlüssel beim Rename. Der
eigene Kommentar: „meant to be deleted eventually". Läuft bei jedem Start
synchron vor dem ersten Render.
**Was es riskiert:** Wenig — ein paar Storage-Reads pro Start.
**Abbau:** Nach dem Umzug auf `ryadom.net`. Neuer Origin = leerer Speicher =
nichts mehr zu tragen. Dann Datei und Aufruf in `main.tsx` löschen.

## TD-10 · Karte und Chronik waren Platzhalter — **erledigt 2026-09-06**

**Woher:** Keine Design-Vorlage (README „Was bewusst offen ist").
**Was es riskiert:** ~~Die Karte führt weiterhin ins Leere.~~
**Chronik:** Der Tab zeigte einen Tag lang nur die eigenen Fragen unter einer
Überschrift, die einen Rückblick versprach — Tarik ist prompt darüber
gestolpert („warum steht da *nichts geschrieben*, wir haben doch geantwortet").
Jetzt zeigt er, was er heißt: die vergangenen Tage mit Frage und beiden
Antworten, die eigenen Fragen als Abschnitt darunter, und von „Heute" führt eine
Zeile dorthin. ~~Offen bleibt, dass er nur zeigt, was dieses Gerät gesehen
hat.~~ Seit [ADR-0014](adr/0014-chronik-verlauf-vom-server.md) holt der Sync
den Verlauf cursorbasiert nach (`GET /api/days?since=…`); ein frisches Gerät
zeigt nach dem ersten Sync alles.
**Karte:** Nach Konzept ([docs/konzepte/karte.md](konzepte/karte.md)) gebaut,
ohne Vorlage — Aydins Entscheidung vom 2026-09-06. Küste aus Natural Earth
(`scripts/make-coast.mjs`), Nacht aus SunCalc, dieselbe Wischgeste wie das
Band. Was bleibt: der Reisetag-Punkt auf der Linie braucht eine Uhrzeit im
Countdown, die es nicht gibt; bis dahin nur die Stadt markiert.

## TD-11 · Backup der Serverdaten ist nicht Teil des Repos — **erledigt 2026-09-06**

**Woher:** [ADR-0004](adr/0004-server-ohne-abhaengigkeiten-deploy-per-rsync.md).
`/var/lib/ryadom/answers.json` ist eine Datei; atomar geschrieben, aber ohne
beschriebene Sicherung. Ob der VPS Snapshots macht, ist hier nicht bekannt.
**Was es riskiert:** Ein kaputtes Dateisystem oder ein `rm` löscht die
gemeinsame Geschichte der beiden.
**Abbau:** ~~Auf dem Server prüfen.~~ Der Server selbst legt einmal am Tag
eine Kopie nach `DATA_DIR/backups/answers-JJJJ-MM-TT.json` und behält dreißig
(`backupDaily` in `server/index.mjs`) — kein Cron, nichts einzurichten. Das
deckt den Fehler (ein `rm`, ein schlechtes Skript); die Platte deckt nur ein
Snapshot des VPS, siehe `deploy/README.md` „Sicherung". Ein Export für die
beiden ist als Konzept beschrieben ([docs/konzepte/export.md](konzepte/export.md)).

## TD-12 · Querformat ungetestet

**Woher:** Manifest sagt `orientation: portrait`; iOS ignoriert das für
Home-Screen-Apps. `--safe-left/right` sind vorbereitet, wurden aber nie im
Querformat gesehen.
**Was es riskiert:** Ein gedrehtes Telefon zeigt womöglich ein Layout, das
niemand entworfen hat.
**Abbau:** Einmal drehen und schauen. Vermutlich reicht ein `min-width` für
das Band — oder gar nichts.

## TD-13 · `Lock.tsx` hat einen eigenen `t()`-Helfer

**Woher:** Der Sperrbildschirm rendert mit eigener Sprachwahl (öffnet
Russisch), bevor die Wahl im Provider steht.
**Was es riskiert:** Zwei Übersetzungspfade, die auseinanderlaufen können.
**Abbau:** Beim nächsten Umbau des Lock-Screens den Provider eine
`locale`-Überschreibung annehmen lassen; klein, kein Druck.

## TD-14 · Fragentabelle ist für Runden zu klein — **erledigt 2026-09-06**

**Woher:** [ADR-0012](adr/0012-runden-statt-einer-frage-pro-tag.md). 56
gebündelte Fragen reichten bei einer Frage pro Tag für knapp zwei Monate; bei
drei Runden am Tag ist die Tabelle in neunzehn Tagen einmal durch.
**Was es riskiert:** Wiederholungen, und zwar früh genug, dass sie auffallen —
was den Eindruck macht, die App habe nichts mehr zu fragen.
**Abbau:** ~~Fragen schreiben, nicht Code.~~ 200 Fragen seit 2026-09-06. Die
ersten 56 bleiben in ihrer Reihenfolge, weil jeder Tag vor dem Stichtag
2026-09-07 nach der alten Formel aus ihnen gefragt wurde; ab dem Stichtag
laufen drei Runden am Tag durch alle 200 mit Schrittweite 37 — 66 Tage ohne
Wiederholung. Wer die Tabelle erneut vergrößert, hängt **hinten an** und zieht
den Stichtag in `questionFor` nach; nie mittendrin einfügen, nie umsortieren.

## TD-15 · Eine verpasste Runde bleibt für immer geschlossen — **erledigt 2026-09-06**

**Woher:** Today nimmt nur Antworten für *heute*; die Chronik zeigt eine Runde,
an der nur die andere Seite schrieb, als „erscheint, wenn du schreibst" — für
immer, weil es keinen Weg gibt, nachträglich zu schreiben.
**Was es riskiert:** Die andere Seite hat ins Leere geschrieben, und die
Chronik zeigt das als Lücke, die niemand mehr schließen kann. Mit bis zu drei
Runden am Tag passiert das öfter als mit einer.
**Abbau:** [ADR-0015](adr/0015-nachschreiben-ohne-frist-ohne-runde.md): in
der Chronik nachschreiben, ohne Frist, ohne neue Runde, mit „nachgetragen am".
