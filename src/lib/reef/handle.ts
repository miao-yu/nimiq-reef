import { rng } from './rng';

/**
 * A short name for a reef, so social features never have to show a wallet.
 *
 * The address is already public on-chain, but linking it to in-app behaviour
 * is a step we should not take on somebody's behalf. A handle also gives
 * people something they can say out loud, which an address does not.
 *
 * Derived from the address, so the same reef always gets the same handle even
 * if a row is rebuilt.
 */
const ADJECTIVES = [
  'quiet', 'bright', 'still', 'coral', 'tidal', 'amber', 'deep', 'pale',
  'silver', 'drifting', 'sunlit', 'glass', 'lunar', 'salt', 'kelp', 'pearl',
];

const NOUNS = [
  'reef', 'lagoon', 'shoal', 'current', 'atoll', 'harbour', 'trench', 'cove',
  'shallows', 'kelp', 'basin', 'channel', 'sound', 'strait', 'bay', 'pool',
];

function seedFrom(address: string): number {
  let h = 2166136261;
  for (let i = 0; i < address.length; i++) {
    h ^= address.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** `attempt` lets the caller retry on the unlikely unique-key collision. */
export function handleFor(address: string, attempt = 0): string {
  const r = rng(seedFrom(address) + attempt * 7919);
  const adjective = ADJECTIVES[Math.floor(r() * ADJECTIVES.length)]!;
  const noun = NOUNS[Math.floor(r() * NOUNS.length)]!;
  const number = Math.floor(r() * 90) + 10;
  return `${adjective}-${noun}-${number}`;
}
