'use client';

import { useEffect, useState } from 'react';
import { STRINGS, isLocale, type Locale, type StringKey } from './strings';

export type { Locale, StringKey };

/**
 * Translate, with {placeholder} substitution.
 *
 * Falls back to English per key rather than per language, so a half-finished
 * translation degrades to mixed copy instead of blank labels.
 */
export function translate(
  locale: Locale,
  key: StringKey,
  vars: Record<string, string | number> = {},
): string {
  const table = STRINGS[locale] as Record<string, string>;
  const template = table[key] ?? STRINGS.en[key];
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

/**
 * The host's language, or the browser's, or English.
 *
 * Nimiq Pay seeds its value before the page script runs, but reading it during
 * render would make the server and client disagree on the first paint, so it
 * settles in an effect instead.
 */
export function useLocale(): { locale: Locale; t: (key: StringKey, vars?: Record<string, string | number>) => string } {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    let detected: string | undefined;
    try {
      detected = window.nimiqPay?.language ?? navigator.language.split('-')[0];
    } catch {
      detected = undefined;
    }
    if (isLocale(detected)) setLocale(detected);
  }, []);

  return {
    locale,
    t: (key, vars) => translate(locale, key, vars),
  };
}
