import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { healLog, measure, report } from '../lib/viewport';

/**
 * What the phone actually measures, while it is measuring it wrong.
 *
 * The keyboard viewport bug (ADR-0010, TD-01) has been fought twice from
 * screenshots, and a screenshot cannot say whether `healViewport` ran, what it
 * decided, or how short the viewport really is. So this reads all of it out on
 * the device: the numbers now, and the last dozen decisions the healer made.
 *
 * Deliberately unstyled beyond a monospace block. It is not part of the app —
 * it is an instrument, and it should look like one so that nobody mistakes it
 * for a screen somebody designed.
 */
export function Diagnostics() {
  const { t } = useI18n();
  const [, tick] = useState(0);
  const [copied, setCopied] = useState(false);

  // A second is fast enough to watch the viewport change while the keyboard
  // comes and goes, and slow enough to cost nothing.
  useEffect(() => {
    const timer = window.setInterval(() => tick((count) => count + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const copy = () => {
    const text = report();
    void navigator.clipboard
      ?.writeText(text)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  const entries = healLog();

  return (
    <div className="section">
      <span className="section__title">{t('settings.diagnostics')}</span>
      <p className="hint">{t('settings.diagnosticsHint')}</p>

      <pre className="diag">
        {measure()
          .map(([label, value]) => `${label}: ${value}`)
          .join('\n')}
      </pre>

      <pre className="diag">
        {entries.length === 0
          ? 'heal: (never ran)'
          : entries
              .map(
                (entry) =>
                  `${new Date(entry.at).toISOString().slice(11, 19)} ${entry.why} ` +
                  `inner=${entry.innerWidth}×${entry.innerHeight} vis=${entry.visualHeight} ` +
                  `scale=${entry.scale.toFixed(2)} kbd=${entry.keyboard ? 'up' : 'down'} ` +
                  `short=${entry.short} healed=${entry.healed}`,
              )
              .join('\n')}
      </pre>

      <button className="button button--ghost" style={{ alignSelf: 'flex-start' }} onClick={copy}>
        {copied ? t('settings.copied') : t('settings.copy')}
      </button>
    </div>
  );
}
