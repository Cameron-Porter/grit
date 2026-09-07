import { LoadingScreen } from './loading-screen';
import { EnterApp } from './enter-app';

/**
 * The launch route, and deliberately static.
 *
 * This used to be a server redirect to /workout. A redirect returns a 307 with
 * no body, and /workout is force-dynamic, so a cold launch had to wait for a
 * server function to boot before the browser had anything at all to paint —
 * several seconds of the PWA's black background_color on a cold start.
 *
 * Being static, this page is served from the CDN (and the service worker's
 * precache) with no server work, so the loading screen paints immediately and
 * the client navigates on to /workout behind it.
 */
export default function Home() {
  return (
    <>
      <LoadingScreen message="Opening your workout." />
      <EnterApp />
    </>
  );
}
