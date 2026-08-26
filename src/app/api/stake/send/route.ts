import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { inspectSigned } from '@/lib/server/staking';
import { rpc, RpcUnavailableError } from '@/lib/server/rpc';

export const runtime = 'nodejs';

const REFUSALS = {
  malformed: 'That is not a transaction.',
  'wrong-sender': 'That transaction is not from your address.',
  'not-staking': 'Reef only broadcasts staking transactions.',
} as const;

/**
 * Broadcast transactions the Hub signed.
 *
 * Every one is inspected first. Without that this is an open relay — anybody
 * could push arbitrary signed transactions into the network through us — and
 * Reef has no business carrying traffic that is not this user staking.
 */
export async function POST(request: Request) {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  let body: { raw?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const raws = Array.isArray(body.raw) ? body.raw : [body.raw];
  if (raws.length === 0 || raws.length > 4 || !raws.every((r) => typeof r === 'string')) {
    return NextResponse.json({ error: 'Expected one to four signed transactions.' }, { status: 400 });
  }

  // Inspect everything before broadcasting anything. Half a batch on the wire
  // is worse than none: the user would have paid for a state we then refuse to
  // complete.
  const checked = (raws as string[]).map((raw) => ({ raw, verdict: inspectSigned(raw, address) }));
  const bad = checked.find((c) => !c.verdict.ok);
  if (bad && !bad.verdict.ok) {
    return NextResponse.json({ error: REFUSALS[bad.verdict.reason] }, { status: 400 });
  }

  try {
    const hashes: string[] = [];
    for (const { raw } of checked) hashes.push(await rpc.sendRawTransaction(raw));
    return NextResponse.json({ hashes });
  } catch (cause) {
    if (cause instanceof RpcUnavailableError) {
      return NextResponse.json({ error: 'The Nimiq node is unreachable.' }, { status: 503 });
    }
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : 'The network rejected it.' },
      { status: 400 },
    );
  }
}
