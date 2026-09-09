# ADR-0019 · Versiegelte Fragen der Gegenseite, Fragen dort, wo der Wunsch entsteht

**Status:** Gültig (ergänzt ADR-0012)
**Datum:** 2026-09-07

## Kontext

[ADR-0012](0012-runden-statt-einer-frage-pro-tag.md) nannte die Überraschung
den halben Wert einer eigenen Frage und lehnte deshalb Fragen mit Datum ab.
Zugleich lieferte `GET /api/questions` „immer vollständig“, und die Liste am
Fuß der Chronik zeigte jede noch ungestellte Frage der Gegenseite im
Klartext — Wochen vor ihrer Runde. Die Überraschung war ein Versprechen ohne
Deckung.

Zweitens: der Weg zum Fragen. Die Zeile „Spросить о своём“ auf Today
wechselte in den Chronik-Tab, unter hundert vergangene Tage. Der Wunsch zu
fragen entsteht unter der Frage, die gerade kam, und wurde auf eine Reise
geschickt.

## Entscheidung

1. **Versiegelt.** Der Server liefert eine noch nicht gestellte Frage der
   Gegenseite als die Tatsache, dass es sie gibt: Autor, Zeiten, Id, `sealed:
   true`, leerer Text. Der Satz kommt mit der Runde, die ihn stellt. Eigene
   Fragen und alles schon Gestellte reisen vollständig. Eine vor dem Stellen
   zurückgezogene Frage bleibt versiegelt — sie wurde nie gesagt.
2. **Angekündigt.** Der Client zeigt sie als „Mila спрашивает — прочитаешь,
   когда придёт очередь“, und Today sagt unter der Frage-Zeile, dass eine
   Frage von ihr wartet. Das ist die ganze Vorfreude und nichts von der
   Überraschung.
3. **An Ort und Stelle.** Das Formular öffnet auf Today unter dem Tag, wie
   Wiedersehen und Nachschreiben dort bearbeitet werden, wo man sie liest.
   Ein Feld; die zweite Sprache hinter einer Zeile. Dasselbe Formular
   (`QuestionForm`) steht weiter am Fuß der Chronik neben der Liste.

## Verworfene Alternativen

- **Versiegeln im Client** (Text da, aber nicht gezeigt). Dieselbe Falle wie
  beim Lock-In: was auf dem Gerät ist, kann man sehen. Der Server hält den
  Text zurück, wie er Antworten zurückhält ([ADR-0003](0003-passphrase-pro-seite-lock-in-serverseitig.md)).
- **Bottom-Sheet für das Formular.** Ein `position: fixed`-Blatt mit einem
  Textfeld ist auf iOS mit Tastatur genau die Konstellation aus
  [ADR-0010](0010-ios-tastatur-viewport-bug.md). Das Formular im Fluss der
  Seite ist das Muster, das die App schon überall benutzt.
- **Anzahl statt Ankündigung** („2 Fragen warten“). Eine Zahl, die man
  senken soll, ist ein Zähler mit Druck. „Eine Frage von Mila wartet“ ist ein
  Satz, den man gern liest.

## Konsequenzen

- `QuestionRecord.sealed` (optional) im lokalen Speicher; `promptFor` zeigt
  eine versiegelte Kopie nie als Frage, sondern die Tabelle als Platzhalter,
  bis die ganze mit der Runde kommt.
- Der Export enthält versiegelte Fragen nicht — ihr Text ist nicht auf dem
  Gerät.
- `Today` braucht keinen `onAsk` mehr; der Chronik-Tab wird nicht mehr von
  außen angesteuert.
