# ADR-0013 · Push-Benachrichtigungen, serverseitig und ohne Inhalt

**Status:** Gültig
**Datum:** 2026-09-06

## Kontext

[ADR-0001](0001-ein-hostname-keine-fremd-hosts.md) und CLAUDE.md nannten „kein
Push" in einer Reihe mit „kein CDN, kein Analytics": Dinge, die einen zweiten
Host in die App holen und damit die Erreichbarkeit aus Russland gefährden.

Mit den Runden ([ADR-0012](0012-runden-statt-einer-frage-pro-tag.md)) ist daraus
ein echtes Loch geworden. Die nächste Frage geht auf, sobald **beide**
geantwortet haben — und niemand erfährt davon, außer er öffnet die App und
schaut nach. Der Moment, der die App ausmacht („sie hat geantwortet"), war der
einzige, den sie nicht mitteilen konnte.

Technische Lage auf dem Zielgerät: iOS kann Web-Push seit 16.4, aber **nur** für
Apps auf dem Home-Screen. Die Zustellung läuft über die Verbindung, die das
Telefon ohnehin zu Apple hält — dieselbe wie für jede andere Mitteilung.

## Entscheidung

Push ja, unter drei Bedingungen:

1. **Der ausgehende Anruf gehört dem Server.** Das Telefon spricht weiter mit
   genau einem Hostnamen; der Server spricht mit dem Push-Dienst, den das
   Telefon selbst benannt hat. ADR-0001 bleibt damit unberührt — es ging nie um
   den Server, sondern um den Client.
2. **Kein Inhalt.** Eine Benachrichtigung enthält nie, was jemand geschrieben
   hat. Der Lock-In ist das Versprechen der App; eine Mitteilung, die ihre
   Antwort auf seinem Sperrbildschirm zeigt, bevor er die eigene geschrieben
   hat, wäre der Weg daran vorbei. Es gibt genau zwei Sätze: „Ответ пришёл —
   твоя очередь." und „Ответ открыт, и есть новый вопрос."
3. **Keine neue Abhängigkeit.** VAPID (RFC 8292) und die aes128gcm-Verschlüsse­
   lung (RFC 8291) stehen ausgeschrieben in `server/push.mjs`, gebaut aus
   `node:crypto`. ADR-0004 bleibt gültig: der Server hat weiterhin nichts zu
   installieren und nichts zu aktualisieren.

Der Schlüssel des Paares wird beim ersten Gebrauch erzeugt und **im Store**
abgelegt, nicht in einer Umgebungsvariablen. Einschalten ist damit ein Knopf
unter „Us" und keine SSH-Sitzung.

## Verworfene Alternativen

- **Push ohne Payload, Text im Service Worker.** Halbiert die Krypto, aber der
  Worker müsste den Text entweder fest verdrahten (kein Sprachwechsel, keine
  Unterscheidung der beiden Fälle) oder ihn beim Server abholen — wofür er die
  Passphrase bräuchte, die heute nur im `localStorage` liegt. Verschlüsselter
  Payload ist zugleich privater: Apple sieht Chiffrat, kein Ereignis.
- **Namen in der Mitteilung** („Мила ответила"). Schöner, aber russische Verben
  richten sich nach dem Geschlecht, und derselbe Build läuft auf beiden
  Telefonen — dieselbe Falle wie bei den Statuszeilen des Himmels. Dazu käme die
  Deklination des Namens. Namenlos und geschlechtslos ist bei zwei Menschen kein
  Verlust.
- **Bei jeder Änderung benachrichtigen.** Nur die *erste* Antwort auf eine Runde
  ist eine Nachricht. Ein Telefon, das bei jeder Korrektur summt, wird
  stummgeschaltet.
- **Eigenen Push-Dienst betreiben.** Gibt es nicht: die Zustellung auf iOS geht
  über Apple, das ist keine Wahl, sondern die Plattform.
- **VAPID-Schlüssel als Umgebungsvariable.** Ein Schritt auf dem VPS, der genau
  deshalb nie passiert. Im Store liegt er neben den Antworten, die ohnehin das
  Schützenswerte sind (TD-08).

## Konsequenzen

- Der Server macht zum ersten Mal einen **ausgehenden** Anruf. Er ist nicht
  abgewartet, hat zehn Sekunden Zeitlimit, und ein Fehlschlag ist folgenlos —
  die App verhält sich dann wie vorher.
- `server/` besteht jetzt aus zwei Dateien. Der Deploy-Workflow kopiert
  `server/*.mjs` statt nur `index.mjs`; wer eine dritte Datei anlegt, muss dort
  nichts mehr ändern.
- Der Service Worker bekommt zwei Listener über `workbox.importScripts`
  (`public/push-sw.js`). Die Caching-Strategie aus
  [ADR-0007](0007-pwa-aktualisierung.md) bleibt unangetastet.
- Ein Abo, das der Push-Dienst mit 404/410 beantwortet, wird gelöscht. Andere
  Fehler werden ignoriert, nicht wiederholt: die Nachricht war ein Hinweis, kein
  Auftrag.
- Erlaubnis erteilt nur ein Fingertipp, und nur in der installierten App. Im
  Browser-Tab bleibt der Schalter aus und sagt, warum.
- Was hier **nicht** entschieden ist: Benachrichtigungen für eigene Fragen oder
  für den Countdown. Erst, wenn jemand sie vermisst.
