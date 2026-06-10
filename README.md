# G.R.I.T.

**Guided Results & Intelligent Training**

A mobile fitness application built for lifters who want structured, progressive training without unnecessary complexity. G.R.I.T. combines evidence-based hypertrophy principles with a rules-based program generation engine to deliver personalized training plans, real-time workout logging, and long-term progress tracking — all in a clean, native mobile experience.

---

## What's Built

G.R.I.T. is a fully functional React Native application targeting iOS and Android. The following features are production-ready:

### Workout Logging
- Start a Quick Workout (unplanned session) or launch directly from a program day
- Log sets with weight, reps, and RIR (Reps in Reserve)
- Swipe right to complete a set, swipe left to remove it
- Auto-fill target reps when completing non-RIR sets
- Haptic feedback on set completion and deletion
- Progress bar tracking completed vs. total sets for the session
- Minimum exercise enforcement with in-session add prompt
- Skip Workout option with confirmation

### Program Builder
- Multi-step wizard: name → duration → days/week → training days → experience level → focus → muscle priorities → per-day exercise selection
- Configurable program length (2–8 weeks), frequency (2–6 days/week), and training day selection
- Five focus modes: Hypertrophy, Strength, Powerbuilding, General Fitness, Maintenance
- Per-muscle priority settings: Emphasize / Grow / Maintain
- Auto-generates all program days and populates week-over-week structure on save
- After creation, immediately loads the first workout

### Rules-Based Training Engine

The program builder is backed by a deterministic rules engine that mirrors established hypertrophy methodology:

| Module | Responsibility |
|---|---|
| `splitDeriver` | Selects optimal training split (PPL, Upper/Lower, Full Body, etc.) based on frequency and priorities |
| `volumeBudget` | Calculates per-muscle weekly set targets by focus and priority using MEV/MAV doctrine |
| `assignment` | Distributes muscles across training days according to split and recovery constraints |
| `slotBuilder` | Builds per-session exercise slots (Primary / Secondary / Accessory) with set/rep/RIR prescriptions |
| `exerciseRecommender` | Ranks exercises by SFR (Stimulus-to-Fatigue Ratio) tier and equipment preference |
| `progressionEngine` | Calculates week-over-week load and intensity progressions with deload week support |
| `validation` | Enforces program structural integrity before saving |

Weekly volume scales from 70% in Week 1 to 100% at peak, with RIR decreasing by one each week for actively trained muscles. Deload weeks automatically apply 50% volume at RIR 4.

### Exercise Library
- 200+ exercises seeded in Supabase, covering all major muscle groups
- Per-exercise metadata: muscle group, equipment, SFR tier, movement pattern, fatigue cost
- Equipment-preference filtering (Barbell, Dumbbell, Cable, Machine, Bodyweight, etc.)
- Inline search within the exercise picker
- Create custom exercises saved directly to the database
- Star indicator for top-recommended exercises per slot

### Personal Records
- Automatically tracked per exercise across all workout sessions
- Dedicated personal records screen with history

### Workout History
- Full log of completed sessions
- Per-session exercise and set detail

### Progress Tracking
- Growth-over-time charts per exercise
- Personal record timelines

### Profile & Settings
- Equipment preference selection
- Experience level (Beginner / Intermediate / Advanced)
- Light and dark theme support

