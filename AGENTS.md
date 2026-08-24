# Grit — Agent Guidance

## Framework

The product is a Next.js PWA under `web/`. Check `web/package.json` for the current major version before relying on App Router or framework behavior — conventions change between majors. Shared training logic in `src/` is framework-agnostic pure TypeScript with no Next.js or DOM dependency.

---

## Training Doctrine

### Tag system

Every parameter in the rules engine that encodes a training science decision **must** carry an inline doctrine tag. Tags live as `// TAG-NNN` inline comments or `// ─── TAG-NNN: … ───` block headers.

| Prefix | Domain | Files |
|--------|--------|-------|
| `HV`   | Hypertrophy / general rep ranges, slot rules | `slotRoleConfig.ts`, `slotBuilder.ts`, `validation.ts`, `../utils/volumeLandmarks.ts`, `volumeRamp.ts`, `progressionEngine.ts`, `../data/exerciseProgressionProfiles.ts` |
| `ST`   | Strength (Prilepin, NSCA) | `slotRoleConfig.ts`, `progressionEngine.ts`, `volumeBudget.ts`, `../data/exerciseProgressionProfiles.ts` |
| `PB`   | Powerbuilding (PHAT / Kizen) | `slotRoleConfig.ts`, `progressionEngine.ts`, `volumeBudget.ts` |
| `RC`   | Session caps and structural constraints | `sessionTrimmer.ts`, `validation.ts`, `assignment.ts`, `../api/progression.ts`, `progressionEngine.ts` |
| `VA`   | Volume adjustments (beginner scaling, deload, per-muscle MEV/MAV/MRV targeting) | `volumeBudget.ts`, `progressionEngine.ts`, `../utils/volumeLandmarks.ts`, `../data/roleOverlap.ts` |

