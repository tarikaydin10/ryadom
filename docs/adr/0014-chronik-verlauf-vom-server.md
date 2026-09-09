# ADR-0014 · Chronik: Verlauf vom Server nachladen, Lock-In gilt rückwirkend

**Status:** Gültig
**Datum:** 2026-09-06

## Kontext

Die Chronik ([ADR-0012](0012-runden-statt-einer-frage-pro-tag.md), [TD-10](../tech-debt.md))
las nur, was das jeweilige Gerät gesehen hatte: der Sync holte *heute* und
*gestern*. Ein frisch entsperrtes Gerät — Neuinstallation, zweites Telefon,
Browser am Schreibtisch — kannte keinen Tag davor. Eine Chronik, die auf einem
Telefon zwei Tage und auf dem anderen zwei Monate zeigt, ist keine.

Offen war außerdem, was die Chronik für eine Runde zeigt, an der nur die andere
Seite geschrieben hat. Der Lock-In ([ADR-0003](0003-passphrase-pro-seite-lock-in-serverseitig.md))
ist für *heute* formuliert; für die Vergangenheit hätte man ihn stillschweigend
aufheben können.

## Entscheidung

1. **Ein Verlaufs-Endpoint, cursorbasiert.** `GET /api/days?since=<ms>`
   liefert jeden Tag, an dem seit `since` eine Runde aufging oder eine der
   beiden Seiten schrieb — jeweils durch dieselbe `dayResponse`-Funktion wie
   der Einzelabruf — und die Serverzeit `now`, die der Client als nächsten
   Cursor speichert. Der erste Abruf nach dem Entsperren ist die gesamte
   Geschichte, jeder weitere sind ein paar Tage.
2. **Der Cursor vergleicht mit der Serveruhr.** Jede Antwort bekommt beim
   Schreiben `touchedAt = Date.now()` des Servers, zusätzlich zum `updatedAt`
   des Telefons. Ein Telefon, dessen Uhr nachgeht, könnte sonst „vor" den
   letzten Abruf der Gegenseite schreiben und der Eintrag käme nie an.
3. **Die Chronik liest weiter nur lokal.** `loadHistory()` baut die Liste aus
   IndexedDB; `pullHistory()` im Sync füllt IndexedDB über `applyDay`, denselben
   Pfad wie der Tagesabruf. Kein zweiter Datenpfad, offline zeigt die Chronik,
   was das Gerät hat — nach einem Sync ist das alles.
4. **Der Lock-In gilt rückwirkend.** Eine Runde mit nur der fremden Antwort
   erscheint in der Chronik als „erscheint, wenn du schreibst". Der Klartext
   verlässt den Server für diese Runde nicht.

## Verworfene Alternativen

- **Alle Tage einzeln abrufen.** Ein Request pro Tag, bei einem Jahr 365 —
  auf einer Verbindung, die ohnehin zäh sein kann. Und der Client wüsste
  nicht, ab wann er aufhören soll.
- **Datumsbereich statt Cursor (`?from=&to=`)**, wie in TD-10 skizziert.
  Einfacher zu lesen, aber eine nachträglich geschriebene Antwort oder eine
  spät geöffnete Runde läge außerhalb jedes Bereichs, den der Client für
  fertig hält. Der Cursor über die Änderungszeit erwischt sie.
- **Cursor über `updatedAt` des Clients.** Verworfen wegen der Uhren (Punkt 2).
  Der Fehler wäre selten und still — genau die Sorte, die man nie findet.
- **Lock-In für die Vergangenheit aufheben.** Verlockend, weil eine geschlossene
  Runde in der Chronik traurig aussieht. Aber dann wäre der Lock-In nur eine
  Wartezeit, und die Regel für heute verlöre ihren Sinn. Die richtige Antwort
  ist Nachschreiben ([docs/produkt.md](../produkt.md)), nicht Aufweichen.
- **Server liefert die fertige Chronik.** Doppelter Datenpfad, Chronik ohne
  Netz leer, und der Server müsste die Ansicht kennen.

## Konsequenzen

- Ein frisches Gerät zeigt nach dem ersten Sync die gesamte Geschichte —
  einschließlich der eigenen Antworten vom anderen Gerät.
- Der Sync macht pro Lauf einen Request mehr. Bei zwei Nutzern ist das
  nichts; sollte es je etwas sein, reicht es, den Verlaufs-Abruf auf Start und
  `visibilitychange` zu beschränken.
- Antworten aus der Zeit vor `touchedAt` fallen im Filter auf `updatedAt`
  zurück; beim ersten Abruf mit `since=0` kommen sie ohnehin alle.
- Ein Verlaufs-Abruf öffnet nie eine Runde (`settle` läuft nur beim Lesen
  des heutigen Tages). Ein Sync von gestern verbraucht keine eigene Frage.
- Die Chronik zeigt nur, was *diese* Seite sehen darf. Ein Export hätte
  dieselbe Sicht.
