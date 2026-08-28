'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './Sheet.module.css';

/**
 * Everything that is not one of the two actions.
 *
 * Opened by a visible handle rather than a swipe — a gesture nobody is told
 * about is a feature nobody finds. Closing is the other way round: the tap
 * target is there, and dragging it down works too, because on a phone that is
 * what a sheet is expected to do.
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
  const from = useRef<number | null>(null);
  const [drag, setDrag] = useState(0);

  /*
   * Drag to dismiss, downwards only.
   *
   * Pointer events rather than touch, so a trackpad drag behaves the same. The
   * sheet body scrolls, so only the grip starts a drag — otherwise flicking a
   * long list would throw the whole sheet off screen.
   */
  function start(e: React.PointerEvent) {
    from.current = e.clientY;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (from.current === null) return;
    setDrag(Math.max(0, e.clientY - from.current));
  }
  function end() {
    if (from.current === null) return;
    from.current = null;
    // A short tug springs back; past a finger's width it is a dismissal.
    if (drag > 90) onClose();
    setDrag(0);
  }

  // Reset when it reopens, or a dismissed sheet returns already half dragged.
  useEffect(() => {
    if (!open) setDrag(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // preventScroll: focusing scrolls the nearest scrollable ancestor to reveal
    // the element, and this one starts off-screen on purpose.
    panel.current?.focus({ preventScroll: true });
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
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
      >
        <button
          className={styles.grip}
          onClick={onClose}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          type="button"
          aria-label="Close"
        >
          <span />
        </button>
        <div className={styles.body}>{children}</div>
      </div>
    </>
  );
}
