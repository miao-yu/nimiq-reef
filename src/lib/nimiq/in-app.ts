/**
 * In-app browsers that silently swallow a `nimiqpay://` tap.
 *
 * A QR code is usually scanned by *something* — WeChat, LINE, Instagram — and
 * those open their own webview, which blocks custom URL schemes outright. The
 * tap does nothing: no error, no navigation, no clue. Reported from an iPhone,
 * where the identical button worked the moment the page was reopened in Safari.
 *
 * Sniffing the user agent is a poor tool and the right one here. The thing
 * being detected is the browser itself, and there is no feature test for "will
 * refuse a custom scheme without telling you".
 *
 * A false positive is the expensive mistake — telling somebody already in
 * Safari that they are in WeChat — so the patterns are narrow and anchored.
 */
const IN_APP: readonly (readonly [RegExp, string])[] = [
  [/MicroMessenger/i, 'WeChat'],
  [/\bLine\//i, 'LINE'],
  [/Instagram/i, 'Instagram'],
  [/\bFBAN|FBAV\b/i, 'Facebook'],
  [/\bQQ\//i, 'QQ'],
  [/BytedanceWebview|TikTok/i, 'TikTok'],
  [/Snapchat/i, 'Snapchat'],
  [/Twitter/i, 'X'],
];

/** The app whose browser this is, or null for an ordinary one. */
export function inAppBrowser(ua: string): string | null {
  for (const [pattern, name] of IN_APP) if (pattern.test(ua)) return name;
  return null;
}
