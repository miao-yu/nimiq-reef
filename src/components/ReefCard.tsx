'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Avatar } from './Avatar';
import { ValidatorMark } from './ValidatorMark';
import { renderTank } from '@/lib/tank/render';
import { TANK_PALETTE } from '@/lib/tank/palette';
import { STILL_TIME } from '@/lib/tank/motion';
import { adaptPlants } from '@/lib/tank/adapt';
import { depthForStake } from '@/lib/reef/vessel';
import { truncateAddress } from '@/lib/nimiq/address';
import { formatNimShort } from '@/lib/nimiq/policy';
import type { Plant } from '@/lib/reef/types';
import styles from './ReefCard.module.css';

export interface CommunityReefCard {
  address: string;
  day: number;
  daysStaked: number;
  species: number;
  stakedLuna: number;
  plants: Plant[];
  pool: { address: string; name: string | null; logo: boolean; water: string } | null;
}

/**
 * One reef in the community list.
 *
 * The tank is drawn here rather than fetched as a PNG. A grid of these would
 * otherwise be a dozen server renders to paint one screen, and the browser
 * already has the same renderer the server uses — so this is the identical
 * picture for the cost of a canvas.
 *
 * A single still frame: `motion: false` composes a deliberate moment rather
 * than a pause, and a page of animated tanks would spin a dozen rAF loops for
 * thumbnails nobody is watching closely.
 */
export function ReefCard({
  reef,
  onFeed,
  feeding,
  fed,
  spent,
}: {
  reef: CommunityReefCard;
  onFeed?: (address: string) => void;
  feeding?: boolean;
  fed?: boolean;
  /** Today's one gift is gone — on some other reef, or this one. */
  spent?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = el.clientWidth;
    const h = el.clientHeight;
    el.width = Math.round(w * dpr);
    el.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderTank(ctx, {
      width: w,
      height: h,
      time: STILL_TIME,
      inhabitants: adaptPlants(reef.plants),
      palette: TANK_PALETTE,
      waterLevel: depthForStake(reef.stakedLuna),
      motion: false,
    });
  }, [reef]);

  const compact = reef.address.replace(/\s/g, '');

  return (
    <article className={styles.card}>
      <Link className={styles.tankLink} href={`/r/${compact}`} aria-label={`Day ${reef.day} reef`}>
        <canvas ref={canvas} className={styles.tank} />
      </Link>

      <div className={styles.body}>
        <div className={styles.who}>
          <Avatar address={reef.address} size={28} />
          <span className={styles.text}>
            <code>{truncateAddress(reef.address)}</code>
            <small>
              {/* The streak leads when there is one: it is what the default
                  sort ranks by, and a ranking whose key is invisible reads as
                  an arbitrary order. */}
              {reef.daysStaked > 0
                ? `${reef.daysStaked}d streak`
                : `Day ${reef.day}`} · {reef.species} species
              {reef.stakedLuna > 0 ? ` · ${formatNimShort(reef.stakedLuna)} NIM` : ''}
            </small>
          </span>
        </div>

        {reef.pool ? (
          <div className={styles.pool}>
            <ValidatorMark address={reef.pool.address} hasLogo={reef.pool.logo} size={18} />
            <span>{reef.pool.name ?? reef.pool.water}</span>
          </div>
        ) : (
          <div className={styles.pool}>
            <span className={styles.notStaking}>Not staking yet</span>
          </div>
        )}

        {onFeed ? (
          <button
            className={styles.feed}
            onClick={() => onFeed(reef.address)}
            disabled={feeding || fed || spent}
            type="button"
            title={spent && !fed ? 'You have already fed a reef today. One a day.' : undefined}
          >
            {fed ? 'Fed' : feeding ? '…' : spent ? 'Fed today' : 'Feed'}
          </button>
        ) : null}
      </div>
    </article>
  );
}
