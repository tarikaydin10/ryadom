# Konzept · Export

**Stand:** Vorschlag, 2026-09-06.

## Warum

Die Antworten sind das Wertvollste an der App, und sie liegen in einer Datei
auf einem gemieteten Server. Das Backup ([TD-11](../tech-debt.md)) schützt vor
dem Fehler; der Export schützt vor dem Ende: dem Tag, an dem die App nicht
mehr betrieben wird, der Domain, die ausläuft, dem Hoster, der schließt. Was
ihr euch geschrieben habt, soll in zehn Jahren noch lesbar sein — ohne Ryadom.

## Was herauskommt

Zwei Dateien, auf einen Knopf unter „Us" → „Daten":

1. **`ryadom-<datum>.txt`** — die Chronik als Text. Ein Tag nach dem
   anderen, älteste zuerst, jede Runde mit Frage und beiden Antworten, die
   Namen davor, „nachgetragen am" dahinter, wo es gilt. Die eigenen Fragen
   am Ende. Kein Format, das jemand erklären muss: Datum, Frage, zwei
   Absätze. Das ist die Datei, die man in zehn Jahren öffnet.
2. **`ryadom-<datum>.json`** — dieselben Daten maschinenlesbar, in der Form
   der `DayResponse` plus `questions` und `settings`. Das ist die Datei, aus
   der man die App wieder aufsetzt.

## Die eine Regel

**Der Export hat dieselbe Sicht wie die Chronik.** Der Server liefert ihn
(`GET /api/export`), pro Seite, durch `dayResponse` — eine Runde, die man
selbst nie beantwortet hat, enthält auch im Export nicht ihren Text. Der
Lock-In ([ADR-0003](../adr/0003-passphrase-pro-seite-lock-in-serverseitig.md))
hat keine Hintertür, auch keine, die „Export" heißt. Wer alles lesen will,
schreibt nach ([ADR-0015](../adr/0015-nachschreiben-ohne-frist-ohne-runde.md)).

## Wie die Datei aufs Telefon kommt

Eine PWA auf iOS kann keine Datei „herunterladen" wie ein Desktop-Browser.
Der Weg ist der Teilen-Dialog: `navigator.share({ files })` — Safari
unterstützt ihn für Dateien seit iOS 15. Von dort nach „Dateien", in die
Notizen, per AirDrop, per Mail. Fallback, wo `share` fehlt (Desktop): ein
Blob-Link. Beides ohne Fremd-Host.

## Was bewusst nicht

| Was | Warum nicht |
|---|---|
| Automatischer Export in eine Cloud | Fremd-Host, und die Antworten würden einen dritten Ort bekommen, den niemand überblickt. Der Export ist eine Handlung, kein Abo. |
| Import | Erst, wenn die App einmal umzieht. Die JSON-Form ist so gewählt, dass ein Import dann trivial ist (`store.days` in derselben Form). |
| PDF | Ein Layout, das in zehn Jahren jemand pflegen müsste. Text ist das Format, das nicht altert. |
| Export der Gegenseite | Siehe die eine Regel. |

## Aufwand

Server: eine Route, ~30 Zeilen (Text rendern, JSON bündeln). Client: ein
Knopf, `navigator.share`, ~40 Zeilen. Ein Abend.
