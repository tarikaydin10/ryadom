# ADR-0021 · Das Nachwort: ein Zeichen und Notizen an der fertigen Runde

**Status:** Gültig
**Datum:** 2026-09-12

## Kontext

Bis hierher konnte man auf eine Antwort nicht antworten. Man las, was die
andere Seite geschrieben hatte, die Runde faltete sich zusammen, und damit war
der Satz erledigt — es gab keinen Ort für „das wusste ich nicht von dir“.
Bisher war die Antwort selbst die Reaktion; das stand so in
[docs/produkt.md](../produkt.md) unter „bewusst nicht gebaut“ („Reaktionen,
Likes — die Antwort ist die Reaktion“).

Das hielt nicht. Die nächste Frage kommt in wenigen Stunden und handelt von
etwas anderem; was gestern Abend gesagt wurde, blieb unbeantwortet, obwohl
beide es gelesen hatten. Aydin hat genau das verlangt: „auf die Antwort des
anderen reagieren können, wie bei WhatsApp auf eine Nachricht — und ggf.
darunter zusammen kommentieren.“ Mit der Auflage, die diese App trägt: es
muss die UX erweitern und darf sie nicht überladen.

Die Gegenkraft steht in derselben Datei: „Mehr als drei Runden, Runden ohne
Lock-In → dann ist es ein Chat mit Überschrift. Den Chat gibt es schon.“ Ein
Kommentarbereich ist genau die Tür zu diesem Chat.

## Entscheidung

Ein **Nachwort** je Runde. Es gibt es nur an einer Runde, die **beide
beantwortet haben**.

1. **Ein Zeichen je Person und Runde.** Sechs feste Emojis (❤️ 🥹 😂 😮 🤗 🙏),
   kein Emoji-Tastenfeld. Es sitzt an der Karte, um die es geht — deines unter
   ihrer Antwort, ihres unter deiner —, ist änderbar, und ein zweiter Tipp auf
   dasselbe nimmt es zurück.
2. **Notizen an der Frage, nicht an einer Antwort.** Darunter ein Faden kurzer
   Sätze (280 Zeichen), beiden sofort sichtbar, in der Reihenfolge, in der sie
   geschrieben wurden. Er hängt an der Runde: was hier gesagt wird, gilt fast
   immer beiden Antworten zugleich. Geschrieben wird einmal — kein Ändern,
   kein Löschen, wie bei einer abgeschickten Antwort auch.
3. **Zugeklappt, außer es ist etwas Neues da.** Auf Today ist es eine Zeile
   („Sag etwas dazu“ / „3 Notizen“), in der Chronik dieselbe Zeile leise
   gesetzt. Ungelesenes von der Gegenseite klappt den Faden von selbst auf und
   setzt bis dahin einen Punkt an die Zeile. Der Lesestand (`notesSeenAt`)
   steht im Rundensatz, bleibt auf dem Gerät und wird nie gesendet: es gibt
   keine Lesebestätigung.
4. **Der Lock-In gilt weiter, serverseitig.** Vor der zweiten Antwort steht im
   `talk`-Feld der Antwort nichts — nicht „leer“, sondern gar nichts —, und
   `PUT /api/days/:date/reaction` wie `/note` antworten mit
   `409 round not closed`. Ein Zeichen auf einer verschlossenen Antwort wäre
   eine Aussage über sie.
5. **Push wie gehabt: inhaltsleer.** Zwei neue Sätze („Ein Zeichen an einer
   der Antworten“, „Ein Wort unter einer der Antworten“), ohne Namen, ohne
   Runde, ohne Text ([ADR-0013](0013-push-benachrichtigungen.md)). Ein
   gewechseltes Zeichen meldet nichts — nur ein erstes.

## Verworfene Alternativen

- **Reaktionen an der offenen Runde.** Hätte die halbe Runde zu einem Kanal
  gemacht: „😂“ auf eine Antwort, die man noch nicht lesen darf, sagt etwas
  über sie. Der Server verweigert es, damit es keine Frage der Oberfläche ist.
- **Freies Emoji-Tastenfeld.** Ein Tipp wird zur Suche, und die Zeile am Fuß
  der Karte müsste jede Breite aushalten. Sechs passen in zwei Reihen zu dritt
  in eine halbe Kartenbreite.
- **Ein Faden je Antwort** (zwei Fäden je Runde). Doppelte Struktur für einen
  Unterschied, den beim Schreiben niemand macht — man antwortet auf den Abend,
  nicht auf einen der beiden Absätze. Auf Aydins Rückfrage hin so entschieden.
- **Beliebig viele Notizen, kein Deckel.** 40 je Runde stehen im Server, nicht
  als Erziehungsmaßnahme, sondern damit ein Fehler die Datei nicht unbegrenzt
  wachsen lässt. Wer 40 Sätze zu einer Frage hat, hat ein Gespräch — und dafür
  gibt es den Messenger.
- **Der Zähler in der Chronik zählt Notizen mit.** Nein: er zählt Runden, die
  beide beantwortet haben ([ADR-0020](0020-zaehler-statt-streak-und-nachtpapier.md)).
  Das Nachwort ist Zugabe, keine Leistung.
- **Der Punkt auf dem App-Icon für neue Notizen.** Das Abzeichen bedeutet
  genau eine Sache: „ihre Antwort wartet hinter deiner“ (`src/data/badge.ts`).
  Eine zweite Bedeutung macht daraus eine Zahl, die nörgelt.
- **Notizen übersetzen.** Nie, wie bei Antworten auch
  ([ADR-0011](0011-sprache-russisch-englisch.md)).

## Konsequenzen

- Der Rundensatz trägt das Nachwort (`reactions`, `notes`, `notesSeenAt`).
  `putRound` ersetzt einen Rundensatz deshalb nicht mehr blind, sondern führt
  zusammen: das eigene Zeichen nach seiner Uhr, ihres immer vom Server, die
  Notizen als Vereinigung über die Id. Ohne das nähme eine Antwort des Servers,
  die zwischen Tipp und Outbox-Lauf eintrifft, das eben gesetzte Zeichen wieder
  von der Karte.
- Ein zurückgenommenes Zeichen reist als leerer String **mit** seiner Uhr.
  Sonst könnte ein zweites Gerät, das noch das alte hält, nicht entscheiden,
  was später war — und zeigte es für immer.
- Die Outbox kennt zwei neue Sorten. Ein zweiter Tipp auf dieselbe Runde
  ersetzt den ersten in der Schlange; eine Notiz nicht — die trägt eine Id vom
  Gerät, damit ein Wiederholungsversuch denselben Satz einmal ablegt.
- `daysChangedSince` zählt Zeichen und Notizen als Änderung des Tages, sonst
  erreichte ein Herz auf einer Runde von letztem Dienstag das andere Telefon
  nur zufällig.
- Der Export trägt beides mit (Text und JSON). Es gehört zum Geschriebenen.
- Auf einer offenen Runde ändert sich an der Seite **nichts** — kein Element,
  keine Zeile. Das ist die Bedingung, unter der das hier gebaut wurde.
