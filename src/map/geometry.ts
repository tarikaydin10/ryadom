import * as SunCalc from 'suncalc';
import { CITIES, type CityId } from '../content/cities';
import { COAST_HEIGHT, COAST_WIDTH } from './coast';

/**
 * The map's geometry, in one place — the way `sky/engine.ts` owns the band's
 * (ADR-0006). The coast in `coast.ts` was projected with these same numbers by
 * `scripts/make-coast.mjs`; change the frame here and re-run the script, or the
 * cities will stand in the sea.
 *
 * A plain equirectangular projection, stretched for the latitude. Over five
 * degrees of latitude nothing fancier is visible, and it keeps every position a
 * multiplication rather than a trigonometry lesson.
 */
export const FRAME = { west: 6.5, east: 23.5, south: 51.5, north: 58.0 } as const;
export const WIDTH = COAST_WIDTH;
export const HEIGHT = COAST_HEIGHT;

const RAD = Math.PI / 180;
const LAT_SCALE = 1 / Math.cos(((FRAME.south + FRAME.north) / 2) * RAD);
const PX_PER_LON = WIDTH / (FRAME.east - FRAME.west);
const PX_PER_LAT = PX_PER_LON * LAT_SCALE;

export interface Point {
  x: number;
  y: number;
}

export function project(lat: number, lon: number): Point {
  return { x: (lon - FRAME.west) * PX_PER_LON, y: (FRAME.north - lat) * PX_PER_LAT };
}

export const CITY_POINTS: Record<CityId, Point> = {
  hamburg: project(CITIES.hamburg.lat, CITIES.hamburg.lon),
  kaliningrad: project(CITIES.kaliningrad.lat, CITIES.kaliningrad.lon),
};

const EARTH_KM = 6371;

/** Great-circle distance, which is the honest one — the band overdraws the ground on purpose; this does not. */
export function distanceKm(a: CityId, b: CityId): number {
  const p = CITIES[a];
  const q = CITIES[b];
  const dLat = (q.lat - p.lat) * RAD;
  const dLon = (q.lon - p.lon) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(p.lat * RAD) * Math.cos(q.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/**
 * The shortest way between the two, as the crow flies — which on a flat map is
 * a gentle arc bowing north. Sampled rather than approximated so it lands
 * exactly on both cities.
 */
export function greatCirclePath(a: CityId, b: CityId, samples = 40): string {
  const p = CITIES[a];
  const q = CITIES[b];
  const lat1 = p.lat * RAD;
  const lon1 = p.lon * RAD;
  const lat2 = q.lat * RAD;
  const lon2 = q.lon * RAD;
  const d = 2 * Math.asin(Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2));
  const points: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const f = i / samples;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    points.push(project(Math.atan2(z, Math.sqrt(x * x + y * y)) / RAD, Math.atan2(y, x) / RAD));
  }
  return points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join('');
}

/** Where the arc is at its middle — the distance is written there. */
export function arcMidpoint(a: CityId, b: CityId): Point {
  const p = CITIES[a];
  const q = CITIES[b];
  // The midpoint of a short great circle is within a pixel of the mean, bowed
  // north by the curvature the path already shows; a small nudge keeps the
  // label on the line rather than under it.
  const mid = project((p.lat + q.lat) / 2, (p.lon + q.lon) / 2);
  return { x: mid.x, y: mid.y - 8 };
}

/**
 * Night, as the map shows it: a grid of cells, each as dark as the sun is low
 * there. Half a degree a cell — coarse enough to compute on every frame of a
 * drag (fewer than five hundred SunCalc calls, microseconds each), fine enough
 * that a blur turns it into the soft edge dusk really has. Only the cells with
 * any night in them are returned, so a summer noon costs nothing to draw.
 */
export interface NightCell extends Point {
  w: number;
  h: number;
  opacity: number;
}

const CELL_DEG = 0.5;
/** Civil twilight, roughly: full night below −6°, full day above +4°. */
const DARK_BELOW = -6;
const LIGHT_ABOVE = 4;
const NIGHT_OPACITY = 0.78;

export function nightCells(ms: number): NightCell[] {
  const at = new Date(ms);
  const cells: NightCell[] = [];
  const w = CELL_DEG * PX_PER_LON;
  const h = CELL_DEG * PX_PER_LAT;
  // A degree past the frame on every side, so the blur has night to blur into
  // and the edges of the map do not fade towards the daylight they never see.
  for (let lat = FRAME.south - 1; lat < FRAME.north + 1; lat += CELL_DEG) {
    for (let lon = FRAME.west - 1; lon < FRAME.east + 1; lon += CELL_DEG) {
      const alt = SunCalc.getPosition(at, lat + CELL_DEG / 2, lon + CELL_DEG / 2).altitude;
      if (alt >= LIGHT_ABOVE) continue;
      const dark = Math.min(1, (LIGHT_ABOVE - alt) / (LIGHT_ABOVE - DARK_BELOW));
      const { x, y } = project(lat + CELL_DEG, lon);
      cells.push({ x, y, w, h, opacity: dark * NIGHT_OPACITY });
    }
  }
  return cells;
}

/** Sun altitude at a city, for "is it lit there". */
export function sunAltitude(ms: number, city: CityId): number {
  return SunCalc.getPosition(new Date(ms), CITIES[city].lat, CITIES[city].lon).altitude;
}
