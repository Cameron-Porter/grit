import type { createClient } from '@/lib/supabase/server';

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type CatalogRow = {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  movement_category: string | null;
  rep_range_min: number | null;
  rep_range_max: number | null;
};

export const CATALOG_COLUMNS = 'id,name,muscle_group,equipment,movement_category,rep_range_min,rep_range_max';

/**
 * The exercise catalog is ~400 rows of global reference data, and almost every
 * page selects the whole table before it can render - measured at 50-77ms of the
 * server time on each one.
 *
 * Caching it process-wide is safe *because of the specific RLS policy in force*:
 * `authenticated_read_exercises` is `auth.role() = 'authenticated'` with no
 * per-user predicate (see 20260609000006_exercises_open_read.sql), so every
 * signed-in user receives byte-identical rows and there is nothing user-specific
 * to leak between them. If that policy ever regains a per-user clause - the
 * original `users_read_exercises` had one for custom exercises - this cache must
 * become per-user or be deleted. The guard test asserts that policy still holds.
 *
 * Deliberately a small in-process memo rather than unstable_cache: the fetch has
 * to run through the caller's cookie-bound client to satisfy RLS at all, and
 * unstable_cache forbids reading cookies inside its callback.
 */
const TTL_MS = 5 * 60 * 1000;

let cache: { rows: CatalogRow[]; expiresAt: number } | null = null;

/** Custom-exercise writes change the shared catalog, so they must drop the memo. */
export const invalidateExerciseCatalog = (): void => { cache = null; };

export const isCatalogFresh = (entry: { expiresAt: number } | null, now: number): boolean =>
  entry !== null && entry.expiresAt > now;

export async function loadExerciseCatalog(supabase: ServerClient): Promise<CatalogRow[]> {
  if (isCatalogFresh(cache, Date.now())) return cache!.rows;
  const { data, error } = await supabase.from('exercises').select(CATALOG_COLUMNS).order('name');
  if (error) throw new Error(`Could not load the exercise catalog: ${error.message}`);
  cache = { rows: (data ?? []) as CatalogRow[], expiresAt: Date.now() + TTL_MS };
  return cache.rows;
}
