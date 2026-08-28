'use client';

import Link from 'next/link';
import styles from './RingButton.module.css';

/**
 * A round action with its own state drawn around it.
 *
 * The ring is a cooldown and the pips are what you have left, which is a
 * convention people read without being taught — and it is how the charge meter
 * and two countdown rows disappeared from the screen without the information
 * going with them.
 *
 * A disabled control that does nothing when pressed is worse than no control,
 * so `hint` is what it says when tapped in that state. Readouts can hide;
 * causality cannot.
 */
export function RingButton({
  label,
  progress,
  pips,
  disabled,
  href,
  onClick,
  onBlocked,
  children,
  tone = 'leaf',
}: {
  label: string;
  /** 0..1 around the rim. */
  progress: number;
  pips?: { filled: number; total: number };
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
  /** Called instead of the action when disabled — say why. */
  onBlocked?: () => void;
  children: React.ReactNode;
  tone?: 'leaf' | 'coral';
}) {
  const R = 30;
  const C = 2 * Math.PI * R;
  const shown = Math.min(1, Math.max(0, progress));

  const inner = (
    <>
      <svg className={styles.ring} viewBox="0 0 68 68" aria-hidden="true">
        <circle className={styles.track} cx="34" cy="34" r={R} />
        <circle
          className={styles.fill}
          cx="34"
          cy="34"
          r={R}
          strokeDasharray={`${C * shown} ${C}`}
        />
      </svg>
      <span className={styles.glyph}>{children}</span>
      {pips ? (
        <span className={styles.pips} aria-hidden="true">
          {Array.from({ length: pips.total }, (_, i) => (
            <i key={i} className={i < pips.filled ? styles.pipOn : styles.pip} />
          ))}
        </span>
      ) : null}
      <span className={styles.label}>{label}</span>
    </>
  );

  const className = [
    styles.button,
    styles[tone],
    disabled ? styles.off : '',
    pips ? styles.hasPips : '',
  ].join(' ');

  if (href && !disabled) {
    return (
      <Link className={className} href={href} aria-label={label}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      className={className}
      onClick={disabled ? onBlocked : onClick}
      // Not the `disabled` attribute: a disabled button cannot be tapped, and
      // then it can never tell you why it is disabled.
      aria-disabled={disabled}
      aria-label={label}
      type="button"
    >
      {inner}
    </button>
  );
}
