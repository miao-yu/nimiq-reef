'use client';

import { useState } from 'react';
import { RingButton } from './RingButton';
import { report } from '@/lib/client-log';
import { useLocale } from '@/lib/i18n';
import type { ReefState } from '@/lib/reef/state';
import type { LiveClock } from '@/lib/reef/live';
import styles from './Dock.module.css';

/** Hours and minutes, for a control explaining why it is asleep. */
function hhmm(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * The two things you do, and nothing else.
 *
 * Everything that used to sit above these as text — the charge meter, the epoch
 * countdown, the day countdown — is drawn on the buttons themselves. What is
 * left over goes in the sheet.
 */
export function Dock({
  reef,
  live,
  onChange,
}: {
  reef: ReefState;
  /**
   * The clocks, advanced since the last fetch. The rings read from here rather
   * than from `reef`, whose progress values are frozen at fetch time — a
   * cooldown that never moves looks broken.
   */
  live: LiveClock | null;
  onChange: (r: ReefState) => void;
}) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  function say(message: string) {
    setNote(message);
    window.setTimeout(() => setNote((n) => (n === message ? null : n)), 2600);
  }

  async function feed() {
    setBusy(true);
    try {
      const res = await fetch('/api/feed', { method: 'POST' });
      const data = (await res.json()) as { reef?: ReefState; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not feed.');
      if (data.reef) onChange(data.reef);
      say(t('fedJustNow'));
    } catch (cause) {
      report('feed', cause);
      say(cause instanceof Error ? cause.message : 'Could not feed.');
    } finally {
      setBusy(false);
    }
  }

  const noCharges = reef.charges < 1;

  return (
    <div className={styles.dock}>
      {note ? <p className={styles.note}>{note}</p> : null}
      <div className={styles.row}>
        <RingButton
          label={t('goFishing')}
          href="/fish"
          progress={live?.epochProgress ?? reef.epochProgress}
          pips={{ filled: reef.charges, total: reef.maxCharges }}
          disabled={noCharges}
          onBlocked={() =>
            say(
              (live?.nextChargeInMs ?? reef.nextChargeInMs) === null
                ? t('noCharges')
                : t('nextCharge', {
                    time: hhmm((live?.nextChargeInMs ?? reef.nextChargeInMs) as number),
                  }),
            )
          }
        >
          {/* A float. The same mark that bobs on the fishing screen. */}
          <svg viewBox="0 0 16 22" width="19" height="26" aria-hidden="true">
            <path d="M8 0v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M8 6a5 5 0 0 1 5 5c0 3-5 9-5 9S3 14 3 11a5 5 0 0 1 5-5z" fill="#E5473B" />
            <path d="M3.6 13.5h8.8C11.3 16.6 8 20 8 20s-3.3-3.4-4.4-6.5z" fill="#F4F1EA" />
          </svg>
        </RingButton>

        <RingButton
          label={reef.fedToday ? t('fedAlready') : t('feed')}
          tone="coral"
          progress={live?.dayProgress ?? reef.dayProgress}
          disabled={reef.fedToday || busy}
          onClick={() => void feed()}
          onBlocked={() => say(t('dayResets', { time: hhmm(live?.dayResetsInMs ?? reef.dayResetsInMs) }))}
        >
          {reef.fedToday ? (
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path
                d="M4 12.5l5 5L20 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            /* Flakes, the same shape that falls in the tank. */
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              {[
                [6, 5, -0.5],
                [14, 8, 0.4],
                [9, 13, 0.9],
                [17, 15, -0.3],
                [11, 19, 0.2],
              ].map(([x, y, r], i) => (
                <ellipse
                  key={i}
                  cx={x}
                  cy={y}
                  rx="2.6"
                  ry="1.1"
                  fill="#E8A94B"
                  transform={`rotate(${(r as number) * 60} ${x} ${y})`}
                />
              ))}
            </svg>
          )}
        </RingButton>
      </div>
    </div>
  );
}
