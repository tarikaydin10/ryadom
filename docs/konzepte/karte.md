# Konzept · Karte

**Stand:** Vorschlag, 2026-09-06. Kein Code, bevor eine Vorlage da ist (TD-10).

## Was der Tab sein soll

Nicht Navigation, nicht Ortung, nicht Kacheln von einem Fremd-Host
([ADR-0001](../adr/0001-ein-hostname-keine-fremd-hosts.md)). Die Karte ist
**das Bild der Strecke** — so wie das Himmelsband das Bild des Tages ist. Ein
Blick, kein Werkzeug. Sie beantwortet drei Fragen, in dieser Reihenfolge:

1. **Wo ist gerade Licht?** Die Tag-Nacht-Grenze über der Ostsee, von oben,
   dieselbe Rechnung wie im Band (SunCalc). Morgens wandert sie von rechts
   (Kaliningrad) nach links (Hamburg); man sieht *warum* die eine Stadt 42
   Minuten früher hell wird.
2. **Wie weit ist es?** Eine Linie, 1.000 km Luftlinie, mit der Zahl. Das
   Band überzeichnet den Boden bewusst; die Karte ist der eine Ort, an dem der
   Maßstab ehrlich ist.
3. **Wann und wohin?** Die Stadt des nächsten Wiedersehens ist markiert;
   am Reisetag läuft ein Punkt die Linie entlang — linear zwischen Abfahrt
   und Ankunft aus dem Countdown, **ohne Ortung**. Das Telefon sagt nie, wo
   es ist; es sagt, wo es sein sollte.

## Was gezeichnet wird

- **Küste der Ostsee als Vektor-Silhouette**, im Bundle, ein SVG von wenigen
  Kilobyte. Von Jütland bis zur Kurischen Nehrung, ohne Grenzen, ohne Namen
  außer den zwei Städten. Wasser hell, Land in der Papierfarbe. Quelle:
  Natural Earth (public domain), auf ~200 Stützpunkte vereinfacht.
- **Zwei Punkte**, Hamburg links, Kaliningrad rechts — wie im Band
  (`BAND_ORDER`, [ADR-0006](../adr/0006-bandausrichtung-und-geometrie.md)).
- **Die Linie** dazwischen, als Großkreis, leicht gebogen.
- **Der Terminator** als weicher Verlauf über der ganzen Fläche, nachts
  `--night`, tags transparent. Die Farben kommen aus `src/sky/colors`, damit
  Band und Karte denselben Himmel zeigen.
- **Kein Wetter** auf der Karte. Das Band hat es; zweimal ist Rauschen.

## Interaktion

Dieselbe Geste wie im Band: über die Karte wischen fährt durch den Tag, der
Terminator wandert, „zurück zu jetzt" springt zurück. Ein Regler, kein zweiter.
Sonst nichts — kein Zoom, kein Pan. Was nicht auf den Bildschirm passt, gehört
nicht auf die Karte.

## Was bewusst nicht

| Was | Warum nicht |
|---|---|
| Kacheln (OSM, Mapbox, Apple) | Fremd-Host; aus Russland unzuverlässig; und ein Foto einer Karte ist nicht das Bild, das die App zeichnet. |
| Ortung | `permissions-policy: geolocation=()` bleibt. Die Städte sind bekannt; wo genau ein Telefon ist, geht die App nichts an. |
| Flugrouten, Zugverbindungen | Werkzeug, nicht Bild. Dafür gibt es andere Apps. |
| Weitere Orte (Urlaub, Familie) | Zwei Punkte sind die App. Ein dritter macht aus dem Bild eine Sammlung. |

## Geometrie

Projektion: einfache äquirektanguläre Abbildung, Mittelbreite 55° N
(cos 55° ≈ 0,57 als Faktor für die Längen). Ausschnitt 8° O bis 22° O,
53° N bis 57,5° N. Bei 402 px Breite sind das ~29 px pro Längengrad; die
Städte liegen ~300 px auseinander, die Linie ist die halbe Breite des
Bildschirms. Der Terminator ist die Menge der Punkte mit Sonnenhöhe 0° —
für jeden Längengrad im Ausschnitt eine Breite, verbunden zum Pfad.

Besitzer der Geometrie wäre `src/sky/engine.ts`, wie beim Band
([ADR-0006](../adr/0006-bandausrichtung-und-geometrie.md)): die Karte rechnet
nicht selbst, sie zeichnet, was die Engine liefert.

## Aufwand und Reihenfolge

1. Vorlage (Aydin): ein Bild, wie es aussehen soll. Ohne die kein Code.
2. Silhouette einmal erzeugen (`scripts/make-coast.mjs`, Natural Earth →
   SVG-Pfad), eingecheckt wie die Icons.
3. Terminator in der Engine (~40 Zeilen), Karte als Komponente (~150 Zeilen),
   Wischgeste vom Band wiederverwendet.
4. Reisetag: Punkt auf der Linie aus dem Countdown. Braucht eine Abfahrts-
   *und* Ankunftszeit — heute gibt es nur ein Datum. Erst, wenn das Datum
   eine Uhrzeit bekommt; bis dahin am Reisetag nur die Stadt markiert.

Ein Wochenende, wenn die Vorlage steht.
