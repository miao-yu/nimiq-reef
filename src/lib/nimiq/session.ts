'use client';

import { getProvider } from './provider';

export interface SignInResult {
  address: string;
}

/**
 * Full sign-in: ask for a challenge, have the wallet sign it, send both halves
 * back. The server decides who you are — this function never asserts identity.
 */
export async function signIn(): Promise<SignInResult> {
  const provider = await getProvider();

  const accounts = await provider.listAccounts();
  const address = accounts[0];
  if (!address) throw new Error('No account available in the wallet.');

  const challenge = await postJson<{ code: string; message: string }>('/api/auth/challenge', {
    address,
  });

  const { publicKey, signature } = await provider.sign(challenge.message);

  return postJson<SignInResult>('/api/auth/verify', {
    code: challenge.code,
    address,
    publicKey,
    signature,
  });
}

/**
 * For somebody with no Nimiq account: make one, then sign in with it.
 *
 * Deliberately a separate entry point rather than a fallback inside signIn().
 * Creating a wallet is not something to do to a person who only meant to log
 * in — they have to have asked for it.
 */
export async function signUp(): Promise<SignInResult> {
  const provider = await getProvider();
  if (!provider.onboard) throw new Error('This wallet cannot create an account.');
  await provider.onboard();
  return signIn();
}

export async function currentSession(): Promise<string | null> {
  const res = await fetch('/api/auth/session');
  if (!res.ok) return null;
  return ((await res.json()) as { address: string | null }).address;
}

export async function signOut(): Promise<void> {
  await fetch('/api/auth/session', { method: 'DELETE' });
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request to ${url} failed.`);
  return data;
}