Rules for adding a tag:
1. **Every new numeric training parameter needs a tag.** If you write `sets: 5` or `{ emphasize: 18 }`, it needs a tag that explains why.
2. **Tags must cite a source.** Acceptable sources: named research (Prilepin's Chart, ACSM Guidelines), named program (Kizen 16-Week, PHAT), or named coach/researcher (Dr. Mike Israetel, Greg Nuckols). Do not add unsourced values.
3. **Tags within a prefix must not contradict each other.** Before adding `ST-007`, read all existing `ST-XXX` tags and confirm there is no conflict.
4. **Never duplicate doctrine into a separate markdown file.** The source files are the single source of truth.

### Focus coverage

| Focus | Primary source | Status |
|-------|----------------|--------|
| `hypertrophy` | Dr. Mike Israetel / RP Hypertrophy | Covered — per-muscle landmarks drive set targets; `mev`→MEV, `maintain`→MV, and `grow`/`emphasize`→MAV by default. MRV is a recovery boundary, not an automatic destination. |
| `strength` | Prilepin's Chart, NSCA | Covered (ST-001 – ST-006) |
| `powerbuilding` | Kizen 16-Week, PHAT (Layne Norton) | Covered (PB-001 – PB-005) |
| `general` | ACSM Guidelines / Greg Nuckols "General Gainz" | Partially — flag gaps before adding rules |
| `maintenance` | Conservative MEV retention | Covered |
| `cut` | RC-005 70%-of-maintenance heuristic | Covered |

---

## Data Sources

### Supabase is always the source of truth for exercise data

`src/data/exerciseDatabase.ts` is a **test/rules-engine fixture only** — a small,
hand-curated dataset that lets the pure rules-engine functions (`src/rules/*`)
be unit-tested with plain synchronous data, no Supabase round-trip. It is
**not** a second real exercise catalog, and it must never drift ahead of
Supabase:

- `equipment` on `ProgramExercise` rows comes from Supabase. Never fall back to the local exercise database for equipment.
- `ExerciseSlot.equipment` is populated at picker selection time (from `ExerciseRow.equipment`), not at save time.
- **Whenever an exercise is added to `exerciseDatabase.ts` (or referenced by a program template), it must also exist in the Supabase `exercises` table under the exact same `name` string, added via a migration.** Supabase is what the live `ExercisePicker`, workout logging, and PR/history tracking actually use — a name that only exists locally is invisible to all of that and silently breaks any exact-string matching (history-by-name, exercise_tags lookups, etc).
- Past drift already happened here: several taxonomy migrations (`20260612000001`, `20260707000003`) were written assuming curated names like `Pull-Up`, `Romanian Deadlift`, `Front Squat`, `Barbell Row` already existed in Supabase — they didn't (Supabase only had qualified variants like `Pull-Up (Wide Grip)`), so those `UPDATE ... WHERE name IN (...)` statements silently matched zero rows. `20260722000002_sync_local_exercise_database.sql` backfilled the gap. Don't reintroduce it: when in doubt, grep the migrations for the exact name before assuming it's there.

### Legitimate uses of `getExerciseByName()` (local exercise DB)

The local `exerciseDatabase.ts` is used only for the rules engine's own structural metadata:
- `exerciseTags` — used by `validateDayExercises` (HV-013, deadlift + barbell-row check)
- `movementPattern` — used by Back slot validation
- `exerciseType` — used by Triceps slot validation

These are intentional. Do not remove these uses. Do not use `getExerciseByName()` to supply `equipment`.

---

## Rules Engine

Files in `src/rules/` are pure functions with no side effects. They take plain data and return plain data. Keep them that way.

### File responsibilities

| File | Responsibility |
|------|----------------|
| `splitDeriver.ts` | Derive session split type from priorities |
| `slotBuilder.ts` | Build `ExerciseSlot[]` for a given day |
| `sessionTrimmer.ts` | Enforce RC-series session caps |
| `volumeBudget.ts` | Calculate weekly set targets per muscle |
| `progressionEngine.ts` | Recommend load/rep progression week-to-week |
| `validation.ts` | HV-series structural validation |
| `programBuilder.ts` | Orchestrates all of the above |
| `assignment.ts` | Muscle-to-session assignment |
| `../data/slotRoleConfig.ts` | Slot rep/set tables per focus × priority |

### Extending the rules engine

1. Identify which file owns the rule.
2. Add or update the relevant doctrine tag(s) with source citation.
3. Write a test that *fails without the rule* and *passes with it* (see Testing below).
4. Run `npm run test:rules` and confirm all existing tests still pass before committing.

---

## Testing

### Where tests live

```
__tests__/
  rules/
    progressionRules.test.ts       — progressionEngine + validation
    splitDeriver.test.ts           — deriveSplit
    programBuilder.example.test.ts — full-program integration smoke test
    (assignment, exerciseSelector, movementClassMap, sessionTrimmer, slotBuilder,
     volumeAdaptiveTargeting, volumeBudget, volumeRamp, progressionEngine.hv021,
     quickWorkoutBuilder — one file per rule area)
src/
  data/__tests__/
    programTemplates.test.ts
  utils/__tests__/
    oneRepMax.test.ts
    volumeLandmarks.test.ts
web/
  **/*.vitest.ts   — colocated next to the file under test (app/, components/, lib/)
  tests/e2e/       — Playwright browser smoke tests
```

### Rules engine test standards

**Test outcomes, not internals.** Assert on the output of `buildProgram`, `buildDaySlots`, `deriveSplit`, `recommendProgression`. Do not spy on internal functions or assert call counts.

**No mocks for pure functions.** The rules engine is pure — test it directly with data, no I/O and no mocks needed. In `web/`, only mock Supabase calls and browser/DOM APIs that aren't available in Node.

**Every doctrine rule needs a test that can fail.** If you add ST-007 (a new strength parameter), write a test where violating that rule produces a wrong output, and confirm the correct rule fixes it.

**Snapshot pattern for integration tests.** `programBuilder.example.test.ts` builds a complete program and asserts structural invariants (slot counts, set caps, validation passing, split ratios). When adding a new focus, add an example test config for that focus.

**Behavioral invariants to protect** (these must never regress):
- No session exceeds `SESSION_MAX_EXERCISES` slots or `SESSION_MAX_SETS` total sets
- `validation.valid` is `true` for any well-formed config
- Primary slots sort before Accessory slots for the same muscle
- Forearm slots appear after the last Back/Biceps/Traps slot (HV-008)
- Emphasized muscles always receive direct sets
- Deload weeks always have fewer sets than the final training week
- `strength` focus slots use repsMax ≤ 5 for Primary (Prilepin zone)
- `powerbuilding` Primary sets land in 3–7 rep range

### Running tests

```bash
npm run test:rules   # rules engine + src/data + src/utils (vitest)
npm test             # web/ app unit tests (vitest)
```

Always run `npm run test:rules` before committing any change to `src/rules/` or `src/data/slotRoleConfig.ts`.

---

## Definition of Done

A task is not complete until all of the following are true. Do not report a task as finished until every item is checked.

### 1. Tests pass

Run the full suite and confirm zero failures:

```bash
npm test
npm run test:rules
```

If touching `src/rules/` or `src/data/slotRoleConfig.ts`, re-run `npm run test:rules` and confirm it still passes.

If a test fails because of a legitimate intentional change, update the test and document why in a comment. Never skip or delete a test to make the suite green.

### 2. New behavior has test coverage

Every change that alters observable behavior needs at least one test that would fail if the change were reverted. This includes:

- New API functions or query logic → test in a colocated `*.vitest.ts` next to the file (e.g. `web/lib/workout/payload.vitest.ts`)
- New rules engine parameters or doctrine → test in `__tests__/rules/`
- New auth guards or error paths → test the unauthenticated/error case explicitly
- New component or client state logic → test in a colocated `*.vitest.ts` next to the file

If a change cannot be unit tested (UI-only, animation, browser-only behaviour), document why in the PR description. Do not silently skip coverage.

### 3. Dialog and modal safety

Before shipping any UI change that involves modals, dialogs, or transitions, verify:

- **Modals use `useDialogFocusTrap`** (`web/lib/hooks/use-dialog-focus-trap.ts`) so focus is trapped inside the dialog, Tab/Shift+Tab wraps at the boundaries, and focus is restored to the trigger element on close.
- **No two modal backdrops stack.** If closing one modal opens another, let the first fully unmount before rendering the second rather than layering `.modal-backdrop` elements.
- **CSS transitions respect `prefers-reduced-motion`**, per the reduced-motion requirement in §6 below.

### 4. Supabase query safety

Before shipping any Supabase query change, verify:

- **`.single()` is never used for "0 or 1 row" queries.** Use `.maybeSingle()`. `.single()` returns 406 when zero rows exist.
- **Auth guard is present on every read function.** Call `getUserId()` at the top of any function that queries user data; return early if null. Do not rely on RLS alone — unauthenticated requests cause 406 logs and empty results that look like real data.
- **No `?? 'Barbell'` or similar equipment fallbacks.** Equipment must come from `ExerciseRow.equipment` (Supabase) at selection time, stored on `ExerciseSlot.equipment`, and read from there at save time.

### 5. Error handling is visible

Silent failures are bugs. Every async operation that writes user data must either:

- Show a user-visible error (Alert, inline message) on failure, **and**
- Roll back any partial state (e.g., delete a partially-created program if exercise inserts fail)

Never leave a `catch` block that only resets a loading spinner without informing the user.

### 6. PWA visual consistency

The Next.js PWA uses a restrained Apple/Google-inspired visual language. Before adding or changing UI under `web/`:

- Reuse an existing component or established utility class before creating a one-off control style.
- Text actions in page headers and compact toolbars use pill geometry (`border-radius: 999px`), a minimum 40px height, centered content, and the existing primary/secondary/quiet color treatment. Do not ship a square or card-shaped header action beside pill actions.
- Standard form and full-width account actions use the shared button geometry already defined in `globals.css`; controls within the same visual group must have matching height, radius, padding, typography, and border treatment.
- Cards use the existing `.surface` geometry. Pills are reserved for actions, statuses, switches, and compact navigation; do not mix card and pill silhouettes for equivalent controls.
- Every interactive control needs hover, active, focus-visible, disabled, and reduced-motion behavior. Preserve a minimum 44px touch target unless the control is a compact desktop-only supplement with an accessible larger target.
- Verify every changed screen in both light and dark themes. Text and icons must use theme tokens rather than hard-coded white or black, except for intentional filled destructive/accent actions.
- Verify responsive containment at narrow mobile widths: no menu, select, modal, button row, or bottom navigation may overflow the viewport.
- When matching an existing UI element, inspect its complete computed style contract—shape, height, padding, border, color, hover, and focus—not only its class name.

For UI-only changes that are not practical to unit test, explicitly record the light/dark, keyboard-focus, and narrow-width checks performed.

---

## Agent Behavior

### Before touching `src/rules/`

1. Read the relevant rule file(s) to identify which doctrine tags are in scope.
2. Confirm no existing tag contradicts the intended change.
3. If adding a numeric parameter, identify the source citation before writing code.

### Before reporting any task complete

1. Run `npm test` and `npm run test:rules` and confirm zero failures.
2. Confirm new behavior has test coverage (see Definition of Done §2).
3. If the change touches UI with modals or animations, confirm modal sequencing is safe (§3).
4. If the change touches Supabase, confirm `.maybeSingle()` and auth guards are in place (§4).
5. Confirm all error paths are visible to the user (§5).

### Sub-agent usage

- **Broad rules-engine exploration** (which files reference a given tag, what doctrine covers a muscle group): spawn an `Explore` agent.
- **Pre-implementation planning** for anything touching 4+ rules files: spawn a `Plan` agent first.
- **Test runs**: can run in background; report only failures and uncovered behavioral invariants.
- **Single-file edits or targeted lookups**: do inline, not via sub-agent.
