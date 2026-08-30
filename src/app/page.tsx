import { currentAddress } from '@/lib/server/session';
import { ReefScreen } from '@/components/ReefScreen';

/**
 * A server shell over the reef screen, for one reason: it knows whether you
 * are signed in before anything renders.
 *
 * The session is a cookie, so this costs one read and no round trip. The
 * screen itself stays a client component and still fetches its own state —
 * this only settles which of the two faces to show first, which is what made
 * every trip back from the collection flash a sign-in gate.
 */
export default async function Home() {
  return <ReefScreen signedIn={Boolean(await currentAddress())} />;
}
