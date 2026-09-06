# ADR-0015 · Nachschreiben: ohne Frist, ohne neue Runde

**Status:** Gültig
**Datum:** 2026-09-06

## Kontext

Today nahm nur Antworten für *heute*. Eine Runde, an der nur die andere Seite
schrieb, stand in der Chronik für immer als „erscheint, wenn du schreibst" —
und die andere Seite hatte ins Leere geschrieben ([TD-15](../tech-debt.md)).
Mit bis zu drei Runden am Tag ([ADR-0012](0012-runden-statt-einer-frage-pro-tag.md))
passiert das öfter als mit einer. Das war der eine Ort, an dem die App hart
war, ohne dass die Härte etwas schützte.

Zwei Fragen standen offen: ob eine Frist gelten soll, und ob eine nachgetragene
Antwort noch eine Runde öffnen darf.

## Entscheidung

1. **Keine Frist.** Eine eigene fehlende Antwort in der Chronik ist eine
   antippbare Zeile, die denselben Editor öffnet wie Today. Die Antwort trägt
   das Datum der Runde. Der Lock-In öffnet sich wie sonst: ihr Text kommt mit
   dem nächsten Sync.
2. **Keine neue Runde.** Der Server öffnet Runden nur noch, wenn das Datum
   *heute* ist (`openRounds` hinter `pairDay()`). Nachschreiben kauft das
   Lesen, nicht das Weiterspielen — eine Runde, die an einem Tag aufgeht, den
   niemand mehr lebt, würde eine eigene Frage in einen leeren Raum stellen.
3. **Ehrlich über das Wann.** Unter einer Antwort, deren Tag nicht der Tag
   der Frage ist, steht „nachgetragen am …". Für beide Seiten, denn beide
   können es tun. Kein Vorwurf, eine Angabe.
4. **Kein Push** für nachgetragene Antworten (bestand schon: `notify` nur für
   heute). Die andere Seite sieht es in der Chronik.

## Verworfene Alternativen

- **Frist von sieben Tagen.** Hätte eine gewisse Verbindlichkeit gebracht,
  aber „nichts, was drängt" ([docs/produkt.md](../produkt.md)) wiegt schwerer,
  und eine Chronik mit Löchern, die niemand mehr schließen kann, ist genau
  das, was die Chronik nicht sein soll.
- **Nachgetragene Antwort öffnet die nächste Runde.** Verworfen: der eigene
  Fragenpool würde für vergangene Tage verbraucht, und eine Runde, die beide
  Tage später noch beantworten müssten, macht aus dem Rückblick eine Aufgabe.
- **Nachschreiben auf Today (Wischen in den Vortag).** Das Band wischt durch
  die Zeit, aber Today ist *heute*; die Chronik ist der Ort für Vergangenes.
- **Nur für gesperrte Runden erlauben.** Auch eine Runde, an der niemand
  außer der Gegenseite … nein: eine Runde, die *niemand* beantwortet hat, ist
  nicht in der Chronik (leerer Stuhl). Alle Runden, die dort stehen, sind
  nachschreibbar — auch die, an denen nur man selbst fehlt.

## Konsequenzen

- `PUT /api/days/:date/answer` wird für vergangene Tage benutzt; das konnte
  es schon. Runden öffnen sich dort nicht mehr, auch nicht durch `settle`.
- Der Verlaufs-Cursor ([ADR-0014](0014-chronik-verlauf-vom-server.md)) erwischt
  die nachgetragene Antwort auf dem anderen Telefon, weil er über die
  Änderungszeit läuft und nicht über das Datum.
- Die Chronik ist nicht mehr nur ein Rückblick; sie ist die eine Stelle, an
  der man in die Vergangenheit schreibt. Ihr Stylesheet-Kommentar sagt das.
