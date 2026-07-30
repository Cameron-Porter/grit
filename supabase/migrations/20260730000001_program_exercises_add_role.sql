-- Persist each exercise's slot role (Primary/Secondary/Accessory) so
-- progression computation can size load increments correctly per role
-- (see src/rules/progressionEngine.ts getLoadIncrement) instead of always
-- defaulting to Primary. Nullable: existing rows have no known role and
-- keep defaulting to Primary via the same fallback as before this fix —
-- only newly-created program_exercises rows populate this going forward.
alter table program_exercises add column if not exists role text;
