'use client';

import { useEffect, useRef } from 'react';
import styles from './Sheet.module.css';

/**
 * Everything that is not one of the two actions.
 *
 * Opened by a visible handle rather than a swipe. A gesture nobody is told
 * about is a feature nobody finds, and the readouts moved in here are the ones
 * that explain why the game behaves the way it does.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`${styles.scrim} ${open ? styles.scrimOn : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`${styles.sheet} ${open ? styles.sheetOn : ''}`}
        role="dialog"
        aria-modal={open}
        aria-label={title}
        aria-hidden={!open}
        ref={panel}
        tabIndex={-1}
      >
        <button className={styles.grip} onClick={onClose} type="button" aria-label="Close">
          <span />
        </button>
        <div className={styles.body}>{children}</div>
      </div>
    </>
  );
}
