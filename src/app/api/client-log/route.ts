import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Client-side error reporting.
 *
 * A Mini App runs in a WebView with no console you can open, so a JavaScript
 * error on a phone is otherwise completely invisible — the server sees a
 * request stop happening and nothing else. This ships just enough to see it.
 *
 * No addresses, no identifiers, capped and rate-limited.
 */

const MAX_BYTES = 4000;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;

let windowStart = Date.now();
let seen = 0;

export async function POST(request: Request) {
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    seen = 0;
  }
  if (++seen > MAX_PER_WINDOW) return NextResponse.json({ ok: true });

  let body: { at?: unknown; message?: unknown; stack?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const at = String(body.at ?? 'unknown').slice(0, 60);
  const message = String(body.message ?? '').slice(0, 500);
  const stack = String(body.stack ?? '').slice(0, MAX_BYTES);
  const ua = (request.headers.get('user-agent') ?? '').slice(0, 120);

  console.error(`[reef:client] at=${at} msg=${message} ua=${ua}${stack ? `\n${stack}` : ''}`);
  return NextResponse.json({ ok: true });
}
