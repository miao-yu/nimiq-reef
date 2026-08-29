#!/usr/bin/env node
/**
 * Which browsers get told to switch.
 *
 * A false positive is the expensive direction: telling somebody already in
 * Safari that they are in WeChat sends them looking for a menu that is not
 * there. So the ordinary browsers matter more here than the in-app ones.
 */
import { inAppBrowser } from '../src/lib/nimiq/in-app.ts';

let fail = 0;
const check = (n, ok, d = '') => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fail++; };

const CASES = [
  ['WeChat',    'WeChat',    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 MicroMessenger/8.0.42(0x18002a2b) NetType/WIFI'],
  ['LINE',      'LINE',      'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Line/13.5.0'],
  ['Instagram', 'Instagram', 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Instagram 302.0.0.23.113'],
  ['Facebook',  'Facebook',  'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/440.0]'],
  ['Safari',        null, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'],
  ['Chrome on iOS', null, 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/120.0 Mobile/15E148 Safari/604.1'],
  ['Chrome on Android', null, 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'],
  ['Firefox on iOS',   null, 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 FxiOS/121.0 Mobile/15E148 Safari/605.1.15'],
  ['desktop Safari',   null, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15'],
];

for (const [name, want, ua] of CASES) {
  const got = inAppBrowser(ua);
  check(`${name} -> ${want ?? 'ordinary browser'}`, got === want, got === want ? '' : `got ${got}`);
}

console.log(fail === 0 ? '\nPASS — the warning goes to the right browsers' : `\nFAIL (${fail})`);
process.exit(fail ? 1 : 0);
