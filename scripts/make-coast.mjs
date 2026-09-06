/**
 * Draws the map's coastline once, from Natural Earth, into src/map/coast.ts.
 *
 * The map shows no tiles from anybody's server (ADR-0001): the land is a
 * vector silhouette that ships with the app. This script cuts the Baltic out
 * of Natural Earth's 10 m land polygons (public domain), projects it the way
 * `src/map/geometry.ts` does, simplifies it to what a phone can tell apart,
 * and writes the path. Run it again only if the frame in geometry.ts changes.
 *
 *   node scripts/make-coast.mjs path/to/ne_10m_land.geojson
 */
import { readFile, writeFile } from 'node:fs/promises';

// Must match src/map/geometry.ts.
const FRAME = { west: 6.5, east: 23.5, south: 51.5, north: 58.0 };
const WIDTH = 1000;
const LAT_SCALE = 1 / Math.cos(((FRAME.south + FRAME.north) / 2) * (Math.PI / 180));
const PX_PER_LON = WIDTH / (FRAME.east - FRAME.west);
const PX_PER_LAT = PX_PER_LON * LAT_SCALE;
const HEIGHT = Math.round((FRAME.north - FRAME.south) * PX_PER_LAT);

const project = ([lon, lat]) => [(lon - FRAME.west) * PX_PER_LON, (FRAME.north - lat) * PX_PER_LAT];

/** Sutherland–Hodgman against one edge of the frame. */
function clipEdge(ring, inside, intersect) {
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const current = ring[i];
    const previous = ring[(i + ring.length - 1) % ring.length];
    const currentIn = inside(current);
    const previousIn = inside(previous);
    if (currentIn) {
      if (!previousIn) out.push(intersect(previous, current));
      out.push(current);
    } else if (previousIn) {
      out.push(intersect(previous, current));
    }
  }
  return out;
}

const at = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function clipRing(ring) {
  let r = ring;
  r = clipEdge(r, (p) => p[0] >= FRAME.west, (a, b) => at(a, b, (FRAME.west - a[0]) / (b[0] - a[0])));
  r = clipEdge(r, (p) => p[0] <= FRAME.east, (a, b) => at(a, b, (FRAME.east - a[0]) / (b[0] - a[0])));
  r = clipEdge(r, (p) => p[1] >= FRAME.south, (a, b) => at(a, b, (FRAME.south - a[1]) / (b[1] - a[1])));
  r = clipEdge(r, (p) => p[1] <= FRAME.north, (a, b) => at(a, b, (FRAME.north - a[1]) / (b[1] - a[1])));
  return r;
}

/** Douglas–Peucker, in projected units. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const sq = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let far = -1;
    let farDist = 0;
    for (let i = a + 1; i < b; i++) {
      const d = segmentDistanceSq(points[i], points[a], points[b]);
      if (d > farDist) {
        farDist = d;
        far = i;
      }
    }
    if (farDist > sq) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function segmentDistanceSq(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  let t = len === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len;
  t = Math.max(0, Math.min(1, t));
  const x = a[0] + t * dx - p[0];
  const y = a[1] + t * dy - p[1];
  return x * x + y * y;
}

function ringArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

const source = process.argv[2];
if (!source) {
  console.error('usage: node scripts/make-coast.mjs ne_10m_land.geojson');
  process.exit(1);
}
const geo = JSON.parse(await readFile(source, 'utf8'));
const rings = [];
for (const feature of geo.features) {
  const polys = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  for (const poly of polys) {
    for (const ring of poly) {
      const clipped = clipRing(ring);
      if (clipped.length < 3) continue;
      const projected = simplify(clipped.map(project), 1.2);
      // Islands smaller than a few pixels are noise at this scale.
      if (projected.length >= 3 && ringArea(projected) > 40) rings.push(projected);
    }
  }
}

const path = rings
  .map((ring) => 'M' + ring.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z')
  .join('');

const out = `/**
 * The Baltic coast, drawn once from Natural Earth (public domain) by
 * scripts/make-coast.mjs. Do not edit by hand; re-run the script if the frame
 * in geometry.ts changes. ${rings.length} rings, projected into a
 * ${WIDTH}×${HEIGHT} box the way geometry.ts projects everything else.
 */
export const COAST_WIDTH = ${WIDTH};
export const COAST_HEIGHT = ${HEIGHT};
export const COAST_PATH =
  '${path}';
`;
await writeFile(new URL('../src/map/coast.ts', import.meta.url), out);
console.log(`${rings.length} rings, ${(path.length / 1024).toFixed(1)} KiB`);
