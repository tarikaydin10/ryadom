# ADR-0020 · Ein Zähler, der nur wächst; ein Fund von früher; Nachtpapier

**Status:** Gültig
**Datum:** 2026-09-07

## Kontext

`docs/produkt.md` lehnt Streaks ab: ein Zähler, der bei einem Fehltag auf
null fällt, bestraft den falschen Moment. Zugleich nennt es „man schaut
zurück“ als dritte Erfolgsmetrik und setzt Rückblick-Momente erst „ab einem
Jahr Daten“ an. Und: die meisten Antworten entstehen abends, auf einem Blatt
Papier, das so hell ist wie am Mittag.

## Entscheidung

1. **Ein Zähler, der nur wächst.** Oben in der Chronik steht die Zahl der
   Runden, die beide beantwortet haben, und der Tag, seit dem sie zählt. Ein
   verpasster Tag ändert sie um nichts. Auf runden Werten (10, 25, 50, 100,
   200, 365, 500, 1000) steht ein Wort dazu, kein Konfetti.
2. **Ein Fund.** Darunter eine fertige Runde, mindestens eine Woche alt, aus
   dem Datum gewählt (Mulberry32 mit dem Tag als Saat): den ganzen Tag
   dieselbe, auf beiden Telefonen dieselbe, damit man darüber reden kann.
   Ab der zweiten Woche, nicht erst nach einem Jahr — eine Woche reicht, um
   einen Satz vergessen zu haben.
3. **Nachtpapier.** Nach der bürgerlichen Dämmerung (Sonne unter −6°) in der
   Stadt dieses Telefons dimmt das Papier — warm, nicht schwarz. Alles läuft
   über die Tokens am Kopf des Stylesheets; Himmelsband und Karte sind Bilder
   und behalten ihr Licht. Pro Gerät unter „Us“ auf hell festnagelbar; das
   ist eine Frage der Augen, keine gemeinsame Einstellung.

Dazu, ohne eigene Entscheidung, weil sie nur den Kern verstärken: der Reveal
(ihre Antwort wird aus den Balken zu Text, die Runde faltet sich nicht mehr
unter den Augen), der Punkt auf dem App-Icon, wenn ihre Antwort wartet
(`setAppBadge`, kein zweiter Host, keine weitere Erlaubnis), das Danach beim
Wiedersehen („seit Hamburg: 12 Tage“), die Ankunftszeit und der Reisepunkt
auf der Karte, der Export nach [Konzept](../konzepte/export.md).

## Verworfene Alternativen

- **Streak / „Tage in Folge“.** Siehe Kontext. Nicht gebaut, nicht als
  Option.
- **Fund per `Math.random`.** Ein anderes Erinnerungsstück bei jedem Öffnen
  ist ein Spielautomat, und die beiden hätten nie dasselbe vor sich.
- **`prefers-color-scheme`** statt Sonnenstand. Das Telefon weiß, ob der
  Nutzer Dunkelmodus mag, nicht, ob es dunkel ist. Die App weiß das Zweite
  exakt — und das ist ihr Charakter.
- **Anwesenheits-Glow** („sie ist gerade in der App“). Der stärkste Trigger
  auf der Liste und der einzige, der an „nichts, was drängt“ kratzt. Nicht
  gebaut; Aydins Entscheidung, in `produkt.md` als offen notiert.
- **Meilensteine mit Benachrichtigung.** Push bleibt bei den zwei Sätzen aus
  [ADR-0013](0013-push-benachrichtigungen.md).

## Konsequenzen

- `document.documentElement.dataset.night` ist die einzige Stelle, die das
  Papier schaltet (`src/lib/paper.ts`); Farben stehen nur in `:root` und
  `:root[data-night]`.
- Der Zähler ist eine Ableitung aus der Chronik, kein gespeicherter Wert;
  nichts kann ihn falsch zählen, was nicht auch die Chronik falsch zeigte.
