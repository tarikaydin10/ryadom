import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { TimeRail } from '../components/TimeRail';
import { CountdownCard } from '../components/CountdownCard';
import { useI18n } from '../i18n';
import { useNow } from '../lib/hooks';
import { useScrub, SCRUB_LIMIT_MS } from '../lib/scrub';
import { useSettings } from '../data/settings-context';
import { getPair } from '../data/pair';
import { sidesFor } from '../data/settings';
import { BAND_ORDER, CITIES, type CityId } from '../content/cities';
import { rowAt, skyDay, statusFor } from '../sky/engine';
import { clock } from '../lib/format';
import { DAY_MS } from '../lib/day';
import { COAST_PATH } from '../map/coast';
import { CITY_POINTS, HEIGHT, WIDTH, arcMidpoint, distanceKm, greatCirclePath, nightCells } from '../map/geometry';

/**
 * The picture of the distance.
 *
 * Not a map you use — no tiles from anybody's server, no zoom, no pin for
 * where the phone is — but a map you look at, the way the band is a sky you
 * look at. It answers three things, in this order: where the light is right
 * now, how far it really is, and where the next reunion will be. The coast is
 * a silhouette that ships with the app (ADR-0001); the night is computed from
 * the same sun the band uses; the distance is the honest one, which the band
 * deliberately is not.
 *
 * Time is wound the same way as on Today: drag across the map, or the rail
 * under it, and the terminator crosses the Baltic. One gesture, one hook.
 */

const DRAG_THRESHOLD_PX = 6;
/** A full drag across the map is one day. */
const DRAG_DAY_PX = 320;

/** Fixed for the life of the app — computed once, drawn once. */
const ARC = greatCirclePath(BAND_ORDER.left, BAND_ORDER.right);
const MID = arcMidpoint(BAND_ORDER.left, BAND_ORDER.right);
const KM = Math.round(distanceKm(BAND_ORDER.left, BAND_ORDER.right));

/** The land, never re-rendered: it does not move. */
const Coast = memo(function Coast() {
  return <path className="map__land" d={COAST_PATH} />;
});

export function Map() {
  const { t, locale } = useI18n();
  const { settings } = useSettings();
  const now = useNow();
  const { scrubMs, shownMs, scrubTo, backToNow } = useScrub(now);

  const row = rowAt(shownMs);
  const sides = sidesFor(getPair()?.member ?? 'a', settings);
  const reunion = settings.reunion.date ? settings.reunion.city : null;

  const night = useMemo(() => nightCells(shownMs), [shownMs]);

  /**
   * How much earlier the light reaches the eastern city today, in minutes.
   * The band's sunrise pair, read as a difference — the one number the band
   * shows but never says.
   */
  const lightGap = useMemo(() => {
    const events = skyDay(shownMs).events;
    const west = events[BAND_ORDER.left].sunrise;
    const east = events[BAND_ORDER.right].sunrise;
    return west !== null && east !== null ? Math.round((west - east) / 60000) : null;
  }, [shownMs]);

  /** Drag across the map winds time, like the band. */
  const drag = useRef<{ startX: number; startMs: number; moved: boolean } | null>(null);
  const pending = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    drag.current = { startX: event.clientX, startMs: shownMs, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = event.clientX - d.startX;
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
    d.moved = true;
    pending.current = d.startMs + (dx / DRAG_DAY_PX) * DAY_MS;
    if (frame.current === null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        if (pending.current !== null) scrubTo(pending.current);
      });
    }
  };
  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const city = (id: CityId) => {
    const p = CITY_POINTS[id];
    const lit = row.alt[id] > 0;
    const yours = id === sides.yours;
    const anchor = id === BAND_ORDER.left ? 'start' : 'end';
    const dx = id === BAND_ORDER.left ? -16 : 16;
    return (
      <g key={id} className={`map__city ${lit ? 'map__city--lit' : ''} ${yours ? 'map__city--yours' : ''}`}>
        {reunion === id && <circle className="map__reunion" cx={p.x} cy={p.y} r={22} />}
        {lit && <circle className="map__halo" cx={p.x} cy={p.y} r={9} />}
        <circle className="map__dot" cx={p.x} cy={p.y} r={6.5} />
        <text className="map__label" x={p.x + dx} y={p.y - 14} textAnchor={anchor}>
          {CITIES[id].label}
        </text>
        <text className="map__clock" x={p.x + dx} y={p.y + 30} textAnchor={anchor}>
          {clock(shownMs, CITIES[id].tz, locale)}
        </text>
      </g>
    );
  };

  return (
    <div className="screen-scroll">
      <div className={`map ${row.isDay ? 'map--day' : 'map--night'} ${drawn ? 'map--drawn' : ''}`}>
        <svg
          className="map__scene"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label={t('map.label')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <defs>
            <linearGradient id="map-sea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#dbe4e9" />
              <stop offset="1" stopColor="#c9d6de" />
            </linearGradient>
            {/* The blur is what turns half-degree cells into dusk. On the group,
                not the cells: one raster, one blur. */}
            <filter id="map-dusk" x="-15%" y="-15%" width="130%" height="130%">
              <feGaussianBlur stdDeviation="22" />
            </filter>
          </defs>

          <rect className="map__sea" width={WIDTH} height={HEIGHT} fill="url(#map-sea)" />
          <Coast />

          <g className="map__night" filter="url(#map-dusk)">
            {night.map((cell, i) => (
              <rect key={i} x={cell.x} y={cell.y} width={cell.w + 0.5} height={cell.h + 0.5} opacity={cell.opacity} />
            ))}
          </g>

          <path className="map__arc" d={ARC} pathLength={1} />
          <text className="map__distance" x={MID.x} y={MID.y} textAnchor="middle">
            {t('map.km', { km: KM.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-GB') })}
          </text>

          {city(BAND_ORDER.left)}
          {city(BAND_ORDER.right)}
        </svg>
      </div>

      <TimeRail
        now={now}
        ms={shownMs}
        live={scrubMs === null}
        limitMs={SCRUB_LIMIT_MS}
        onScrubTo={scrubTo}
        onNow={backToNow}
      />

      <div className={`status ${scrubMs !== null ? 'status--preview' : ''}`}>
        <span className="status__text">{t(`sky.status.${statusFor(row, sides.yours)}`)}</span>
      </div>

      <div className="content">
        <dl className="facts">
          <div className="facts__item">
            <dt className="facts__key">{t('map.distance')}</dt>
            <dd className="facts__value">
              {KM.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-GB')} <span className="facts__unit">{t('map.kmUnit')}</span>
            </dd>
          </div>
          <div className="facts__item">
            <dt className="facts__key">{t('map.light')}</dt>
            <dd className="facts__value">
              {lightGap === null ? (
                '—'
              ) : (
                <>
                  {Math.abs(lightGap)} <span className="facts__unit">{t('map.minEarlier', { city: CITIES[lightGap >= 0 ? BAND_ORDER.right : BAND_ORDER.left].label })}</span>
                </>
              )}
            </dd>
          </div>
        </dl>

        <CountdownCard />
      </div>
    </div>
  );
}
