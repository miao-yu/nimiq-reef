'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { drawFauna, colourFor } from '@/lib/tank/fauna';
import { drawFlora, FLORA_HEIGHT } from '@/lib/tank/flora';
import { TANK_PALETTE } from '@/lib/tank/palette';
import { STILL_TIME } from '@/lib/tank/motion';
import { isFlora } from '@/lib/tank/types';
import { report } from '@/lib/client-log';
import type { FaunaKey, FloraKey } from '@/lib/tank/types';
import type { Look, Odds } from '@/lib/reef/look';
import styles from './LookDetail.module.css';

/**
 * One look, up close.
 *
 * Everything here is derived from the three values in the URL, so the page
 * works for somebody who has never played and owns nothing — which is the
 * point of being able to send it to them.
 */
export function LookDetail({
  look,
  name,
  blurb,
  unlockDay,
  shiny,
  description,
  parts,
  odds,
  oddsAtDay,
}: {
  look: Look;
  name: string;
  blurb: string;
  unlockDay: number;
  shiny: boolean;
  description: string;
  parts: { label: string; name: string; of: number }[];
  odds: Odds;
  oddsAtDay: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const size = el.clientWidth;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = Math.round(size * dpr);
    el.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    if (isFlora(look.species)) {
      drawFlora(
        look.species as FloraKey,
        ctx,
        size / 2,
        size * 0.94,
        size * 0.7 * (FLORA_HEIGHT[look.species as FloraKey] / FLORA_HEIGHT.kelp),
        TANK_PALETTE,
        STILL_TIME,
        look.seed,
        0.35,
      );
      return;
    }
    ctx.save();
    ctx.translate(size / 2, size / 2);
    drawFauna(look.species as FaunaKey, {
      ctx,
      L: size * 0.5,
      colour: colourFor(look.species as FaunaKey, look.tier, look.seed),
      tier: look.tier,
      time: STILL_TIME,
      seed: look.seed % 100,
      rate: 0,
    });
    ctx.restore();
  }, [look]);

  async function share() {
    const url = window.location.href;
    const text = `${shiny ? 'Shiny ' : ''}${name} — 1 in ${odds.oneIn.toLocaleString()}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: text, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') return;
      report('look:share', cause);
    }
  }

  // Two decimals below ten percent: 1.0% and 1.0% on consecutive rows read as
  // a rounding artefact even when both are exactly right.
  const pct = (n: number) => {
    const v = n * 100;
    if (v >= 10) return `${v.toFixed(1)}%`;
    if (v >= 0.01) return `${v.toFixed(2)}%`;
    return `${v.toFixed(4)}%`;
  };

  return (
    <main className={styles.wrap}>
      <Link className={styles.back} href="/collection">
        ← Collection
      </Link>

      <div className={`${styles.frame} ${shiny ? styles.shinyFrame : ''}`}>
        <canvas ref={canvas} className={styles.canvas} />
      </div>

      <h1 className={styles.title}>
        {shiny ? <span className={styles.shinyTag}>✦ Shiny</span> : null}
        {name}
      </h1>
      <p className={styles.tier}>{look.tier}</p>

      <p className={styles.description}>{description}</p>
      <p className={styles.blurb}>{blurb}</p>

      {/* Named, not numbered. "Pattern 6 of 6" read as a score. */}
      <div className={styles.parts}>
        {parts.map((p) => (
          <span key={p.label} className={styles.part}>
            <small>{p.label}</small>
            <strong>{p.name}</strong>
            <em>{p.of} kinds</em>
          </span>
        ))}
      </div>

      <h2 className={styles.h2}>How rare</h2>

      {/* Three steps that multiply into the total, shown in that order so the
          5,376 and the 537,600 stop looking like the same number twice. */}
      <dl className={styles.breakdown}>
        <div>
          <dt>A cast lands on {look.tier}</dt>
          <dd>{pct(odds.tier)}</dd>
        </div>
        <div>
          <dt>…then on a {name.toLowerCase()}</dt>
          <dd>
            {odds.speciesInTier === 1
              ? `the only ${look.tier} in play`
              : `1 of ${odds.speciesInTier} ${look.tier}s`}
          </dd>
        </div>
        <div>
          <dt>…then on this arrangement of parts</dt>
          <dd>1 of {odds.looksInTier.toLocaleString()}</dd>
        </div>
        <div className={styles.total}>
          <dt>Altogether</dt>
          <dd>1 in {odds.oneIn.toLocaleString()}</dd>
        </div>
      </dl>

      <p className={styles.note}>
        Shiny as well would be 1 in {odds.shinyOneIn.toLocaleString()}.
        {' '}This species opens at a {unlockDay === 0 ? 'day-one' : `${unlockDay}-day`} streak.
      </p>

      {/* Rarity moves with the streak — both which species are in play and how
          often each tier comes up — so a number with no streak attached would
          mean nothing. */}
      <p className={styles.note}>
        Quoted at a {oddsAtDay}-day staking streak. Longer streaks make the rare
        tiers likelier; shorter ones make them impossible.
      </p>

      <div className={styles.actions}>
        <Link className={styles.primary} href="/fish">
          Go fishing
        </Link>
        <button className={styles.secondary} onClick={() => void share()} type="button">
          {copied ? 'Link copied' : 'Share this one'}
        </button>
      </div>
    </main>
  );
}
