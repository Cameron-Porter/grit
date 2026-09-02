/** Shared cache tag/TTL for the Today page's cached read, so every write path that can
 * change that data (finishing/skipping a workout, switching the active program)
 * invalidates the exact same tag the read is cached under. */
export const dashboardCacheTag = (userId: string) => `dashboard-${userId}`;
export const DASHBOARD_CACHE_SECONDS = 30;