### Programs List
- Three-state status badge per program: **Active** (currently selected), **Paused** (started but incomplete), **Complete** (all days finished or skipped)
- Day completion progress displayed inline (`X/Y days done`)
- Resume, set as current, or delete from the context menu
- Creating a new program automatically deactivates all others

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) 56 (React Native 0.85, React 19) |
| Language | TypeScript |
| Navigation | [Expo Router](https://expo.github.io/router) v56 (file-based, typed routes) |
| State Management | [Zustand](https://zustand-demo.pmnd.rs) v5 with persist middleware |
| Backend | [Supabase](https://supabase.com) (PostgreSQL, Auth, Row Level Security) |
| Animations | React Native Reanimated v4 |
| Gestures | React Native Gesture Handler v2 |
| Data Fetching | TanStack Query v5 |
| Haptics | Expo Haptics |

---

## Project Structure

```
app/
  _layout.tsx                    # Root Stack + PersistentTabBar overlay
  (tabs)/
    _layout.tsx                  # Tab screen registration (tab bar is custom overlay)
    index.tsx                    # Home / active workout redirect
    programs.tsx                 # Programs list
    history.tsx                  # Workout history
    log.tsx                      # Session log
    more.tsx                     # Profile & settings
  workout.tsx                    # Active workout screen (full-screen Stack route)
  workout/[id].tsx               # Completed workout detail
  programs/
    create.tsx                   # Multi-step program creation wizard
    [id].tsx                     # Program detail (week × day grid)
    [id]/day/[dayId].tsx         # Day exercise list + start workout
  exercise/[id].tsx              # Exercise detail
  personal-records.tsx           # Personal records screen
  growth-over-time.tsx           # Progress chart screen
  profile.tsx                    # Profile editor
  login.tsx                      # Authentication

src/
  api/                           # Supabase query functions
    exercises.ts
    programs.ts
    workouts.ts
    history.ts
    personalRecords.ts
    progression.ts
  data/                          # Static reference data (scoring engine)
    exerciseDatabase.ts          # Local exercise metadata (SFR tiers, movement patterns)
    sessionTemplates.ts          # Session type → slot shape definitions
    slotRoleConfig.ts            # Set/rep/RIR configs per role × priority
    slotTemplates.ts             # Muscle slot templates per session type
    roleOverlap.ts               # Synergistic muscle overlap table
  rules/                         # Program generation engine
    programBuilder.ts            # Orchestrates all rule modules
    splitDeriver.ts
    volumeBudget.ts
    assignment.ts
    slotBuilder.ts
    exerciseRecommender.ts
    progressionEngine.ts
    sessionTrimmer.ts
    validation.ts
  store/
    useWorkoutStore.ts           # Active workout state (Zustand)
    useProfileStore.ts           # User preferences and profile (Zustand + persist)
    useAuthStore.ts              # Authentication state
  types/
    program.ts                   # Core domain types
    workout.ts                   # Workout session types
  components/
    navigation/PersistentTabBar.tsx
    workout/ExerciseCard.tsx
    workout/SetRow.tsx
    workout/SlotExercisePicker.tsx
  utils/
    useColors.ts                 # Theme-aware color hook
    constants.ts                 # MuscleGroupColors, layout constants

supabase/
  migrations/                    # Ordered SQL migration files
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `exercises` | Master exercise library (200+ rows, open read via RLS) |
| `workouts` | Individual workout sessions |
| `workout_sets` | Per-set log rows (exercise, weight, reps, RIR, muscle group) |
| `workout_feedback` | Post-session perceived effort and soreness |
| `personal_records` | Auto-updated best lifts per user per exercise |
| `programs` | Training program definitions (name, weeks, days/week, focus, muscle priorities) |
| `program_days` | All week × day rows for a program (completed, skipped flags) |
| `program_exercises` | Exercise prescriptions for each program day (sets, reps, RIR, weight targets) |
| `program_day_targets` | AI/engine-generated weekly targets per day |

All user-owned tables are protected by Row Level Security policies. The `exercises` table is open for reads to support unauthenticated exercise browsing.

---

## Local Development

### Prerequisites

- Node.js 20+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for running migrations locally)
- iOS Simulator or Android Emulator (or [Expo Go](https://expo.dev/go))

### Setup

```bash
# Install dependencies
npm install

# Copy environment template and fill in your Supabase credentials
cp .env.example .env
# EXPO_PUBLIC_SUPABASE_URL=...
# EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# Apply database migrations
supabase db push

# Start the dev server
npx expo start
```

### Running Tests

```bash
npm test
```

Unit tests cover the progression engine, exercise recommender, and program builder rules.

---

## Design Principles

**Simplicity over features.** A user should be able to start a workout in under three taps.

**Evidence-based defaults.** Volume targets, RIR progressions, and split recommendations follow established hypertrophy research (MEV/MAV doctrine, SFR ranking, progressive overload).

**One source of truth.** The exercise library lives in Supabase. Local data (`exerciseDatabase.ts`) exists only to support the scoring engine with metadata not suited for a relational schema.

**No magic.** The program generation engine is fully deterministic and auditable. Every slot, set count, and RIR value is traceable to a specific rule.

---

## Roadmap

- [ ] AI-assisted coaching notes and rationale per workout
- [ ] Apple Health / Google Fit integration
- [ ] Wearable heart rate and recovery data
- [ ] Advanced analytics dashboard (volume heatmaps, strength curves)
- [ ] Social accountability features
- [ ] Nutrition and body composition tracking

---

## License

Private repository. All rights reserved.
