/**
 * Nimiq Pay injects this before the page script runs. Declared locally rather
 * than importing the SDK, so reading the language never pulls the provider
 * bundle into a page that does not need it.
 */
declare global {
  interface Window {
    nimiqPay?: { language?: string };
  }
}

export {};
