'use client';

/**
 * Report a client error to the server.
 *
 * Fire-and-forget and never throws — diagnostics must not become the thing
 * that breaks the page they are diagnosing.
 */
export function report(at: string, error: unknown): void {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? (error.stack ?? '') : '';
    void fetch('/api/client-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ at, message, stack }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* diagnostics are never worth an exception */
  }
}

let installed = false;

/** Catch what never reaches a try/catch — there is no console on a phone. */
export function installErrorReporting(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (e) => report('window.onerror', e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => report('unhandledrejection', e.reason));
}
